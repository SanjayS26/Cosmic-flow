import assert from 'node:assert/strict';
import test from 'node:test';
import { validateGenerateTasksRequest } from '../utils/taskValidation.js';

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
