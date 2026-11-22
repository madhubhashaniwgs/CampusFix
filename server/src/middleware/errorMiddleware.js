
import ApiError from '../utils/ApiError.js';

const errorMiddleware = (err, req, res, next) => {
  const originalError = err;
  let error = err;

  // Convert unknown errors into ApiError
  if (!(error instanceof ApiError)) {
    error = new ApiError(
      error.statusCode || 500,
      error.message || 'Internal Server Error'
    );
  }

  const statusCode = error.statusCode || 500;

  // Log only unexpected server errors. Expected client errors
  // (4xx ApiErrors such as validation failures) are not logged
  // to avoid noisy logs. Request body and headers are never
  // logged to keep credentials and tokens out of the logs.
  if (statusCode >= 500) {
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${statusCode}: ${error.message}`
    );
    console.error((originalError.stack || error.stack));
  }

  res.status(statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === 'development' && {
      stack: originalError.stack || error.stack,
    }),
  });
};

export default errorMiddleware;
