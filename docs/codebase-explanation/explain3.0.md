# EXPLAIN 3.0 — Features (Conceptual)

## 1. Major Product Features

ReturnDesk provides 5 core feature areas for support agents:

---

### Feature 1: Raising Return Requests
- **What it does**: Allows support agents to initiate a new return for a customer's order.
- **Why it matters**: Captures who the customer is (`name`, `email`), the order number, the item, quantity, and reason (`Damaged`, `Wrong Item`, `Size Issue`, `Not As Described`, `Changed Mind`).
- **Key Behavior**: The system automatically assigns a unique reference number (`RD-XXXXXX`) so neither the customer nor the agent ever has to type or invent one.

---

### Feature 2: Searching, Filtering & Sorting (The Desk Dashboard)
- **What it does**: Allows agents to find return requests quickly across hundreds or thousands of records.
- **Search**: Searches across customer name, order number, and reference ID.
- **Filter**: Filters by status (`Open`, `In Review`, `Approved`, `Rejected`, `Completed`) and reason.
- **Sort**: Sorts by date raised, status, or reason in ascending or descending order.
- **Pagination**: Divides results into pages (10 per page) with total count metadata.
- **Key Behavior**: All search, filtering, and sorting happens **on the server in PostgreSQL**—the client never downloads all rows into browser memory.

---

### Feature 3: Status Lifecycle & Resolution Workflow
- **What it does**: Moves a request through a compliant step-by-step review process.
- **States**:
  1. `Open`: Just created.
  2. `In Review`: Agent is investigating.
  3. `Approved`: Return accepted; agent selects a resolution:
     - **Refund**: Requires a positive dollar refund amount.
     - **Replacement**: No refund amount recorded.
     - **Store Credit**: No refund amount recorded.
  4. `Rejected`: Return denied (final state).
  5. `Completed`: Replacement delivered or refund paid out (final state).

---

### Feature 4: Append-Only Internal Notes
- **What it does**: Lets agents write notes on a request (e.g. *"Customer sent photos of torn packaging"*).
- **Key Behavior**: Notes are strictly append-only. Once added, a note can never be edited or deleted by anyone, ensuring a truthful audit trail.

---

### Feature 5: Soft-Deletion (Taking Off the Desk)
- **What it does**: Allows agents to remove accidental or invalid `Open` or `Rejected` returns from the active dashboard.
- **Key Behavior**: The record is hidden from the dashboard, but remains permanently in the PostgreSQL database for financial auditing.
