import AppError from '../utils/AppError.js';

const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';

export function parseAllowedOrigins(value = process.env.CLIENT_ORIGIN) {
  const origins = (value || DEFAULT_CLIENT_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(origins.length > 0 ? origins : [DEFAULT_CLIENT_ORIGIN]);
}

export function createCorsOptions(allowedOrigins = parseAllowedOrigins()) {
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new AppError(
        'CORS_ORIGIN_DENIED',
        'This origin is not allowed to access the API.',
        403,
      ));
    },
  };
}
