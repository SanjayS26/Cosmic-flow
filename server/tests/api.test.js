import assert from 'node:assert/strict';
import test from 'node:test';
import { request, withTestServer } from './helpers/testApp.js';

test('health verifies API and database connectivity', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const response = await request(baseUrl, '/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      services: { api: 'healthy', database: 'healthy' },
    });
  });
});

test('health safely reports an unavailable database', async () => {
  await withTestServer({ databaseHealthCheck: async () => { throw new Error('secret'); } }, async ({ baseUrl }) => {
    const response = await request(baseUrl, '/health');
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.services.database, 'unhealthy');
    assert.doesNotMatch(JSON.stringify(body), /secret/);
  });
});

test('CORS allows configured credentials origins', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const response = await request(baseUrl, '/health', { origin: 'http://allowed.test' });
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://allowed.test');
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  });
});

test('CORS rejects unauthorized origins safely', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const response = await request(baseUrl, '/health', { origin: 'http://blocked.test' });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'CORS_ORIGIN_DENIED');
  });
});

test('unknown API routes use the consistent error contract', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const response = await request(baseUrl, '/api/unknown');
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.equal(body.error.code, 'NOT_FOUND');
  });
});
