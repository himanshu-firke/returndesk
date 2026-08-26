# EXPLAIN 6.1 — Codebase Directory Deep Dive

This document details every major file in the repository, explaining its purpose, dependencies, and business role.

---

## 1. Backend Source Tree (`server/`)

```
server/
├── package.json               # Backend dependencies (express, pg, zod, cors, nodemon)
├── .env.example               # Template for DB credentials and ports
├── scripts/
│   ├── check-db.js            # Probes DB connectivity on startup
│   ├── setup-db.js            # Applies schema.sql DDL migrations
│   └── seed.js                # Populates 33 requests and 17 notes
└── src/
    ├── index.js               # Main Express application entry point
    ├── db/
    │   ├── pool.js            # Shared PostgreSQL connection pool instance
    │   └── schema.sql         # SQL DDL (Tables, ENUMs, Sequence, Partial Index)
    ├── routes/
    │   └── requests.js        # Maps HTTP endpoints to controllers
    ├── validators/
    │   └── requests.js        # Zod schemas (create, update, status, query schemas)
    ├── middleware/
    │   ├── validate.js        # Generic Zod validation middleware wrapper
    │   └── errorHandler.js    # Global centralized error handler
    ├── controllers/
    │   └── requests.js        # Handles HTTP request/response formatting
    ├── services/
    │   └── requests.js        # Core business rules (5 rules + state machine)
    ├── queries/
    │   └── requests.js        # Raw SQL query functions (find, insert, update)
    └── utils/
        └── AppError.js        # Custom Error class with HTTP status code and error code
```

---

## 2. Frontend Source Tree (`client/`)

```
client/
├── package.json               # Frontend dependencies (next, react, tailwindcss, lucide-react)
├── next.config.mjs            # Next.js configuration
├── lib/
│   ├── api.js                 # Centralized fetch client for backend communication
│   └── constants.js           # UI status colors, badge styles, and legal action maps
├── components/
│   ├── Sidebar.js             # OpsCenter left navigation sidebar
│   ├── TopBar.js              # Header with debounced search and profile badge
│   ├── StatusBadge.js         # Pill badge showing colored status dots
│   ├── NotesSidebar.js        # Chronological notes list + optimistic note adder
│   ├── StatusTransitionModal.js # Modal for approval resolution & status confirmations
│   ├── EmptyState.js          # No returns / No search results graphic states
│   └── ErrorState.js          # Server connection error screen with retry action
└── app/
    ├── layout.js              # Root HTML layout (Sidebar + TopBar + Main container)
    ├── globals.css            # Tailwind theme tokens and base styles
    ├── page.js                # Root redirect (redirects `/` to `/requests`)
    ├── requests/
    │   ├── page.js            # Main returns dashboard table with server filters
    │   ├── new/page.js        # Create return request form
    │   └── [id]/page.js       # Return detail & edit view
    ├── analytics/page.js      # Analytics navigation placeholder
    └── settings/page.js       # Business rules & settings explanation page
```
