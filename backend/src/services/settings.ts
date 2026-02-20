import db from "../db.js";

let globalAlertEmails: string[] = [];

export function loadSettings() {
  const row = db
    .prepare("SELECT alert_emails FROM settings WHERE id = 1")
    .get() as { alert_emails: string };

  globalAlertEmails = JSON.parse(row?.alert_emails || "[]");
}

// scheduler always uses the memory, so it will call this.
export function getAlertEmails() {
  return globalAlertEmails;
}

// api udpates the memory and the db, so this will be called by it.
export function updateAlertEmails(emails: string[]) {
  const normalized = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase())),
  );
  // why? because 5 are enough. 🐨 (you can update though.)
  if (normalized.length > 5) {
    throw new Error("Maximum 5 emails allowed");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!normalized.every((e) => emailRegex.test(e))) {
    throw new Error("Invalid email format");
  }

  db.prepare("UPDATE settings SET alert_emails = ? WHERE id = 1").run(
    JSON.stringify(normalized),
  );

  globalAlertEmails = normalized;
}
