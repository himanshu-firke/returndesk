const { z } = require('zod');

// These must match the PostgreSQL ENUM values exactly.
const STATUSES = ['Open', 'In Review', 'Approved', 'Rejected', 'Completed'];
const REASONS = ['Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind'];
const RESOLUTIONS = ['Refund', 'Replacement', 'Store Credit'];
const SORT_FIELDS = ['created_at', 'updated_at', 'status', 'reason'];

// POST /api/requests
const createRequestSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(255),
  customer_email: z.string().email('A valid email address is required').max(255),
  order_id: z.string().min(1, 'Order ID is required').max(100),
  item_name: z.string().min(1, 'Item name is required').max(255),
  item_sku: z.string().max(100).optional(),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  reason: z.enum(REASONS, {
    errorMap: () => ({ message: `Reason must be one of: ${REASONS.join(', ')}` }),
  }),
});

// PATCH /api/requests/:id  (edit details, only when not decided)
const updateRequestSchema = z
  .object({
    customer_name: z.string().min(1).max(255).optional(),
    customer_email: z.string().email().max(255).optional(),
    order_id: z.string().min(1).max(100).optional(),
    item_name: z.string().min(1).max(255).optional(),
    // item_sku can be explicitly set to null to clear it
    item_sku: z.string().max(100).nullable().optional(),
    quantity: z.number().int().min(1).optional(),
    reason: z.enum(REASONS).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

// PATCH /api/requests/:id/status
const statusTransitionSchema = z.object({
  status: z.enum(STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${STATUSES.join(', ')}` }),
  }),
  // resolution and refund_amount are only relevant when transitioning to Approved.
  // Service layer enforces the business rules around these.
  resolution: z.enum(RESOLUTIONS).nullable().optional(),
  refund_amount: z.number().positive('Refund amount must be greater than zero').nullable().optional(),
});

// POST /api/requests/:id/notes
const addNoteSchema = z.object({
  content: z
    .string()
    .min(1, 'Note content cannot be empty.')
    .max(5000, 'Note content cannot exceed 5000 characters.'),
});

// GET /api/requests (query params — all strings coming from URL, so use z.coerce for numbers)
// Note: use .default() without .optional() so Zod always fills in defaults for missing params.
const listQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  reason: z.enum(REASONS).optional(),
  sortBy: z.enum(SORT_FIELDS, {
    errorMap: () => ({ message: `sortBy must be one of: ${SORT_FIELDS.join(', ')}` }),
  }).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  // z.coerce converts the string query param to a number before validation
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100').default(20),
});

module.exports = {
  createRequestSchema,
  updateRequestSchema,
  statusTransitionSchema,
  addNoteSchema,
  listQuerySchema,
  STATUSES,
  REASONS,
  RESOLUTIONS,
};
