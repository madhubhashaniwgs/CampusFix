
import ApiError from '../utils/ApiError.js';

const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // Convert unknown errors into ApiError
  if (!(error instanceof ApiError)) {
    error = new ApiError(
      error.statusCode || 500,
      error.message || 'Internal Server Error'
    );
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
};

export default errorMiddleware;
