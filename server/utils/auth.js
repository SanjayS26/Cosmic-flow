import jwt from 'jsonwebtoken';
import AppError from './AppError.js';

const DEFAULT_COOKIE_NAME = 'task_deconstructor_session';
const DEFAULT_TOKEN_EXPIRATION = '7d';
const DEFAULT_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getJwtSecret(environment = process.env) {
  if (!environment.JWT_SECRET) {
    throw new AppError(
      'AUTH_CONFIGURATION_ERROR',
      'Authentication is not configured.',
      503,
    );
  }

  return environment.JWT_SECRET;
}

export function assertAuthConfigured(environment = process.env) {
  getJwtSecret(environment);
  return true;
}

export function getAuthCookieName(environment = process.env) {
  return environment.AUTH_COOKIE_NAME || DEFAULT_COOKIE_NAME;
}

export function getCookieOptions(environment = process.env) {
  const sameSite = environment.AUTH_COOKIE_SAME_SITE || 'lax';
  const secure = environment.AUTH_COOKIE_SECURE === 'true'
    || environment.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite,
    secure,
    path: '/',
    maxAge: DEFAULT_COOKIE_MAX_AGE_MS,
  };
}

export function signAuthToken(userId, environment = process.env) {
  return jwt.sign(
    { sub: userId },
    getJwtSecret(environment),
    { expiresIn: environment.JWT_EXPIRES_IN || DEFAULT_TOKEN_EXPIRATION },
  );
}

export function verifyAuthToken(token, environment = process.env) {
  try {
    const payload = jwt.verify(token, getJwtSecret(environment));

    if (typeof payload?.sub !== 'string') {
      throw new Error('Invalid token subject');
    }

    return { userId: payload.sub };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'AUTHENTICATION_REQUIRED',
      'Authentication is required.',
      401,
    );
  }
}

export function setAuthCookie(res, token, environment = process.env) {
  res.cookie(
    getAuthCookieName(environment),
    token,
    getCookieOptions(environment),
  );
}

export function clearAuthCookie(res, environment = process.env) {
  const { maxAge, ...options } = getCookieOptions(environment);
  void maxAge;
  res.clearCookie(getAuthCookieName(environment), options);
}
