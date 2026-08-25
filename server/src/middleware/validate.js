/**
 * Zod validation middleware factory.
 *
 * Usage:
 *   router.post('/', validate({ body: createRequestSchema }), controller)
 *   router.get('/',  validate({ query: listQuerySchema }),    controller)
 *
 * On success: parsed/coerced values are written back to req.body / req.query / req.params
 * On failure: ZodError is forwarded to next() and caught by the global error handler → 400
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      next(err); // ZodError → errorHandler → 400
    }
  };
}

module.exports = validate;
