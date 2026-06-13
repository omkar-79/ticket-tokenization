import { readFileSync, writeFileSync, existsSync } from "fs";

const STATE_FILE = "state.json";

export function loadState() {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {};
}

export function saveState(updates) {
  const current = loadState();
  writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...updates }, null, 2));
}
