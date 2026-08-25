# ReturnDesk — Architecture

## Overview

Two-service monorepo:
- /server — Express API (Node.js + pg + Zod)
- /client — Next.js App Router frontend (React + Tailwind)

Both live in the same Git repository. The evaluator runs them with two commands.

---

## Project Structure

```
returndesk/
├── server/
│   ├── src/
│   │   ├── index.js               # Express app entry point
│   │   ├── db/
│   │   │   ├── pool.js            # pg Pool singleton
│   │   │   └── schema.sql         # Full PostgreSQL schema
│   │   ├── routes/
│   │   │   └── requests.js        # All request routes registered here
│   │   ├── controllers/
│   │   │   └── requests.js        # HTTP layer: parse req, call service, send res
│   │   ├── services/
│   │   │   └── requests.js        # Business logic and rule enforcement
│   │   ├── queries/
│   │   │   └── requests.js        # Raw SQL queries (db access layer)
│   │   ├── validators/
│   │   │   └── requests.js        # Zod schemas for request validation
│   │   └── middleware/
│   │       ├── errorHandler.js    # Global error handler
│   │       └── validate.js        # Zod validation middleware
│   ├── scripts/
│   │   └── seed.js                # Seed script (node scripts/seed.js)
│   ├── .env.example
│   └── package.json
│
├── client/
│   ├── app/
│   │   ├── layout.js              # Root layout with nav
│   │   ├── page.js                # Request list page
│   │   ├── requests/
│   │   │   ├── new/
│   │   │   │   └── page.js        # Create request form
│   │   │   └── [id]/
│   │   │       └── page.js        # Request detail page
│   │   └── globals.css
│   ├── components/
│   │   ├── RequestList.jsx
│   │   ├── RequestCard.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── RequestDetail.jsx
│   │   ├── NoteList.jsx
│   │   ├── AddNoteForm.jsx
│   │   ├── StatusTransitionPanel.jsx
│   │   ├── SearchBar.jsx
│   │   └── Pagination.jsx
│   ├── lib/
│   │   └── api.js                 # Fetch wrapper for all API calls
│   ├── .env.local.example
│   └── package.json
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   ├── BUSINESS-RULES.md
│   ├── API.md
│   └── PROGRESS.md
│
└── README.md
```

---

## Backend Architecture (Express)

### Request Flow

```
HTTP Request
    ↓
Express Router (routes/requests.js)
    ↓
Zod Validation Middleware (middleware/validate.js)
    ↓
Controller (controllers/requests.js)
    — parses request, calls service, sends response
    ↓
Service (services/requests.js)
    — enforces business rules
    — throws AppError for rule violations
    — calls query functions
    ↓
Queries (queries/requests.js)
    — raw SQL via pg pool
    — returns plain JS objects
    ↓
PostgreSQL
    ↓
Response back up the chain
    ↓
Global Error Handler (middleware/errorHandler.js)
    — converts AppError to { error: { code, message } }
    — converts Zod errors to 400 with field details
    — converts unexpected errors to 500
```

### Error Strategy
- AppError class: { statusCode, code, message }
- Thrown from service layer for all anticipated failures
- Caught by global error handler middleware
- Zod validation errors caught separately and formatted as 400
- Unexpected errors produce 500 with generic message (no stack trace to client)

---

## Database Architecture (PostgreSQL)

### Tables
- return_requests — main entity
- notes — append-only notes per request

### Key Design Choices
- UUID primary keys (gen_random_uuid())
- PostgreSQL ENUMs for status, reason, resolution
- Sequence for human-readable reference generation (RD-XXXXXX)
- is_removed + removed_at for soft delete
- Partial unique index for duplicate request prevention
- updated_at maintained via application layer (set explicitly on update)

See schema.sql for full DDL.

---

## Frontend Architecture (Next.js App Router)

### Pages
- / (page.js) — Request list with search/filter/sort/pagination
- /requests/new — Create request form
- /requests/[id] — Request detail with notes and actions

### Data Fetching
- Client components with useEffect/useState for interactive list (search, filters)
- lib/api.js centralizes all fetch calls to Express backend
- NEXT_PUBLIC_API_URL env var points to Express server

### State Management
- No Redux or Zustand — React useState is sufficient for this scope
- URL search params reflect list filters (supports browser back/forward)

### Error Display
- API errors extracted from { error: { code, message } } shape
- Displayed inline near the relevant action
- Toast or inline alert pattern (not browser alert())

---

## Ports
- Express: 3001 (default)
- Next.js: 3000 (default)
- PostgreSQL: 5432 (default)
