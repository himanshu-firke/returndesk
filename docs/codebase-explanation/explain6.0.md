# EXPLAIN 6.0 — Codebase Structure & Map (Conceptual)

## 1. Directory Structure Overview

The project is structured into two main workspaces: **`client`** (Frontend) and **`server`** (Backend), alongside documentation and configuration.

```
frido-assignment/
├── client/          # Frontend Next.js 15 application
├── server/          # Backend Node.js / Express application
├── docs/            # Product requirements, decisions, and codebase explanations
├── README.md        # Main repository setup and project guide
├── INTERVIEW_GUIDE.md # Technical interview and code defense notes
└── .gitignore       # Git exclusion rules for secrets, caches, and PDFs
```

---

## 2. Conceptual Roles of Key Folders

| Directory | What it does | Real-world Analogy |
|---|---|---|
| `client/app/` | Page routes and URL layouts | The rooms and floors of a building |
| `client/components/` | Reusable UI building blocks | Furniture used across different rooms |
| `client/lib/` | Frontend helper functions & API client | The telephone connecting the client to the server |
| `server/src/routes/` | Endpoint path definitions | The front desk receptionist directing visitors |
| `server/src/validators/` | Input inspection rules | The security guard checking ID badges at the door |
| `server/src/controllers/` | Request/response managers | The manager delegating tasks to workers |
| `server/src/services/` | Core business logic & rules | The company policy book |
| `server/src/queries/` | SQL database access functions | The warehouse worker fetching items from shelves |
| `server/src/db/` | Database schema and connection pool | The physical vault and database connection |
| `server/scripts/` | Database setup and seed utilities | The factory tools used to build and stock the store |
