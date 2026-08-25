/**
 * services/requests.js — Business logic layer.
 *
 * This is where ALL five business rules are enforced.
 * Controllers call services; services call queries.
 * Services never touch req/res — they work with plain data and throw AppError.
 *
 * Business Rules:
 *  1. Status flow      — only legal transitions allowed
 *  2. Approval needs resolution + refund rules
 *  3. One live request per (order_id, item_name)
 *  4. Locked once decided (Approved/Rejected/Completed)
 *  5. Removal is soft-delete, only Open/Rejected allowed
 */

const queries = require('../queries/requests');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────────────────────────
// Rule 1: Status transition map
// Only these transitions are legal. Any other is rejected.
// ─────────────────────────────────────────────────────────────
const LEGAL_TRANSITIONS = {
  'Open':      ['In Review'],
  'In Review': ['Approved', 'Rejected'],
  'Approved':  ['Completed'],
  'Rejected':  [],   // final state
  'Completed': [],   // final state
};

// Statuses that lock a request from detail edits (Rule 4)
const DECIDED_STATUSES = ['Approved', 'Rejected', 'Completed'];

// ─────────────────────────────────────────────────────────────
// Internal rule validators
// ─────────────────────────────────────────────────────────────

function validateStatusTransition(currentStatus, nextStatus) {
  const allowed = LEGAL_TRANSITIONS[currentStatus];
  if (!allowed.includes(nextStatus)) {
    const allowedStr =
      allowed.length > 0 ? allowed.map((s) => `"${s}"`).join(', ') : 'none — this is a final state';
    throw new AppError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from "${currentStatus}" to "${nextStatus}". ` +
        `Legal transitions from "${currentStatus}": ${allowedStr}.`
    );
  }
}

function validateApprovalResolution(resolution, refundAmount) {
  // Sub-rule 2a: resolution is required
  if (!resolution) {
    throw new AppError(
      422,
      'RESOLUTION_REQUIRED',
      'A resolution (Refund, Replacement, or Store Credit) is required when approving a request.'
    );
  }

  if (resolution === 'Refund') {
    // Sub-rule 2b: Refund must have a positive amount
    if (!refundAmount || refundAmount <= 0) {
      throw new AppError(
        422,
        'REFUND_AMOUNT_REQUIRED',
        'A refund amount greater than zero is required when the resolution is Refund.'
      );
    }
  } else {
    // Sub-rule 2c: Replacement/Store Credit must NOT have any refund amount recorded—
    // including 0, which is meaningless and inconsistent.
    if (refundAmount != null) {
      throw new AppError(
        422,
        'REFUND_AMOUNT_NOT_ALLOWED',
        `Refund amount must not be provided when the resolution is "${resolution}".`
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Public service functions
// ─────────────────────────────────────────────────────────────

async function createRequest(data) {
  // Rule 3: Prevent duplicate active requests for the same (order_id, item_name)
  const duplicate = await queries.findActiveRequestForItem(data.order_id, data.item_name);
  if (duplicate) {
    throw new AppError(
      409,
      'DUPLICATE_ACTIVE_REQUEST',
      `An active request already exists for item "${data.item_name}" on order "${data.order_id}". ` +
        `A new request can only be raised once the existing one is Rejected or Completed.`
    );
  }

  return queries.insertRequest(data);
}

async function getRequests(filters) {
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const { rows, total } = await queries.findRequests(filters);
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getRequestById(id) {
  const request = await queries.findRequestById(id);
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found.');
  }

  const notes = await queries.findNotesByRequestId(id);
  return { ...request, notes };
}

async function updateRequestDetails(id, fields) {
  const request = await queries.findRequestById(id);
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found.');
  }

  // Rule 4: Locked once decided
  if (DECIDED_STATUSES.includes(request.status)) {
    throw new AppError(
      422,
      'REQUEST_LOCKED',
      `Request details cannot be edited once it has reached "${request.status}" status. Notes can still be added.`
    );
  }

  // Rule 3: If order_id or item_name is changing, re-check for duplicates
  // (exclude the current request from the duplicate check)
  const newOrderId = fields.order_id ?? request.order_id;
  const newItemName = fields.item_name ?? request.item_name;

  if (newOrderId !== request.order_id || newItemName !== request.item_name) {
    const duplicate = await queries.findActiveRequestForItem(newOrderId, newItemName, id);
    if (duplicate) {
      throw new AppError(
        409,
        'DUPLICATE_ACTIVE_REQUEST',
        `An active request already exists for item "${newItemName}" on order "${newOrderId}".`
      );
    }
  }

  const updated = await queries.updateRequest(id, fields);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found.');
  }
  return updated;
}

async function transitionStatus(id, { status, resolution, refund_amount }) {
  const request = await queries.findRequestById(id);
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found.');
  }

  // Rule 1: Validate the transition is legal
  validateStatusTransition(request.status, status);

  // Rule 2: Approvals need a valid resolution + refund rules
  let finalResolution = null;
  let finalRefundAmount = null;

  if (status === 'Approved') {
    validateApprovalResolution(resolution, refund_amount);
    finalResolution = resolution;
    // Only store refund_amount when resolution = Refund
    finalRefundAmount = resolution === 'Refund' ? refund_amount : null;
  }

  const updated = await queries.updateStatus(id, status, finalResolution, finalRefundAmount);
  return updated;
}

async function addNote(requestId, content) {
  // Notes can be added to any non-removed request regardless of status (Rule 4 exemption)
  const request = await queries.findRequestById(requestId);
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found.');
  }

  return queries.insertNote(requestId, content);
}

async function removeRequest(id) {
  const request = await queries.findRequestById(id);
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found.');
  }

  // Rule 5: Only Open or Rejected requests can be removed
  if (!['Open', 'Rejected'].includes(request.status)) {
    throw new AppError(
      422,
      'REMOVAL_NOT_ALLOWED',
      `Only requests with status "Open" or "Rejected" can be removed. ` +
        `This request is "${request.status}".`
    );
  }

  await queries.softDeleteRequest(id);
  return { data: { message: `Request ${request.reference} has been removed.` } };
}

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestDetails,
  transitionStatus,
  addNote,
  removeRequest,
};
