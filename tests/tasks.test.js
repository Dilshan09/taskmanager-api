const request = require('supertest');
const { app } = require('../src/app');

// Reset tasks before each test
beforeEach(async () => {
  await request(app).delete('/tasks');
});

// ─── Health Check ─────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ─── Create Task ──────────────────────────────────────────────────────────────
describe('POST /tasks', () => {
  test('creates a task with valid data', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Buy groceries', description: 'Milk and eggs', priority: 'high' });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Buy groceries');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('pending');
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('createdAt');
  });

  test('defaults priority to medium when not specified', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Read book' });

    expect(res.statusCode).toBe(201);
    expect(res.body.priority).toBe('medium');
  });

  test('rejects task with no title', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ description: 'No title provided' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });

  test('rejects task with empty title', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: '   ' });

    expect(res.statusCode).toBe(400);
  });

  test('ignores invalid priority and defaults to medium', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test task', priority: 'urgent' });

    expect(res.statusCode).toBe(201);
    expect(res.body.priority).toBe('medium');
  });
});

// ─── Get Tasks ────────────────────────────────────────────────────────────────
describe('GET /tasks', () => {
  test('returns empty list when no tasks', async () => {
    const res = await request(app).get('/tasks');
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  test('returns all created tasks', async () => {
    await request(app).post('/tasks').send({ title: 'Task 1' });
    await request(app).post('/tasks').send({ title: 'Task 2' });

    const res = await request(app).get('/tasks');
    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.count).toBe(2);
  });
});

describe('GET /tasks/:id', () => {
  test('returns task by id', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Find me' });
    const { id } = create.body;

    const res = await request(app).get(`/tasks/${id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.title).toBe('Find me');
  });

  test('returns 404 for non-existent task', async () => {
    const res = await request(app).get('/tasks/does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});

// ─── Update Task ──────────────────────────────────────────────────────────────
describe('PUT /tasks/:id', () => {
  test('updates task fields', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Old title' });
    const { id } = create.body;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: 'New title', status: 'in-progress' });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('New title');
    expect(res.body.status).toBe('in-progress');
  });

  test('returns 404 when updating non-existent task', async () => {
    const res = await request(app).put('/tasks/ghost').send({ title: 'Nope' });
    expect(res.statusCode).toBe(404);
  });

  test('ignores invalid status values', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Status test' });
    const { id } = create.body;

    const res = await request(app)
      .put(`/tasks/${id}`)
      .send({ status: 'flying' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('pending'); // unchanged
  });
});

// ─── Delete Task ──────────────────────────────────────────────────────────────
describe('DELETE /tasks/:id', () => {
  test('deletes an existing task', async () => {
    const create = await request(app).post('/tasks').send({ title: 'Delete me' });
    const { id } = create.body;

    const del = await request(app).delete(`/tasks/${id}`);
    expect(del.statusCode).toBe(204);

    const get = await request(app).get(`/tasks/${id}`);
    expect(get.statusCode).toBe(404);
  });

  test('returns 404 when deleting non-existent task', async () => {
    const res = await request(app).delete('/tasks/no-such-task');
    expect(res.statusCode).toBe(404);
  });
});

// ─── Metrics ──────────────────────────────────────────────────────────────────
describe('GET /metrics', () => {
  test('returns prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });
});
