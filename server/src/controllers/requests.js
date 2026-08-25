/**
 * controllers/requests.js — HTTP layer.
 *
 * Controllers are intentionally thin:
 *  1. Extract validated data from req
 *  2. Call the service function
 *  3. Send the response
 *
 * All business logic lives in services/requests.js.
 * All error handling flows through next(err) → errorHandler middleware.
 */

const service = require('../services/requests');

async function listRequests(req, res, next) {
  try {
    const result = await service.getRequests(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createRequest(req, res, next) {
  try {
    const request = await service.createRequest(req.body);
    res.status(201).json({ data: request });
  } catch (err) {
    next(err);
  }
}

async function getRequest(req, res, next) {
  try {
    const request = await service.getRequestById(req.params.id);
    res.json({ data: request });
  } catch (err) {
    next(err);
  }
}

async function updateRequest(req, res, next) {
  try {
    const request = await service.updateRequestDetails(req.params.id, req.body);
    res.json({ data: request });
  } catch (err) {
    next(err);
  }
}

async function transitionStatus(req, res, next) {
  try {
    const request = await service.transitionStatus(req.params.id, req.body);
    res.json({ data: request });
  } catch (err) {
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const note = await service.addNote(req.params.id, req.body.content);
    res.status(201).json({ data: note });
  } catch (err) {
    next(err);
  }
}

async function removeRequest(req, res, next) {
  try {
    const result = await service.removeRequest(req.params.id);
    res.json(result); // service returns { data: { message: "..." } }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRequests,
  createRequest,
  getRequest,
  updateRequest,
  transitionStatus,
  addNote,
  removeRequest,
};
