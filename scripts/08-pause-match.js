// Pause or resume an entire match's tickets.
// Usage:
//   node scripts/08-pause-match.js          -> pause (match cancelled)
//   node scripts/08-pause-match.js unpause  -> resume
import { loadState } from "../src/state.js";
import { pauseToken, unpauseToken } from "../src/hedera/compliance.js";

const action = process.argv[2] === "unpause" ? "unpause" : "pause";
const { tokenId, keys } = loadState();
if (!tokenId || !keys?.pause) {
  throw new Error("Need tokenId and pause key in state.json");
}

const fn = action === "unpause" ? unpauseToken : pauseToken;
const result = await fn({ tokenId, pauseKeyDer: keys.pause });

if (action === "pause") {
  console.log("Match cancelled — token PAUSED:", result.status);
  console.log("No ticket for this match can be transferred while paused.");
} else {
  console.log("Match resumed — token UNPAUSED:", result.status);
  console.log("Tickets can move again.");
}