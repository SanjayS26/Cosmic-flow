import AppError from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  next(new AppError('NOT_FOUND', 'The requested API route was not found.', 404));
}

function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.type === 'entity.too.large') {
    return new AppError(
      'REQUEST_TOO_LARGE',
      'The request body is too large.',
      413,
    );
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return new AppError(
      'INVALID_JSON',
      'Request body contains invalid JSON.',
      400,
    );
  }

  if (error?.code === '23505') {
    return new AppError(
      'CONFLICT',
      'A record with these values already exists.',
      409,
    );
  }

  if (['23502', '23503', '23514', '22P02'].includes(error?.code)) {
    return new AppError(
      'VALIDATION_ERROR',
      'The submitted data violates a database constraint.',
      400,
    );
  }

  if (typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)) {
    return new AppError(
      'DATABASE_UNAVAILABLE',
      'The database could not complete the request.',
      503,
    );
  }

  return new AppError(
    'INTERNAL_ERROR',
    'An unexpected server error occurred.',
    500,
  );
}

export function createErrorHandler(environment = process.env.NODE_ENV) {
  return (error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const normalizedError = normalizeError(error);

    if (!(error instanceof AppError) && environment === 'development') {
      console.error(error?.stack || 'Unexpected server error.');
    }

    res.status(normalizedError.statusCode).json({
      success: false,
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
      },
    });
  };
}
