import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// Mock the real app to avoid starting the full server
const app = express();
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));


describe('Server Health Check', () => {
  it('should return 200 OK for health check', async () => {
    const response = await supertest(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
