import AppError from './AppError.js';

export const PROJECT_STRICTNESS_VALUES = Object.freeze([
  'Flexible',
  'Balanced',
  'Granular',
]);

const PROJECT_FIELDS = Object.freeze([
  'name',
  'goal',
  'timeframe',
  'teamSize',
  'strictness',
]);

export function validateUuid(value, fieldName = 'Resource ID') {
  if (
    typeof value !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new AppError('VALIDATION_ERROR', `${fieldName} is invalid.`, 400);
  }

  return value;
}

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Request body must be a JSON object.',
      400,
    );
  }

  if (Object.keys(body).some((field) => !PROJECT_FIELDS.includes(field))) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Request body contains an unexpected field.',
      400,
    );
  }
}

function validateString(value, fieldName, maxLength, required) {
  if (value === undefined) {
    if (required) {
      throw new AppError(
        'VALIDATION_ERROR',
        `${fieldName} is required.`,
        400,
      );
    }

    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(
      'VALIDATION_ERROR',
      `${fieldName} must be a non-empty string.`,
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

function validateTeamSize(value, required) {
  if (value === undefined) {
    if (required) return undefined;
    return undefined;
  }

  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Team size must be a whole number between 1 and 100.',
      400,
    );
  }

  return value;
}

function validateStrictness(value) {
  if (value === undefined) return undefined;
  const normalized = validateString(value, 'Strictness', 50, false);

  if (!PROJECT_STRICTNESS_VALUES.includes(normalized)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Strictness is not supported.',
      400,
    );
  }

  return normalized;
}

function normalizeProject(body, required) {
  requireObject(body);

  return {
    name: validateString(body.name, 'Project name', 200, required),
    goal: validateString(body.goal, 'Goal', 1000, required),
    timeframe: validateString(body.timeframe, 'Timeframe', 100, false),
    teamSize: validateTeamSize(body.teamSize, required),
    strictness: validateStrictness(body.strictness),
  };
}

export function validateCreateProjectRequest(body) {
  return normalizeProject(body, true);
}

export function validateUpdateProjectRequest(body) {
  const normalized = normalizeProject(body, false);
  const changes = Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(changes).length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Provide at least one project field to update.',
      400,
    );
  }

  return changes;
}
