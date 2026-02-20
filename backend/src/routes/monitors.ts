import { Router } from "express";
import db from "../db.js";
import { getMonitorCount, register, unregister } from "../scheduler/index.js";
import { updateAlertEmails } from "../services/settings.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    running: getMonitorCount(),
  });
});

router.get("/settings", (req, res) => {
  const row = db
    .prepare("SELECT alert_emails FROM settings WHERE id = 1")
    .get() as { alert_emails: string };
  res.json({
    alert_emails: JSON.parse(row.alert_emails),
  });
});
// if moved below, then the other put req will take over. putting static req above dynamic.
router.put("/settings", (req, res) => {
  const { alert_emails } = req.body;

  if (!Array.isArray(alert_emails)) {
    return res.status(400).json({
      msg: "alert_emails must be an array",
    });
  }
  try {
    updateAlertEmails(alert_emails);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Create monitor endpoint
router.post("/", (req, res) => {
  const {
    endpoint,
    method,
    expected_status,
    interval,
    headers,
    alert_threshold,
    alert_cooldown,
    body,
  } = req.body;
  // and this as well
  const threshold =
    typeof alert_threshold === "number" && alert_threshold >= 1
      ? alert_threshold
      : 3;
  // i am not taking the alert cooldown from the frontend.
  const cooldown =
    typeof alert_cooldown === "number" && alert_cooldown >= 60000 // cooldown at least of 1 min.
      ? alert_cooldown
      : 900000;

  if (!endpoint || !method || !interval) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (
    typeof expected_status !== "number" ||
    typeof interval !== "number" ||
    interval <= 0
  ) {
    return res.status(400).json({ error: "Invalid numeric fields" });
  }

  const stmt = db.prepare(`
    INSERT INTO monitors (
    endpoint,
    method,
    expected_status,
    interval,
    headers,
    body,
    alert_threshold,
    alert_cooldown
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    endpoint,
    method,
    expected_status,
    interval,
    headers ? JSON.stringify(headers) : null,
    body ? JSON.stringify(body) : null,
    threshold,
    cooldown,
  );
  const created: any = db
    .prepare("SELECT * FROM monitors WHERE id = ?")
    .get(result.lastInsertRowid);

  register({
    ...created,
    id: Number(created.id),
    headers: created.headers ? JSON.parse(created.headers) : undefined,
    body: created.body ? JSON.parse(created.body) : undefined,
  });

  res.json({
    id: result.lastInsertRowid,
    monitor: {
      ...created,
    },
  });
});

// Get all monitors endpoint
router.get("/", (_req, res) => {
  const monitors = db
    .prepare("SELECT * FROM monitors ORDER BY created_at DESC")
    .all();
  res.json(monitors);
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const {
    endpoint,
    method,
    expected_status,
    interval,
    headers,
    body,
    alert_threshold,
    alert_cooldown,
  } = req.body;
  if (!endpoint || !method || !interval) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (
    typeof expected_status !== "number" ||
    typeof interval !== "number" ||
    interval <= 0
  ) {
    return res.status(400).json({ error: "Invalid numeric fields" });
  }

  const threshold =
    typeof alert_threshold === "number" && alert_threshold >= 1
      ? alert_threshold
      : 3;

  const cooldown =
    typeof alert_cooldown === "number" && alert_cooldown >= 60000
      ? alert_cooldown
      : 900000;

  // 1️⃣ Stop runtime first
  unregister(id);

  // 2️⃣ Update DB
  const result = db
    .prepare(
      `
    UPDATE monitors
    SET endpoint = ?, method = ?, expected_status = ?, interval = ?, headers = ?, body = ?,alert_threshold = ?, alert_cooldown = ?
    WHERE id = ?
  `,
    )
    .run(
      endpoint,
      method,
      expected_status,
      interval,
      headers ? JSON.stringify(headers) : null,
      body ? JSON.stringify(body) : null,
      threshold,
      cooldown,
      id,
    );

  if (result.changes === 0) {
    return res.status(404).json({ error: "Monitor not found" });
  }

  // 3️⃣ Fetch fresh data from DB
  const updated: any = db
    .prepare("SELECT * FROM monitors WHERE id = ?")
    .get(id);

  // 4️⃣ Re-register with DB-truth
  register({
    ...updated,
    id: Number(updated.id),
    headers: updated.headers ? JSON.parse(updated.headers) : undefined,
    body: updated.body ? JSON.parse(updated.body) : undefined,
  });

  res.json({ success: true, monitor: { ...updated } });
});

// Delete monitor endpoint
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }
  const result = db.prepare("DELETE FROM monitors WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({
      msg: "No monitor found",
    });
  }
  unregister(id);
  res.json({ success: true });
});

router.get("/:id/results", (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({
      msg: "Invalid ID",
    });
  }

  const rawLimit = Number(req.query.limit);
  const limit = Math.min(
    Math.max(rawLimit || 30, 1), // min 1
    100, // max 100
  );

  const results: any[] = db
    .prepare(
      `
      SELECT * FROM results
      WHERE monitor_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `,
    )
    .all(id, limit);

  res.json(
    results
      .map((r) => ({
        timestamp: new Date(r.timestamp).getTime(),
        latency: r.latency,
        success: r.success,
      }))
      .reverse(),
  );
});

export default router;
