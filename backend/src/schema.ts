import db from "./db.js";

export function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      expected_status INTEGER NOT NULL,
      interval INTEGER NOT NULL,
      headers TEXT,
      body TEXT,
      alert_threshold INTEGER DEFAULT 3,
      alert_cooldown INTEGER DEFAULT 900000,
      last_alert_at INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitor_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      latency INTEGER NOT NULL,
      status_code INTEGER,
      success BOOLEAN NOT NULL,
      error TEXT,
      FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_results_monitor_timestamp
      ON results(monitor_id, timestamp DESC);
      
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      alert_emails TEXT NOT NULL DEFAULT '[]'
    );

    INSERT OR IGNORE INTO settings (id)
    VALUES (1);
  `);

  console.log("SQLite schema initialized.");
}
