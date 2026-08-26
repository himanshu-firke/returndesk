# EXPLAIN 2.0 — Users & Roles (Conceptual)

## 1. Who are the Actors in ReturnDesk?

In this version of ReturnDesk, the product is built for **Store Support Agents** working at an operations desk.

---

## 2. User Responsibilities & Boundaries

### What the Support Agent CAN Do:
- **Raise Requests**: Manually create return tickets on behalf of customers who call, email, or chat.
- **Search & Filter**: Find specific orders, customers, or reference IDs quickly.
- **Review Returns**: Move requests from `Open` to `In Review` to begin inspection.
- **Make Business Decisions**:
  - **Approve**: Choose whether the customer receives a **Refund** (with specific amount), a **Replacement**, or **Store Credit**.
  - **Reject**: Decline invalid returns (e.g. past policy window or non-defective items).
- **Edit Undecided Returns**: Correct typos in customer name, email, item name, or quantity while the request is still `Open` or `In Review`.
- **Append Internal Notes**: Leave internal case comments at **any stage** of the request's life.
- **Soft-Delete (Remove)**: Take `Open` or `Rejected` requests off the active desk.

### What the Support Agent CANNOT Do (Enforced by Policy):
- ❌ Cannot skip lifecycle stages (cannot move directly from `Open` to `Completed`).
- ❌ Cannot edit customer or item details once a return has reached `Approved`, `Rejected`, or `Completed`.
- ❌ Cannot remove returns that are `In Review`, `Approved`, or `Completed`.
- ❌ Cannot create two simultaneous active returns for the same item on the same order.
- ❌ Cannot edit or delete existing internal notes once written.

---

## 3. Operational Model

```
                    ┌─────────────────────────┐
                    │      Support Agent      │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   [Create / Edit]         [Make Decisions]        [Append Notes]
   • Raise new return      • Move to In Review     • Leave timestamped
   • Fix customer typos    • Approve w/ resolution   internal notes
   • Soft-delete (Open)    • Reject invalid cases    (Never editable)
```
