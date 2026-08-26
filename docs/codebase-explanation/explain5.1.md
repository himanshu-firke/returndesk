# EXPLAIN 5.1 — System Architecture in Code

This document explains the technical implementation of each architectural layer in this repository.

---

## 1. The Server Pipeline (`server/src/`)

When an HTTP request arrives at `http://localhost:3001`, it travels through this exact file pipeline:

```
HTTP Request
     │
     ▼
`server/src/index.js`
  • Configures CORS (`origin: CLIENT_URL`)
  • Attaches JSON body parser (`express.json()`)
  • Mounts `/api/requests` router
     │
     ▼
`server/src/routes/requests.js`
  • Routes HTTP verbs (`GET`, `POST`, `PATCH`, `DELETE`)
  • Applies `validate()` middleware
     │
     ▼
`server/src/middleware/validate.js` & `server/src/validators/requests.js`
  • Parses payload through Zod schemas
  • Rejects malformed types/enums with `400 VALIDATION_ERROR`
     │
     ▼
`server/src/controllers/requests.js`
  • Extracts `req.body`, `req.params`, `req.query`
  • Forwards arguments to service layer
  • Sends JSON response (`res.status(200).json(...)`)
     │
     ▼
`server/src/services/requests.js`
  • Evaluates business rules (State machine, Rule 1–5 guards)
  • Throws `AppError(status, code, message)` if rules violated
     │
     ▼
`server/src/queries/requests.js`
  • Executes raw parameterized SQL using `server/src/db/pool.js`
     │
     ▼
`server/src/middleware/errorHandler.js`
  • Catches any thrown errors in the pipeline
  • Formats unified JSON error envelope
```

---

## 2. The Client Architecture (`client/`)

- **Next.js 15 App Router**:
  - `client/app/layout.js`: Global root layout containing the persistent `Sidebar.js` and `TopBar.js` wrapped in React `Suspense`.
  - `client/app/requests/page.js`: Main listing view using `useTransition` and `useSearchParams` for fast non-blocking filtering.
  - `client/app/requests/new/page.js`: Client-rendered interactive creation form.
  - `client/app/requests/[id]/page.js`: Client-rendered dynamic route for single return management.
- **Central API Client (`client/lib/api.js`)**:
  - All fetch requests are routed through a single `apiFetch()` helper that reads `NEXT_PUBLIC_API_URL` (defaulting to `http://localhost:3001/api`).
  - Converts non-2xx HTTP responses into structured error objects for UI display.
