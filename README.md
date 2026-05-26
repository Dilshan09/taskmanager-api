# TaskManager API

A RESTful Task Management API built with Node.js and Express.  
Designed as a complete DevOps pipeline demonstration project for **SIT223/SIT753**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18 |
| Framework | Express.js |
| Testing | Jest + Supertest |
| Containerisation | Docker + Docker Compose |
| Code Quality | SonarQube |
| Security Scanning | Trivy |
| Monitoring | Prometheus + Grafana |
| CI/CD | Jenkins |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /metrics | Prometheus metrics |
| GET | /tasks | List all tasks |
| GET | /tasks/:id | Get single task |
| POST | /tasks | Create task |
| PUT | /tasks/:id | Update task |
| DELETE | /tasks/:id | Delete task |

## Running Locally

```bash
npm install
npm start
# App runs on http://localhost:3000
```

## Running Tests

```bash
npm test
# or with coverage:
npm run test:coverage
```

## Running with Docker

```bash
docker build -t taskmanager-api .
docker run -p 3000:3000 taskmanager-api
```

## Full Stack (App + Monitoring)

```bash
docker-compose up -d
```

- App:        http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana:    http://localhost:3001  (admin / admin)

## Jenkins Pipeline Stages

1. **Build** — Docker image built and tagged
2. **Test** — Jest unit/integration tests with JUnit XML output
3. **Code Quality** — SonarQube analysis with coverage report
4. **Security** — Trivy image vulnerability scan
5. **Deploy** — Docker Compose deploys to staging
6. **Release** — Image tagged as release, Git tag created
7. **Monitoring** — Prometheus + Grafana verified and live
