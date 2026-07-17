import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateGenerateTasksRequest,
  validateRegenerateTaskRequest,
} from '../utils/taskValidation.js';

test('trims valid request values', () => {
  assert.deepEqual(
    validateGenerateTasksRequest({
      goal: '  Launch a campaign  ',
      timeframe: '  4 weeks ',
      teamSize: ' 5 ',
      strictness: ' Balanced ',
    }),
    {
      goal: 'Launch a campaign',
      timeframe: '4 weeks',
      teamSize: '5',
      strictness: 'Balanced',
    },
  );
});

test('allows omitted optional request values', () => {
  assert.deepEqual(
    validateGenerateTasksRequest({ goal: 'Launch a campaign' }),
    {
      goal: 'Launch a campaign',
      timeframe: undefined,
      teamSize: undefined,
      strictness: undefined,
    },
  );
});

test('rejects a missing goal with the API validation error contract', () => {
  assert.throws(
    () => validateGenerateTasksRequest({ goal: '   ' }),
    (error) => (
      error.code === 'VALIDATION_ERROR'
      && error.statusCode === 400
      && error.message === 'Goal is required.'
    ),
  );
});

test('rejects optional values with invalid types', () => {
  assert.throws(
    () => validateGenerateTasksRequest({
      goal: 'Launch a campaign',
      teamSize: 5,
    }),
    (error) => (
      error.code === 'VALIDATION_ERROR'
      && error.message === 'Team size must be a string.'
    ),
  );
});

test('rejects unexpected generation request fields', () => {
  assert.throws(
    () => validateGenerateTasksRequest({
      goal: 'Launch a campaign',
      nested: { secret: 'unexpected' },
    }),
    (error) => error.code === 'VALIDATION_ERROR',
  );
});

test('validates and normalizes regeneration task input', () => {
  const result = validateRegenerateTaskRequest({
    goal: ' Launch a campaign ',
    task: {
      title: ' Improve landing page ',
      description: ' Add clearer registration information. ',
      category: 'Design',
      priority: 'High',
      status: 'in-progress',
      estimatedDuration: ' 2 days ',
    },
  });

  assert.equal(result.goal, 'Launch a campaign');
  assert.equal(result.task.title, 'Improve landing page');
  assert.equal(result.task.status, 'in-progress');
  assert.equal(result.task.estimatedDuration, '2 days');
});

test('rejects invalid regeneration categories', () => {
  assert.throws(
    () => validateRegenerateTaskRequest({
      goal: 'Launch a campaign',
      task: {
        title: 'Task',
        description: 'Description',
        category: 'Unknown',
        priority: 'High',
        status: 'todo',
        estimatedDuration: '1 day',
      },
    }),
    (error) => error.code === 'VALIDATION_ERROR',
  );
});
