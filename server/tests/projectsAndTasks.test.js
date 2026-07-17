import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ids,
  registerUser,
  request,
  withTestServer,
} from './helpers/testApp.js';

const originalSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'test-only-jwt-secret-that-is-long-enough';

test.after(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

async function seedTwoUsers(baseUrl, store) {
  const userA = await registerUser(baseUrl, { email: 'a@example.com', name: 'User A' });
  const userB = await registerUser(baseUrl, { email: 'b@example.com', name: 'User B' });
  store.seedProject({
    id: ids.projectA,
    userId: userA.body.data.user.id,
    name: 'Project A',
    goal: 'Build A',
  });
  store.seedProject({
    id: ids.projectB,
    userId: userB.body.data.user.id,
    name: 'Project B',
    goal: 'Build B',
  });
  store.seedTask({ id: ids.taskA, projectId: ids.projectA, title: 'Task A' });
  store.seedTask({ id: ids.taskB, projectId: ids.projectB, title: 'Task B' });
  return { userA, userB };
}

test('project list and creation are scoped to the authenticated user', async () => {
  await withTestServer({}, async ({ baseUrl, store }) => {
    const { userA } = await seedTwoUsers(baseUrl, store);
    const list = await request(baseUrl, '/api/projects', { cookie: userA.cookie });
    const projects = (await list.json()).data;
    assert.deepEqual(projects.map((project) => project.name), ['Project A']);

    const created = await request(baseUrl, '/api/projects', {
      method: 'POST',
      cookie: userA.cookie,
      body: {
        name: 'New Project',
        goal: 'Ship a product',
        timeframe: '4 weeks',
        teamSize: 4,
        strictness: 'Balanced',
      },
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).data.name, 'New Project');
  });
});

test('another user cannot view, edit, or delete a project', async () => {
  await withTestServer({}, async ({ baseUrl, store }) => {
    const { userA } = await seedTwoUsers(baseUrl, store);
    const paths = [
      ['GET', `/api/projects/${ids.projectB}`, undefined],
      ['PATCH', `/api/projects/${ids.projectB}`, { name: 'Stolen' }],
      ['DELETE', `/api/projects/${ids.projectB}`, undefined],
    ];

    for (const [method, path, body] of paths) {
      const response = await request(baseUrl, path, {
        method,
        body,
        cookie: userA.cookie,
      });
      assert.equal(response.status, 404);
    }
    assert.equal(store.projects.some((project) => project.id === ids.projectB), true);
  });
});

test('project deletion cascades tasks at the repository boundary', async () => {
  await withTestServer({}, async ({ baseUrl, store }) => {
    const { userA } = await seedTwoUsers(baseUrl, store);
    const response = await request(baseUrl, `/api/projects/${ids.projectA}`, {
      method: 'DELETE',
      cookie: userA.cookie,
    });
    assert.equal(response.status, 200);
    assert.equal(store.tasks.some((task) => task.projectId === ids.projectA), false);
    assert.equal(store.tasks.some((task) => task.projectId === ids.projectB), true);
  });
});

test('another user cannot view, edit, delete, regenerate, or reorder tasks', async () => {
  let regenerationCalls = 0;
  await withTestServer({
    aiService: {
      generateTasksForGoal: async () => [],
      regenerateTask: async () => { regenerationCalls += 1; },
    },
  }, async ({ baseUrl, store }) => {
    const { userA } = await seedTwoUsers(baseUrl, store);
    const operations = [
      ['GET', `/api/projects/${ids.projectB}/tasks/${ids.taskB}`, undefined],
      ['PATCH', `/api/projects/${ids.projectB}/tasks/${ids.taskB}`, { title: 'Stolen' }],
      ['DELETE', `/api/projects/${ids.projectB}/tasks/${ids.taskB}`, undefined],
      ['POST', `/api/projects/${ids.projectB}/tasks/${ids.taskB}/regenerate`, undefined],
      ['PATCH', `/api/projects/${ids.projectB}/tasks/reorder`, {
        tasks: [{ id: ids.taskB, status: 'done', position: 0 }],
      }],
    ];

    for (const [method, path, body] of operations) {
      const response = await request(baseUrl, path, {
        method,
        body,
        cookie: userA.cookie,
      });
      assert.equal(response.status, 404);
    }
    assert.equal(regenerationCalls, 0);
    assert.equal(store.tasks.find((task) => task.id === ids.taskB).title, 'Task B');
  });
});

test('task generation saves mocked provider output for the owned project', async () => {
  const generated = {
    id: 'provider-id',
    title: 'Generated task',
    description: 'Generated description',
    category: 'Research',
    priority: 'Medium',
    status: 'todo',
    estimatedDuration: '2 days',
  };
  await withTestServer({
    aiService: {
      generateTasksForGoal: async () => [generated],
      regenerateTask: async () => generated,
    },
  }, async ({ baseUrl, store }) => {
    const { userA } = await seedTwoUsers(baseUrl, store);
    const response = await request(
      baseUrl,
      `/api/projects/${ids.projectA}/generate-tasks`,
      { method: 'POST', cookie: userA.cookie },
    );
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.data[0].title, 'Generated task');
    assert.equal(body.data[0].projectId, ids.projectA);
  });
});

test('task editing, regeneration, deletion, and reordering persist through APIs', async () => {
  await withTestServer({
    aiService: {
      generateTasksForGoal: async () => [],
      regenerateTask: async () => ({
        title: 'Improved task',
        description: 'Improved description',
        category: 'Design',
        priority: 'Low',
        status: 'done',
        estimatedDuration: '3 days',
      }),
    },
  }, async ({ baseUrl, store }) => {
    const { userA } = await seedTwoUsers(baseUrl, store);
    const edited = await request(
      baseUrl,
      `/api/projects/${ids.projectA}/tasks/${ids.taskA}`,
      { method: 'PATCH', cookie: userA.cookie, body: { title: 'Edited task' } },
    );
    assert.equal((await edited.json()).data.title, 'Edited task');

    const regenerated = await request(
      baseUrl,
      `/api/projects/${ids.projectA}/tasks/${ids.taskA}/regenerate`,
      { method: 'POST', cookie: userA.cookie },
    );
    const regeneratedTask = (await regenerated.json()).data;
    assert.equal(regeneratedTask.title, 'Improved task');
    assert.equal(regeneratedTask.id, ids.taskA);
    assert.equal(regeneratedTask.status, 'todo');
    assert.equal(regeneratedTask.position, 0);

    const reordered = await request(
      baseUrl,
      `/api/projects/${ids.projectA}/tasks/reorder`,
      {
        method: 'PATCH',
        cookie: userA.cookie,
        body: { tasks: [{ id: ids.taskA, status: 'done', position: 0 }] },
      },
    );
    assert.equal((await reordered.json()).data[0].status, 'done');

    const removed = await request(
      baseUrl,
      `/api/projects/${ids.projectA}/tasks/${ids.taskA}`,
      { method: 'DELETE', cookie: userA.cookie },
    );
    assert.equal(removed.status, 200);
    assert.equal(store.tasks.some((task) => task.id === ids.taskA), false);
  });
});

test('duplicate IDs and negative task positions are rejected before reordering', async () => {
  await withTestServer({}, async ({ baseUrl, store }) => {
    const { userA } = await seedTwoUsers(baseUrl, store);
    const duplicate = await request(
      baseUrl,
      `/api/projects/${ids.projectA}/tasks/reorder`,
      {
        method: 'PATCH',
        cookie: userA.cookie,
        body: { tasks: [
          { id: ids.taskA, status: 'todo', position: 0 },
          { id: ids.taskA, status: 'done', position: 1 },
        ] },
      },
    );
    assert.equal(duplicate.status, 400);

    const negative = await request(
      baseUrl,
      `/api/projects/${ids.projectA}/tasks/reorder`,
      {
        method: 'PATCH',
        cookie: userA.cookie,
        body: { tasks: [{ id: ids.taskA, status: 'todo', position: -1 }] },
      },
    );
    assert.equal(negative.status, 400);
  });
});
