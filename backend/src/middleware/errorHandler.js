export class ApiError extends Error {
  constructor(statusCode, code, message, fields = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export const errorHandler = (err, req, res, next) => {
  const generatedAt = new Date().toISOString();

  // If instance of custom ApiError
  if (err instanceof ApiError || err.statusCode) {
    return res.status(err.statusCode || 500).json({
      error: {
        code: err.code || 'ERROR',
        message: err.message,
        ...(Object.keys(err.fields || {}).length > 0 ? { fields: err.fields } : {})
      },
      generatedAt
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource could not be found.'
      },
      generatedAt
    });
  }

  // Handle Zod or JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid JSON request syntax.'
      },
      generatedAt
    });
  }

  // Unhandled error
  console.error('[Server Error]', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred.'
    },
    generatedAt
  });
};
