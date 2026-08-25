const express = require('express');
const router = express.Router();

const controllers = require('../controllers/requests');
const validate = require('../middleware/validate');
const {
  createRequestSchema,
  updateRequestSchema,
  statusTransitionSchema,
  addNoteSchema,
  listQuerySchema,
} = require('../validators/requests');

// GET  /api/requests          — list with search/filter/sort/pagination
router.get('/', validate({ query: listQuerySchema }), controllers.listRequests);

// POST /api/requests          — create a new request
router.post('/', validate({ body: createRequestSchema }), controllers.createRequest);

// GET  /api/requests/:id      — get single request with notes
router.get('/:id', controllers.getRequest);

// PATCH /api/requests/:id     — update editable details (when not decided)
router.patch('/:id', validate({ body: updateRequestSchema }), controllers.updateRequest);

// PATCH /api/requests/:id/status — transition status (business rules enforced in service)
router.patch('/:id/status', validate({ body: statusTransitionSchema }), controllers.transitionStatus);

// POST  /api/requests/:id/notes  — add a note (any status, any time)
router.post('/:id/notes', validate({ body: addNoteSchema }), controllers.addNote);

// DELETE /api/requests/:id    — soft-delete (only Open/Rejected allowed)
router.delete('/:id', controllers.removeRequest);

module.exports = router;
