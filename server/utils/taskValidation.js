import AppError from './AppError.js';

export const TASK_CATEGORIES = Object.freeze([
  'Engineering',
  'Design',
  'Marketing',
  'Research',
  'Logistics',
]);

export const TASK_PRIORITIES = Object.freeze(['High', 'Medium', 'Low']);
export const TASK_STATUSES = Object.freeze(['todo', 'in-progress', 'done']);

const REQUEST_LIMITS = Object.freeze({
  goal: 1000,
  timeframe: 100,
  teamSize: 50,
  strictness: 50,
});

const TASK_LIMITS = Object.freeze({
  id: 100,
  title: 200,
  description: 3000,
  estimatedDuration: 100,
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateString(value, fieldName, maxLength, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new AppError(
        'VALIDATION_ERROR',
        `${fieldName} is required.`,
        400,
      );
    }

    return undefined;
  }

  if (typeof value !== 'string') {
    throw new AppError(
      'VALIDATION_ERROR',
      `${fieldName} must be a string.`,
      400,
    );
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    if (required) {
      throw new AppError(
        'VALIDATION_ERROR',
        `${fieldName} is required.`,
        400,
      );
    }

    return undefined;
  }

  if (trimmedValue.length > maxLength) {
    throw new AppError(
      'VALIDATION_ERROR',
      `${fieldName} must be ${maxLength} characters or fewer.`,
      400,
    );
  }

  return trimmedValue;
}

function validateGeneratedString(value, fieldName, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      `The AI response contains a task with an invalid ${fieldName}.`,
      502,
    );
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length > maxLength) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      `The AI response contains a task whose ${fieldName} is too long.`,
      502,
    );
  }

  return trimmedValue;
}

export function validateGenerateTasksRequest(body) {
  if (!isPlainObject(body)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Request body must be a JSON object.',
      400,
    );
  }

  return {
    goal: validateString(body.goal, 'Goal', REQUEST_LIMITS.goal),
    timeframe: validateString(
      body.timeframe,
      'Timeframe',
      REQUEST_LIMITS.timeframe,
      { required: false },
    ),
    teamSize: validateString(
      body.teamSize,
      'Team size',
      REQUEST_LIMITS.teamSize,
      { required: false },
    ),
    strictness: validateString(
      body.strictness,
      'Strictness',
      REQUEST_LIMITS.strictness,
      { required: false },
    ),
  };
}

export function validateGeneratedTasksPayload(payload) {
  if (!Array.isArray(payload)) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      'The AI provider did not return a task array.',
      502,
    );
  }

  if (payload.length === 0) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      'The AI provider returned an empty task list.',
      502,
    );
  }

  const tasks = payload.map((item) => {
    if (!isPlainObject(item)) {
      throw new AppError(
        'AI_RESPONSE_INVALID',
        'The AI response contains a malformed task.',
        502,
      );
    }

    const priority = validateGeneratedString(
      item.priority,
      'priority',
      20,
    );

    if (!TASK_PRIORITIES.includes(priority)) {
      throw new AppError(
        'AI_RESPONSE_INVALID',
        'The AI response contains an unsupported task priority.',
        502,
      );
    }

    return {
      title: validateGeneratedString(item.title, 'title', TASK_LIMITS.title),
      description: validateGeneratedString(
        item.description,
        'description',
        TASK_LIMITS.description,
      ),
      priority,
      estimatedDuration: validateGeneratedString(
        item.estimatedDuration,
        'estimated duration',
        TASK_LIMITS.estimatedDuration,
      ),
    };
  });

  if (tasks.length < 10) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      'The AI provider returned fewer than 10 valid tasks. Please try again.',
      502,
    );
  }

  return tasks.slice(0, 15);
}

export function validateCanonicalTask(task) {
  if (!isPlainObject(task)) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      'A generated task could not be normalized.',
      502,
    );
  }

  const id = validateGeneratedString(task.id, 'id', TASK_LIMITS.id);
  const title = validateGeneratedString(task.title, 'title', TASK_LIMITS.title);
  const description = validateGeneratedString(
    task.description,
    'description',
    TASK_LIMITS.description,
  );
  const estimatedDuration = validateGeneratedString(
    task.estimatedDuration,
    'estimated duration',
    TASK_LIMITS.estimatedDuration,
  );

  if (!TASK_CATEGORIES.includes(task.category)) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      'A generated task has an unsupported category.',
      502,
    );
  }

  if (!TASK_PRIORITIES.includes(task.priority)) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      'A generated task has an unsupported priority.',
      502,
    );
  }

  if (!TASK_STATUSES.includes(task.status)) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      'A generated task has an unsupported status.',
      502,
    );
  }

  return {
    id,
    title,
    description,
    category: task.category,
    priority: task.priority,
    status: task.status,
    estimatedDuration,
  };
}
