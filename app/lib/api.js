export function authHeaders(accountId) {
  const headers = { "Content-Type": "application/json" };
  if (accountId) headers["X-Account-Id"] = accountId;
  return headers;
}

export async function parseJson(res) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export async function apiGet(path, accountId) {
  const res = await fetch(path, {
    cache: "no-store",
    headers: accountId ? { "X-Account-Id": accountId } : undefined,
  });
  return parseJson(res);
}

export async function apiPost(path, body, accountId, extraHeaders = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { ...authHeaders(accountId), ...extraHeaders },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function apiDelete(path, accountId) {
  const res = await fetch(path, {
    method: "DELETE",
    headers: authHeaders(accountId),
  });
  return parseJson(res);
}
