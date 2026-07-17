import AppError from './AppError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Request body must be a JSON object.',
      400,
    );
  }
}

function rejectUnexpectedFields(body, allowedFields) {
  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Request body contains an unexpected field.',
      400,
    );
  }
}

function validateString(value, fieldName, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(
      'VALIDATION_ERROR',
      `${fieldName} is required.`,
      400,
    );
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new AppError(
      'VALIDATION_ERROR',
      `${fieldName} must be ${maxLength} characters or fewer.`,
      400,
    );
  }

  return normalized;
}

function validateEmail(value) {
  const email = validateString(value, 'Email', 320).toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Enter a valid email address.',
      400,
    );
  }

  return email;
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 8) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Password must be at least 8 characters.',
      400,
    );
  }

  if (value.length > 128) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Password must be 128 characters or fewer.',
      400,
    );
  }

  return value;
}

export function validateRegistrationRequest(body) {
  requireObject(body);
  rejectUnexpectedFields(body, ['name', 'email', 'password']);

  return {
    name: validateString(body.name, 'Name', 100),
    email: validateEmail(body.email),
    password: validatePassword(body.password),
  };
}

export function validateLoginRequest(body) {
  requireObject(body);
  rejectUnexpectedFields(body, ['email', 'password']);

  return {
    email: validateEmail(body.email),
    password: validatePassword(body.password),
  };
}
