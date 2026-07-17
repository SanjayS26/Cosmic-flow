import assert from 'node:assert/strict';
import test from 'node:test';
import AIService from '../services/AIService.js';

const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalHfKey = process.env.HF_API_KEY;

function createGeneratedTasks(count = 10) {
  return Array.from({ length: count }, (_, index) => ({
    title: `Task ${index + 1}`,
    description: `Complete actionable work item ${index + 1}.`,
    priority: index % 3 === 0 ? 'High' : index % 3 === 1 ? 'Medium' : 'Low',
    estimatedDuration: `${index + 1} hours`,
  }));
}

function createAiClient(responseText) {
  return {
    models: {
      generateContent: async () => ({ text: responseText }),
    },
  };
}

test.beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.HF_API_KEY = 'test-hf-key';
});

test.after(() => {
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }

  if (originalHfKey === undefined) {
    delete process.env.HF_API_KEY;
  } else {
    process.env.HF_API_KEY = originalHfKey;
  }
});

test('generates the complete canonical task schema using mocked providers', async () => {
  let uuidIndex = 0;
  const service = new AIService({
    aiClientFactory: () => createAiClient(
      JSON.stringify(createGeneratedTasks()),
    ),
    fetchImpl: async () => ({
      ok: true,
      json: async () => [{ label: 'Engineering', score: 0.9 }],
    }),
    uuidFactory: () => `00000000-0000-4000-8000-${String(uuidIndex += 1).padStart(12, '0')}`,
    hfConcurrency: 2,
  });

  const tasks = await service.generateTasksForGoal('Build a product', {});

  assert.equal(tasks.length, 10);
  assert.deepEqual(Object.keys(tasks[0]), [
    'id',
    'title',
    'description',
    'category',
    'priority',
    'status',
    'estimatedDuration',
  ]);
  assert.equal(tasks[0].category, 'Engineering');
  assert.equal(tasks[0].status, 'todo');
  assert.match(
    tasks[0].id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test('parses the documented Hugging Face array response', async () => {
  const service = new AIService({
    fetchImpl: async () => ({
      ok: true,
      json: async () => [{ label: 'Marketing', score: 0.93 }],
    }),
  });

  assert.equal(
    await service.categorizeTaskWithHF('Plan a campaign launch'),
    'Marketing',
  );
});

test('uses Research when Hugging Face returns an error response', async () => {
  const service = new AIService({
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: 'rate limited' }),
    }),
  });

  assert.equal(
    await service.categorizeTaskWithHF('Classify this task'),
    'Research',
  );
});

test('uses Research when Hugging Face returns malformed data', async () => {
  const service = new AIService({
    fetchImpl: async () => ({
      ok: true,
      json: async () => [],
    }),
  });

  assert.equal(
    await service.categorizeTaskWithHF('Classify this task'),
    'Research',
  );
});

test('rejects a non-array Gemini response', async () => {
  const service = new AIService({
    aiClientFactory: () => createAiClient('{"title":"Invalid"}'),
  });

  await assert.rejects(
    () => service.generateTasksForGoal('Build a product', {}),
    (error) => error.code === 'AI_RESPONSE_INVALID',
  );
});

test('rejects malformed Gemini task objects', async () => {
  const tasks = createGeneratedTasks();
  delete tasks[0].description;

  const service = new AIService({
    aiClientFactory: () => createAiClient(JSON.stringify(tasks)),
  });

  await assert.rejects(
    () => service.generateTasksForGoal('Build a product', {}),
    (error) => error.code === 'AI_RESPONSE_INVALID',
  );
});

test('rejects Gemini responses containing fewer than 10 tasks', async () => {
  const service = new AIService({
    aiClientFactory: () => createAiClient(
      JSON.stringify(createGeneratedTasks(9)),
    ),
  });

  await assert.rejects(
    () => service.generateTasksForGoal('Build a product', {}),
    (error) => (
      error.code === 'AI_RESPONSE_INVALID'
      && error.message.includes('fewer than 10')
    ),
  );
});

test('limits valid Gemini responses to 15 tasks', async () => {
  const service = new AIService({
    aiClientFactory: () => createAiClient(
      JSON.stringify(createGeneratedTasks(17)),
    ),
    fetchImpl: async () => ({
      ok: true,
      json: async () => [{ label: 'Design', score: 0.8 }],
    }),
  });

  const tasks = await service.generateTasksForGoal('Build a product', {});
  assert.equal(tasks.length, 15);
});

test('limits simultaneous Hugging Face classification requests', async () => {
  let activeRequests = 0;
  let maximumActiveRequests = 0;

  const service = new AIService({
    aiClientFactory: () => createAiClient(
      JSON.stringify(createGeneratedTasks()),
    ),
    fetchImpl: async () => {
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);

      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });

      activeRequests -= 1;
      return {
        ok: true,
        json: async () => [{ label: 'Logistics', score: 0.8 }],
      };
    },
    hfConcurrency: 2,
  });

  await service.generateTasksForGoal('Build a product', {});
  assert.equal(maximumActiveRequests, 2);
});

test('regenerates a valid task while preserving status', async () => {
  const service = new AIService({
    aiClientFactory: () => createAiClient(JSON.stringify({
      title: 'Improved task',
      description: 'A clearer and more actionable task description.',
      priority: 'Medium',
      estimatedDuration: '3 days',
    })),
    fetchImpl: async () => ({
      ok: true,
      json: async () => [{ label: 'Design', score: 0.9 }],
    }),
  });

  const task = await service.regenerateTask('Launch a product', {}, {
    title: 'Old task',
    description: 'Old description',
    category: 'Research',
    priority: 'Low',
    status: 'in-progress',
    estimatedDuration: '1 day',
  });

  assert.equal(task.title, 'Improved task');
  assert.equal(task.category, 'Design');
  assert.equal(task.status, 'in-progress');
});

test('rejects malformed regenerated Gemini output', async () => {
  const service = new AIService({
    aiClientFactory: () => createAiClient('{invalid-json'),
  });

  await assert.rejects(
    () => service.regenerateTask('Launch a product', {}, {
      title: 'Old task',
      description: 'Old description',
      category: 'Research',
      priority: 'Low',
      status: 'todo',
      estimatedDuration: '1 day',
    }),
    (error) => error.code === 'AI_RESPONSE_INVALID',
  );
});

test('uses the classification fallback during regeneration', async () => {
  const service = new AIService({
    aiClientFactory: () => createAiClient(JSON.stringify({
      title: 'Improved task',
      description: 'A clearer task description.',
      priority: 'High',
      estimatedDuration: '2 days',
    })),
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });

  const task = await service.regenerateTask('Launch a product', {}, {
    title: 'Old task',
    description: 'Old description',
    category: 'Design',
    priority: 'Low',
    status: 'done',
    estimatedDuration: '1 day',
  });

  assert.equal(task.category, 'Research');
  assert.equal(task.status, 'done');
});
