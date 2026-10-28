import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { createApp } from '../server/app.js';
import { resetDatabase } from '../server/db/reset.js';

function setupTestServer() {
  const db = new Database(':memory:');
  resetDatabase(db);
  const app = createApp(db);
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    db,
    server,
    baseUrl,
    close: () => new Promise(res => server.close(res))
  };
}

test('Phase 4 - Signup API: Success, Validation & Duplicate Handling', async () => {
  const ctx = setupTestServer();
  try {
    // 1. Successful Signup
    const res = await fetch(`${ctx.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: 'sarah@skynet.com',
        password: 'password123'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.token, 'Should return a JWT token');
    assert.equal(data.user.name, 'Sarah Connor');
    assert.equal(data.user.email, 'sarah@skynet.com');
    assert.equal(data.user.password, undefined, 'Plain password must never be returned');

    // 2. Duplicate Email Rejection
    const dupRes = await fetch(`${ctx.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Duplicate',
        email: 'SARAH@skynet.com', // case-insensitive duplicate check
        password: 'password123'
      })
    });
    assert.equal(dupRes.status, 409);
    const dupData = await dupRes.json();
    assert.ok(dupData.error.includes('already exists'));

    // 3. Validation: Password < 8 characters
    const shortPwRes = await fetch(`${ctx.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'short'
      })
    });
    assert.equal(shortPwRes.status, 400);

    // 4. Validation: Invalid Email format
    const badEmailRes = await fetch(`${ctx.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'not-an-email',
        password: 'password123'
      })
    });
    assert.equal(badEmailRes.status, 400);
  } finally {
    await ctx.close();
  }
});

test('Phase 4 - Login API: Valid Credentials & Security Rejections', async () => {
  const ctx = setupTestServer();
  try {
    // Seed user
    await fetch(`${ctx.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kyle Reese',
        email: 'kyle@resistance.org',
        password: 'strongPassword99'
      })
    });

    // 1. Successful Login
    const loginRes = await fetch(`${ctx.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kyle@resistance.org',
        password: 'strongPassword99'
      })
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token);
    assert.equal(loginData.user.name, 'Kyle Reese');

    // 2. Wrong Password
    const wrongPwRes = await fetch(`${ctx.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kyle@resistance.org',
        password: 'incorrectPassword'
      })
    });
    assert.equal(wrongPwRes.status, 401);
    const wrongPwData = await wrongPwRes.json();
    assert.equal(wrongPwData.error, 'Invalid email or password.');

    // 3. Non-existent User (Must return identical generic error to avoid user enumeration)
    const noUserRes = await fetch(`${ctx.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ghost@resistance.org',
        password: 'anyPassword123'
      })
    });
    assert.equal(noUserRes.status, 401);
    const noUserData = await noUserRes.json();
    assert.equal(noUserData.error, 'Invalid email or password.');
  } finally {
    await ctx.close();
  }
});

test('Phase 4 - Protected /api/auth/me Route: Token Enforcement', async () => {
  const ctx = setupTestServer();
  try {
    const signupRes = await fetch(`${ctx.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Miles Dyson',
        email: 'miles@cyberdyne.com',
        password: 'skynetArchitect'
      })
    });
    const { token } = await signupRes.json();

    // 1. Success with valid token
    const meRes = await fetch(`${ctx.baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.name, 'Miles Dyson');
    assert.equal(meData.user.email, 'miles@cyberdyne.com');

    // 2. Missing token
    const noTokenRes = await fetch(`${ctx.baseUrl}/api/auth/me`);
    assert.equal(noTokenRes.status, 401);

    // 3. Invalid/Forged token
    const badTokenRes = await fetch(`${ctx.baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer forged.invalid.token' }
    });
    assert.equal(badTokenRes.status, 401);
  } finally {
    await ctx.close();
  }
});
