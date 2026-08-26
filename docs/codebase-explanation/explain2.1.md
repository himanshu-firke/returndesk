# EXPLAIN 2.1 — Users & Permissions in Code

This document explains how user roles, actions, and permissions are represented in the codebase.

---

## 1. Single-Desk Operational Mode

Per the take-home PRD specifications, ReturnDesk operates as an internal support desk application without individual customer/agent login credentials (no JWT/sessions or passwords).

Instead, the application enforces **contextual, state-based permissions** directly on the entity's status.

---

## 2. Where Permissions are Enforced

Permissions are not controlled by user roles, but by **Request State Guards** in `server/src/services/requests.js`:

### 1. Edit Permission Guard
```javascript
// server/src/services/requests.js
const DECIDED_STATUSES = ['Approved', 'Rejected', 'Completed'];

async function updateRequestDetails(id, fields) {
  const request = await queries.findRequestById(id);
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Request not found.');

  // Guard: Detail edits are forbidden once decided
  if (DECIDED_STATUSES.includes(request.status)) {
    throw new AppError(422, 'REQUEST_LOCKED', `Cannot edit details of a "${request.status}" request.`);
  }

  return queries.updateRequest(id, fields);
}
```

### 2. Removal Permission Guard
```javascript
// server/src/services/requests.js
async function softDeleteRequest(id) {
  const request = await queries.findRequestById(id);
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Request not found.');

  // Guard: Only Open or Rejected requests can be taken off the desk
  if (!['Open', 'Rejected'].includes(request.status)) {
    throw new AppError(422, 'REMOVAL_NOT_ALLOWED', `Only "Open" or "Rejected" requests can be removed.`);
  }

  return queries.softDeleteRequest(id);
}
```

### 3. Append Notes Permission (Always Open)
```javascript
// server/src/services/requests.js
async function addNote(requestId, content) {
  const request = await queries.findRequestById(requestId);
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Request not found.');

  // Note: No status guard exists here by design — notes are allowed at any status!
  return queries.insertNote(requestId, content);
}
```

---

## 3. Frontend UI Reflection

In `client/app/requests/[id]/page.js`:
- Form inputs have `disabled={isDecided}` applied automatically when `['Approved', 'Rejected', 'Completed'].includes(request.status)`.
- The "Save Changes" button is hidden when `isDecided` is true.
- The "Remove" button is only rendered if `['Open', 'Rejected'].includes(request.status)`.
