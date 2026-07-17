import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import test from 'node:test';
import AuthController from '../controllers/AuthController.js';
import {
  createMemoryStore,
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

test('registration normalizes user data, hashes the password, and sets an HTTP-only cookie', async () => {
  await withTestServer({}, async ({ baseUrl, store }) => {
    const { response, body } = await registerUser(baseUrl, {
      name: '  Sanjay  ',
      email: 'SANJAY@EXAMPLE.COM',
    });

    assert.equal(response.status, 201);
    assert.equal(body.data.user.name, 'Sanjay');
    assert.equal(body.data.user.email, 'sanjay@example.com');
    assert.equal('passwordHash' in body.data.user, false);
    assert.notEqual(store.lastPasswordHash, 'password123');
    assert.equal(await bcrypt.compare('password123', store.lastPasswordHash), true);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  });
});

test('duplicate registration returns HTTP 409', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    await registerUser(baseUrl);
    const { response, body } = await registerUser(baseUrl);
    assert.equal(response.status, 409);
    assert.equal(body.error.code, 'EMAIL_ALREADY_REGISTERED');
  });
});

test('registration rejects malformed email and weak password', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const invalidEmail = await registerUser(baseUrl, { email: 'not-an-email' });
    assert.equal(invalidEmail.response.status, 400);

    const weakPassword = await registerUser(baseUrl, { password: 'short' });
    assert.equal(weakPassword.response.status, 400);
  });
});

test('login succeeds and never returns the password hash', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    await registerUser(baseUrl);
    const response = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'password123' },
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.data.user.email, 'test@example.com');
    assert.equal('passwordHash' in body.data.user, false);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  });
});

test('unknown email and incorrect password return the same generic error', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    await registerUser(baseUrl);
    const incorrect = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'incorrect123' },
    });
    const unknown = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: 'unknown@example.com', password: 'incorrect123' },
    });

    assert.equal(incorrect.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(await incorrect.json(), await unknown.json());
  });
});

test('current user requires a valid cookie and logout clears it', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const { cookie } = await registerUser(baseUrl);
    const current = await request(baseUrl, '/api/auth/me', { cookie });
    assert.equal(current.status, 200);
    assert.equal((await current.json()).data.user.email, 'test@example.com');

    const logout = await request(baseUrl, '/api/auth/logout', {
      method: 'POST',
      cookie,
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0|Expires=/i);

    const missing = await request(baseUrl, '/api/auth/me');
    assert.equal(missing.status, 401);
  });
});

test('invalid and expired JWT cookies return HTTP 401', async () => {
  const store = createMemoryStore();
  await store.seedUser({
    id: '00000000-0000-4000-8000-000000000001',
    name: 'User',
    email: 'user@example.com',
  });

  await withTestServer({ store }, async ({ baseUrl }) => {
    const invalid = await request(baseUrl, '/api/auth/me', {
      cookie: 'task_deconstructor_session=invalid-token',
    });
    assert.equal(invalid.status, 401);

    const expiredToken = jwt.sign(
      { sub: '00000000-0000-4000-8000-000000000001' },
      process.env.JWT_SECRET,
      { expiresIn: -1 },
    );
    const expired = await request(baseUrl, '/api/auth/me', {
      cookie: `task_deconstructor_session=${expiredToken}`,
    });
    assert.equal(expired.status, 401);
  });
});

test('authentication endpoints use their own rate limit', async () => {
  await withTestServer({
    authRateLimitConfig: { windowMs: 60_000, max: 2 },
  }, async ({ baseUrl }) => {
    await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: 'none@example.com', password: 'password123' },
    });
    await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: 'none@example.com', password: 'password123' },
    });
    const response = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { email: 'none@example.com', password: 'password123' },
    });
    assert.equal(response.status, 429);
    assert.equal((await response.json()).error.code, 'RATE_LIMIT_EXCEEDED');
  });
});

test('missing JWT configuration is rejected before a user is created', async () => {
  const savedSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  let createCalls = 0;
  const controller = new AuthController({
    userRepository: {
      create: async () => { createCalls += 1; },
    },
  });

  try {
    await assert.rejects(
      () => controller.register({ body: {} }, {}),
      (error) => error.code === 'AUTH_CONFIGURATION_ERROR',
    );
    assert.equal(createCalls, 0);
  } finally {
    process.env.JWT_SECRET = savedSecret;
  }
});
