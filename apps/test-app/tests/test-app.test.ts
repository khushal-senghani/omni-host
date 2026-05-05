import { describe, it, expect } from 'vitest';
import { buildTestApp, mockAuth } from '@pap/testing';
import plugin from '../src/index.js';

describe('test-app', () => {
  it('GET /hello returns greeting', async () => {
    const app = await buildTestApp(plugin);
    const res = await app.inject({
      method: 'GET',
      url: '/test-app/hello',
      headers: mockAuth('test-user'),
    });
    
    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBeDefined();
  });
});
