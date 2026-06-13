import { existsSync, unlinkSync } from "fs";
import { DB_PATH } from "../src/db/db.js";

if (existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log("Deleted:", DB_PATH);
} else {
  console.log("No database file at:", DB_PATH);
}

console.log("Done. Restart npm run dev — operator will be re-seeded as organizer on next request.");
