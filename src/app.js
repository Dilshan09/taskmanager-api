const express = require('express');
const { v4: uuidv4 } = require('uuid');
const client = require('prom-client');

const app = express();
app.use(express.json());

// ─── Prometheus Metrics ───────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  registers: [register],
});

// Middleware to track metrics
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
    end();
  });
  next();
});

// ─── In-Memory Task Store ─────────────────────────────────────────────────────
let tasks = [];

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check (used by monitoring)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Get all tasks
app.get('/tasks', (req, res) => {
  res.json({ tasks, count: tasks.length });
});

// Get single task
app.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// Create a task
app.post('/tasks', (req, res) => {
  const { title, description, priority } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const validPriorities = ['low', 'medium', 'high'];
  const taskPriority = priority && validPriorities.includes(priority) ? priority : 'medium';

  const task = {
    id: uuidv4(),
    title: title.trim(),
    description: description || '',
    priority: taskPriority,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tasks.push(task);
  res.status(201).json(task);
});

// Update a task
app.put('/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  const { title, description, priority, status } = req.body;
  const validStatuses = ['pending', 'in-progress', 'done'];
  const validPriorities = ['low', 'medium', 'high'];

  const updated = {
    ...tasks[index],
    title: title || tasks[index].title,
    description: description !== undefined ? description : tasks[index].description,
    priority: priority && validPriorities.includes(priority) ? priority : tasks[index].priority,
    status: status && validStatuses.includes(status) ? status : tasks[index].status,
    updatedAt: new Date().toISOString(),
  };

  tasks[index] = updated;
  res.json(updated);
});

// Delete a task
app.delete('/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  tasks.splice(index, 1);
  res.status(204).send();
});

// Helper for tests: reset task store
app.delete('/tasks', (req, res) => {
  tasks = [];
  res.status(204).send();
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
let server;

if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`TaskManager API running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Metrics: http://localhost:${PORT}/metrics`);
  });
}

module.exports = { app };
