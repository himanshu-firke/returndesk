// Central API client. All fetch calls go through here.
// Base URL reads from env var so it works in dev and prod.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    // Throw an object with the server's error shape so callers can display it
    throw { status: res.status, ...data.error };
  }

  return data;
}

// ─── Requests ───────────────────────────────────────────────────────────────

export async function fetchRequests(params = {}) {
  const qs = new URLSearchParams();
  if (params.search)    qs.set('search', params.search);
  if (params.status)    qs.set('status', params.status);
  if (params.reason)    qs.set('reason', params.reason);
  if (params.sortBy)    qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
  if (params.page)      qs.set('page', params.page);
  if (params.limit)     qs.set('limit', params.limit);
  return apiFetch(`/requests?${qs.toString()}`);
}

export async function fetchRequest(id) {
  return apiFetch(`/requests/${id}`);
}

export async function createRequest(body) {
  return apiFetch('/requests', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateRequest(id, body) {
  return apiFetch(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function transitionStatus(id, body) {
  return apiFetch(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function addNote(id, content) {
  return apiFetch(`/requests/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function removeRequest(id) {
  return apiFetch(`/requests/${id}`, { method: 'DELETE' });
}
