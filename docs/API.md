# ReturnDesk — API Contract

Base URL: http://localhost:3001/api

## Error Format (all errors)
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description."
  }
}
```

Validation errors (400) also include:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data.",
    "details": [
      { "field": "quantity", "message": "Expected number, received string" }
    ]
  }
}
```

---

## GET /api/requests
List return requests with search, filter, sort, and pagination.

### Query Parameters
| Param | Type | Default | Description |
|---|---|---|---|
| search | string | - | Searches customer_name, order_id, reference (ILIKE) |
| status | string | - | Filter by status (Open, In Review, Approved, Rejected, Completed) |
| reason | string | - | Filter by reason |
| sortBy | string | created_at | Sort field (created_at, updated_at, status, reason) |
| sortOrder | string | desc | asc or desc |
| page | integer | 1 | Page number (1-indexed) |
| limit | integer | 20 | Results per page (max 100) |

Note: All removed requests are excluded.

### Success Response (200)
```json
{
  "data": [
    {
      "id": "uuid",
      "reference": "RD-000001",
      "customer_name": "Jane Smith",
      "customer_email": "jane@example.com",
      "order_id": "ORD-1001",
      "item_name": "Blue Denim Jacket",
      "item_sku": "BDJ-M",
      "quantity": 1,
      "reason": "Damaged",
      "status": "Open",
      "resolution": null,
      "refund_amount": null,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

### Error Responses
- 400: Invalid query parameters (bad sortBy value, non-integer page, etc.)

---

## POST /api/requests
Create a new return request.

### Request Body
```json
{
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "order_id": "ORD-1001",
  "item_name": "Blue Denim Jacket",
  "item_sku": "BDJ-M",
  "quantity": 1,
  "reason": "Damaged"
}
```

Required: customer_name, customer_email, order_id, item_name, quantity, reason
Optional: item_sku

### Success Response (201)
Full request object (same shape as list item).

### Error Responses
- 400: Validation error (missing fields, invalid reason, quantity < 1)
- 409: DUPLICATE_ACTIVE_REQUEST — active request already exists for this order+item

---

## GET /api/requests/:id
Get a single request with all its notes.

### Success Response (200)
```json
{
  "data": {
    "id": "uuid",
    "reference": "RD-000001",
    "customer_name": "Jane Smith",
    "customer_email": "jane@example.com",
    "order_id": "ORD-1001",
    "item_name": "Blue Denim Jacket",
    "item_sku": "BDJ-M",
    "quantity": 1,
    "reason": "Damaged",
    "status": "Open",
    "resolution": null,
    "refund_amount": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "notes": [
      {
        "id": "uuid",
        "content": "Customer reported item arrived with torn sleeve.",
        "created_at": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

### Error Responses
- 404: Request not found or removed

---

## PATCH /api/requests/:id
Update editable fields of a request (only when not decided).

### Request Body (all fields optional, send only what you want to update)
```json
{
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "order_id": "ORD-1001",
  "item_name": "Blue Denim Jacket",
  "item_sku": "BDJ-M",
  "quantity": 2,
  "reason": "Wrong Item"
}
```

### Success Response (200)
Full updated request object.

### Error Responses
- 400: Validation error
- 404: Request not found or removed
- 409: DUPLICATE_ACTIVE_REQUEST (if order_id + item_name change creates a duplicate)
- 422: REQUEST_LOCKED (status is Approved, Rejected, or Completed)

---

## PATCH /api/requests/:id/status
Transition the status of a request.

### Request Body
```json
{
  "status": "Approved",
  "resolution": "Refund",
  "refund_amount": 49.99
}
```

For transitions to In Review or Rejected or Completed, resolution and refund_amount are not needed.
For transition to Approved, resolution is required. refund_amount required only if resolution = Refund.

### Success Response (200)
Full updated request object.

### Error Responses
- 400: Validation error (invalid status value)
- 404: Request not found or removed
- 422: INVALID_STATUS_TRANSITION
- 422: RESOLUTION_REQUIRED
- 422: REFUND_AMOUNT_REQUIRED
- 422: REFUND_AMOUNT_NOT_ALLOWED

---

## POST /api/requests/:id/notes
Add a note to a request.

### Request Body
```json
{
  "content": "Spoke with customer — confirmed item damaged on arrival."
}
```

### Success Response (201)
```json
{
  "data": {
    "id": "uuid",
    "request_id": "uuid",
    "content": "Spoke with customer — confirmed item damaged on arrival.",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

### Error Responses
- 400: Validation error (empty content)
- 404: Request not found or removed

---

## DELETE /api/requests/:id
Soft-delete a request (remove from the desk).

### Request Body
None.

### Success Response (200)
```json
{
  "message": "Request RD-000001 has been removed."
}
```

### Error Responses
- 404: Request not found or removed (already removed)
- 422: REMOVAL_NOT_ALLOWED (status is not Open or Rejected)

---

## HTTP Status Code Summary
| Code | When used |
|---|---|
| 200 | Successful GET / PATCH / DELETE |
| 201 | Successful POST (resource created) |
| 400 | Validation error (wrong types, missing required fields, invalid enum) |
| 404 | Resource not found or removed |
| 409 | Duplicate active request |
| 422 | Business rule violation (correct input, wrong state) |
| 500 | Unexpected server error |
