# EXPLAIN 5.0 — System Architecture (Conceptual)

## 1. System Components & High-Level Architecture

ReturnDesk is organized as a decoupled **Client-Server Architecture** with a relational database:

```
┌─────────────────────────────────────────────────────────┐
│                     1. CLIENT LAYER                     │
│                    (Next.js 15 App)                     │
│    • OpsCenter UI Components & Navigation               │
│    • Real-time Debounced Search & Filter Chips          │
│    • Optimistic Note Appending & Status Modals          │
└────────────────────────────┬────────────────────────────┘
                             │
                             │ JSON over HTTP (REST API)
                             │ Port 3000 ➔ Port 3001
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     2. SERVER LAYER                     │
│                  (Node.js + Express)                    │
│    • Route Mapping & Request Routing                    │
│    • Zod Schema Validation Pipeline                     │
│    • Pure Domain Service Layer (5 Business Rules)       │
│    • Standardized JSON Error Envelope                   │
└────────────────────────────┬────────────────────────────┘
                             │
                             │ Parameterized SQL (`pg` Pool)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    3. DATABASE LAYER                    │
│                      (PostgreSQL)                       │
│    • Custom Schema ENUMs                                │
│    • Thread-safe Sequence (`request_ref_seq`)           │
│    • Partial Unique Index (Concurreny Duplicate Guard)  │
│    • Relational Foreign Keys & Cascading Lookups        │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Why this Architecture?

1. **Decoupled Frontend & Backend**:
   - The Express backend operates as a standalone REST API. It can be tested independently via cURL/Postman or automated test suites without booting Next.js.
2. **Layered Server Pipeline**:
   - Every request passes through a strict chain of responsibility:
     `Route` (Where is it going?) → `Validator` (Is the JSON shape valid?) → `Controller` (HTTP transport) → `Service` (Business rules) → `Query` (SQL execution).
3. **Database as the Final Authority**:
   - Critical data integrity rules (like preventing duplicate active returns) are not trusted to Javascript code alone; they are anchored directly in the database engine via **PostgreSQL Partial Unique Indexes**.
