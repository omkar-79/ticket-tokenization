"use client";

const KEY = "ticket_account_id";
export const AUTH_EVENT = "ticket-auth-changed";

function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function getStoredAccountId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setStoredAccountId(accountId) {
  localStorage.setItem(KEY, accountId);
  notifyAuthChange();
}

export function clearStoredAccountId() {
  localStorage.removeItem(KEY);
  notifyAuthChange();
}
