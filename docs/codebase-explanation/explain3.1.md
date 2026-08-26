# EXPLAIN 3.1 — Feature-to-Code Mapping

This document maps every feature directly to its frontend component, backend controller/service, and database query.

---

## 1. Feature Mapping Table

| Feature | Frontend File | Backend Route & Controller | Service Function | Query Function |
|---|---|---|---|---|
| **Create Return** | `client/app/requests/new/page.js` | `POST /api/requests`<br>`controllers/requests.js` | `services/requests.js`<br>`createRequest` | `queries/requests.js`<br>`insertRequest` |
| **List / Search / Filter** | `client/app/requests/page.js`<br>`components/TopBar.js` | `GET /api/requests`<br>`controllers/requests.js` | `services/requests.js`<br>`listRequests` | `queries/requests.js`<br>`findRequests` |
| **View Request & Notes** | `client/app/requests/[id]/page.js` | `GET /api/requests/:id`<br>`controllers/requests.js` | `services/requests.js`<br>`getRequestWithNotes` | `queries/requests.js`<br>`findRequestById`<br>`findNotesByRequestId` |
| **Edit Details** | `client/app/requests/[id]/page.js` | `PATCH /api/requests/:id`<br>`controllers/requests.js` | `services/requests.js`<br>`updateRequestDetails` | `queries/requests.js`<br>`updateRequest` |
| **Transition Status & Resolution** | `client/components/StatusTransitionModal.js` | `PATCH /api/requests/:id/status`<br>`controllers/requests.js` | `services/requests.js`<br>`transitionRequestStatus` | `queries/requests.js`<br>`updateRequestStatus` |
| **Add Internal Note** | `client/components/NotesSidebar.js` | `POST /api/requests/:id/notes`<br>`controllers/requests.js` | `services/requests.js`<br>`addNote` | `queries/requests.js`<br>`insertNote` |
| **Soft Delete** | `client/components/StatusTransitionModal.js` | `DELETE /api/requests/:id`<br>`controllers/requests.js` | `services/requests.js`<br>`softDeleteRequest` | `queries/requests.js`<br>`softDeleteRequest` |

---

## 2. Code Snippets for Key Features

### 1. Unique Human-Readable Reference Creation
In `server/src/queries/requests.js`:
```javascript
const sql = `
  INSERT INTO return_requests (
    reference, customer_name, customer_email, order_id, item_name, item_sku, quantity, reason
  ) VALUES (
    ('RD-' || LPAD(nextval('request_ref_seq')::text, 6, '0')),
    $1, $2, $3, $4, $5, $6, $7::return_reason
  )
  RETURNING *;
`;
```
- **Why this works**: `nextval('request_ref_seq')` fetches the next sequential integer from PostgreSQL atomically, formats it with leading zeros (`000034`), and prefixes `RD-`.

### 2. Debounced Global Search
In `client/components/TopBar.js`:
```javascript
function handleSearch(value) {
  setInputValue(value);
  clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set('search', value.trim());
        params.set('page', '1');
      } else {
        params.delete('search');
      }
      router.push(`/requests?${params.toString()}`);
    });
  }, 250);
}
```
- **Why this works**: Waits 250 milliseconds after the user stops typing before pushing the query to the URL, preventing excessive server API calls on every keystroke.
