import db from "../db.js";

const MAX_RESULTS = 10000;

let cleanupInterval: NodeJS.Timeout | null = null;

export function startCleanupJob() {
  // run once on startup
  cleanup();

  // then every 24 hours
  cleanupInterval = setInterval(
    () => {
      cleanup();
    },
    24 * 60 * 60 * 1000,
  );
}

function cleanup() {
  console.log("Daily cleanup is being done!!");
  const monitors: any = db.prepare("SELECT id FROM monitors").all();

  for (const monitor of monitors) {
    db.prepare(
      `
      DELETE FROM results
      WHERE monitor_id = ?
      AND id NOT IN (
        SELECT id FROM results
        WHERE monitor_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      )
    `,
    ).run(monitor.id, monitor.id, MAX_RESULTS);
  }
}

export function stopCleanupJob() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
