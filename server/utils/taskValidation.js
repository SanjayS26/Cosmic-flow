import AppError from './AppError.js';
import { validateUuid } from './projectValidation.js';

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

const GENERATION_REQUEST_FIELDS = Object.freeze([
  'goal',
  'timeframe',
  'teamSize',
  'strictness',
]);

const REGENERATION_REQUEST_FIELDS = Object.freeze([
  ...GENERATION_REQUEST_FIELDS,
  'task',
]);

const EDITABLE_TASK_FIELDS = Object.freeze([
  'title',
  'description',
  'category',
  'priority',
  'status',
  'estimatedDuration',
]);

const TASK_UPDATE_FIELDS = Object.freeze([
  ...EDITABLE_TASK_FIELDS,
  'position',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rejectUnexpectedFields(value, allowedFields, subject) {
  const unexpectedField = Object.keys(value).find(
    (field) => !allowedFields.includes(field),
  );

  if (unexpectedField) {
    throw new AppError(
      'VALIDATION_ERROR',
      `${subject} contains an unexpected field.`,
      400,
    );
  }
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

  rejectUnexpectedFields(body, GENERATION_REQUEST_FIELDS, 'Request body');

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

function validateTaskInput(task) {
  if (!isPlainObject(task)) {
    throw new AppError('VALIDATION_ERROR', 'Task is required.', 400);
  }

  rejectUnexpectedFields(task, EDITABLE_TASK_FIELDS, 'Task');

  const category = validateString(
    task.category,
    'Task category',
    50,
  );
  const priority = validateString(
    task.priority,
    'Task priority',
    20,
  );
  const status = validateString(task.status, 'Task status', 20);

  if (!TASK_CATEGORIES.includes(category)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Task category is not supported.',
      400,
    );
  }

  if (!TASK_PRIORITIES.includes(priority)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Task priority is not supported.',
      400,
    );
  }

  if (!TASK_STATUSES.includes(status)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Task status is not supported.',
      400,
    );
  }

  return {
    title: validateString(task.title, 'Task title', TASK_LIMITS.title),
    description: validateString(
      task.description,
      'Task description',
      TASK_LIMITS.description,
    ),
    category,
    priority,
    status,
    estimatedDuration: validateString(
      task.estimatedDuration,
      'Estimated duration',
      TASK_LIMITS.estimatedDuration,
    ),
  };
}

function validateCategory(value) {
  const category = validateString(value, 'Task category', 50);
  if (!TASK_CATEGORIES.includes(category)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Task category is not supported.',
      400,
    );
  }
  return category;
}

function validatePriority(value) {
  const priority = validateString(value, 'Task priority', 20);
  if (!TASK_PRIORITIES.includes(priority)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Task priority is not supported.',
      400,
    );
  }
  return priority;
}

function validateStatus(value) {
  const status = validateString(value, 'Task status', 20);
  if (!TASK_STATUSES.includes(status)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Task status is not supported.',
      400,
    );
  }
  return status;
}

function validatePosition(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Task position must be a non-negative integer.',
      400,
    );
  }
  return value;
}

export function validateRegenerateTaskRequest(body) {
  if (!isPlainObject(body)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Request body must be a JSON object.',
      400,
    );
  }

  rejectUnexpectedFields(body, REGENERATION_REQUEST_FIELDS, 'Request body');
  const context = validateGenerateTasksRequest({
    goal: body.goal,
    timeframe: body.timeframe,
    teamSize: body.teamSize,
    strictness: body.strictness,
  });

  return {
    ...context,
    task: validateTaskInput(body.task),
  };
}

export function validateCreateTaskRequest(body) {
  if (!isPlainObject(body)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Request body must be a JSON object.',
      400,
    );
  }

  rejectUnexpectedFields(body, TASK_UPDATE_FIELDS, 'Request body');
  const { position, ...taskFields } = body;
  const task = validateTaskInput({
    ...taskFields,
    status: body.status ?? 'todo',
  });

  return {
    ...task,
    position: position === undefined
      ? undefined
      : validatePosition(position),
  };
}

export function validateUpdateTaskRequest(body) {
  if (!isPlainObject(body)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Request body must be a JSON object.',
      400,
    );
  }

  rejectUnexpectedFields(body, TASK_UPDATE_FIELDS, 'Request body');
  const changes = {};

  if (body.title !== undefined) {
    changes.title = validateString(body.title, 'Task title', TASK_LIMITS.title);
  }
  if (body.description !== undefined) {
    changes.description = validateString(
      body.description,
      'Task description',
      TASK_LIMITS.description,
    );
  }
  if (body.category !== undefined) {
    changes.category = validateCategory(body.category);
  }
  if (body.priority !== undefined) {
    changes.priority = validatePriority(body.priority);
  }
  if (body.status !== undefined) {
    changes.status = validateStatus(body.status);
  }
  if (body.estimatedDuration !== undefined) {
    changes.estimatedDuration = validateString(
      body.estimatedDuration,
      'Estimated duration',
      TASK_LIMITS.estimatedDuration,
    );
  }
  if (body.position !== undefined) {
    changes.position = validatePosition(body.position);
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Provide at least one task field to update.',
      400,
    );
  }

  return changes;
}

export function validateReorderTasksRequest(body) {
  if (!isPlainObject(body)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Request body must be a JSON object.',
      400,
    );
  }

  rejectUnexpectedFields(body, ['tasks'], 'Request body');
  if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'At least one task order update is required.',
      400,
    );
  }

  if (body.tasks.length > 500) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Too many task order updates were provided.',
      400,
    );
  }

  const seenIds = new Set();
  const tasks = body.tasks.map((item) => {
    if (!isPlainObject(item)) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Every task order update must be an object.',
        400,
      );
    }

    rejectUnexpectedFields(item, ['id', 'status', 'position'], 'Task update');
    const id = validateUuid(item.id, 'Task ID');
    if (seenIds.has(id)) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Duplicate task IDs are not allowed.',
        400,
      );
    }
    seenIds.add(id);

    return {
      id,
      status: validateStatus(item.status),
      position: validatePosition(item.position),
    };
  });

  return { tasks };
}

export function validateGeneratedTaskPayload(item) {
  if (!isPlainObject(item)) {
    throw new AppError(
      'AI_RESPONSE_INVALID',
      'The AI response contains a malformed task.',
      502,
    );
  }

  const priority = validateGeneratedString(item.priority, 'priority', 20);

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

  const tasks = payload.map(validateGeneratedTaskPayload);

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
