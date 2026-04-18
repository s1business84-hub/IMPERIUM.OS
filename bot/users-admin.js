// ─────────────────────────────────────────────────────
//  Imperium OS — User Registry Viewer
//  Run: node users-admin.js
// ─────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, "users.json");

let reg = {};
try {
  reg = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
} catch {
  console.log("⚠️  No users.json found — no signups yet.");
  process.exit(0);
}

const entries    = Object.entries(reg);
const verified   = entries.filter(([, u]) => u.passwordHash);
const unverified = entries.filter(([, u]) => !u.passwordHash);

console.log("\n╔══════════════════════════════════════════════════╗");
console.log("║       IMPERIUM OS — USER REGISTRY                ║");
console.log("╚══════════════════════════════════════════════════╝\n");
console.log(`  Total signups   : ${entries.length}`);
console.log(`  Verified        : ${verified.length}  (password set)`);
console.log(`  Pending         : ${unverified.length}  (no password yet)\n`);

if (verified.length) {
  console.log("  ── REGISTERED USERS ───────────────────────────────");
  verified.forEach(([telegramId, u], i) => {
    const date = new Date(u.registeredAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const upd  = u.updatedAt
      ? new Date(u.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "—";
    console.log(`\n  ${i + 1}. ${u.name}`);
    console.log(`     Email      : ${u.email}`);
    console.log(`     Telegram ID: ${telegramId}`);
    console.log(`     Joined     : ${date} IST`);
    console.log(`     Updated    : ${upd}`);
  });
}

if (unverified.length) {
  console.log("\n  ── PENDING (signup started, no password) ──────────");
  unverified.forEach(([telegramId, u]) => {
    console.log(`  • ${u.name} — ${u.email} (ID: ${telegramId})`);
  });
}

console.log("\n══════════════════════════════════════════════════════\n");
