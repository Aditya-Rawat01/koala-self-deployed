import axios, { AxiosError } from "axios";
import db from "../db.js";
import { broadcast } from "../events/broadcaster.js";
import { getAlertEmails } from "../services/settings.js";
import sendMail from "../services/sendMail.js";
import { startCleanupJob } from "../services/cleanup.js";
import { runHttpMonitor } from "../services/httpHandler.js";
import { runWebSocketMonitor } from "../services/wsHandler.js";

const monitorRegistry = new Map<
  number,
  { timer: NodeJS.Timeout; consecutiveFailures: number }
>();

export type monitorType = {
  id: number;
  endpoint: string;
  method: string;
  expected_status: number;
  interval: number;
  headers: Record<string, string>;
  body?: any;
  alert_threshold: number;
  alert_cooldown: number;
  last_alert_at: number | null;
};
export type MonitorResult = {
  success: boolean;
  statusCode: number | null;
  error: string | null;
  latency: number;
};

export function getMonitorCount() {
  return monitorRegistry.size;
}

export async function register(monitor: monitorType) {
  if (monitorRegistry.has(monitor.id)) {
    unregister(monitor.id);
  }
  monitorRegistry.set(monitor.id, {
    timer: undefined as unknown as NodeJS.Timeout,
    consecutiveFailures: 0,
  });

  async function execute() {
    try {
      const results = await runMonitor(monitor);
      const exists = db
        .prepare("SELECT id FROM monitors WHERE id = ?")
        .get(monitor.id);

      if (!exists) {
        return; // silently exit (why needed?) because sometimes, endpoint will be removed but the current timeout for next ping won't, so it will try to update the db with id that is deleted which will throw error.
      }
      const now = Date.now();
      db.prepare(
        `
            INSERT INTO results 
            (monitor_id, timestamp, latency, status_code, success, error)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
      ).run(
        monitor.id,
        now,
        results.latency,
        results.statusCode ?? null,
        results.success ? 1 : 0,
        results.error ?? null,
      );
      broadcast({
        monitorId: monitor.id,
        latency: results.latency,
        success: results.success,
        statusCode: results.statusCode,
        timestamp: now,
      });
      const entry = monitorRegistry.get(monitor.id);
      if (!entry) return;
      if (results.success) {
        entry.consecutiveFailures = 0;
      } else {
        entry.consecutiveFailures++;
      }

      if (
        !results.success &&
        entry.consecutiveFailures >= monitor.alert_threshold
      ) {
        const lastAlertAt = monitor.last_alert_at;
        const cooldown = monitor.alert_cooldown;
        const cooldownPassed = !lastAlertAt || now - lastAlertAt > cooldown;
        const timeZone = process.env.KOALA_TIMEZONE
        console.log("Failures:", entry.consecutiveFailures);
        console.log("Threshold:", monitor.alert_threshold);
        console.log("Last alert at:", monitor.last_alert_at ? new Date(monitor.last_alert_at).toLocaleString("en-US", {timeZone: timeZone || undefined}): "None");
        const time = (now - (monitor.last_alert_at || 0))/1000
        console.log("Next alert (in sec):", Math.max((900000 - time), 0))
        console.log("Cooldown:", monitor.alert_cooldown);
        console.log("Cooldown passed:", cooldownPassed);

        if (cooldownPassed) {
          console.warn(`🚨 ALERT TRIGGERED for monitor ${monitor.id}`);

          try {
            await sendMail({
              monitorId: monitor.id,
              endpoint: monitor.endpoint,
              latency: results.latency,
              statusCode: results.statusCode ?? null,
              failureCount: entry.consecutiveFailures,
              timestamp: now,
            });

            // Only update cooldown if mail was attempted successfully
            db.prepare(
              "UPDATE monitors SET last_alert_at = ? WHERE id = ?",
            ).run(now, monitor.id);

            monitor.last_alert_at = now;
          } catch (err) {
            console.error("❌ Email send failed:", err);
          }
        }
      }
    } catch (error) {
      console.log("💢💢 Error occurred 💢💢");
      console.log(error);
    } finally {
      const entry = monitorRegistry.get(monitor.id);
      if (!entry) return;

      entry.timer = setTimeout(execute, monitor.interval * 1000);
    }
  }
  execute();

  // then re register with new data.
}

export function unregister(id: number) {
  const entry = monitorRegistry.get(id);
  if (entry) {
    clearTimeout(entry.timer);
    monitorRegistry.delete(id);
  }
}

export function bootstrap() {
  const rows = db
    .prepare("SELECT * FROM monitors ORDER BY created_at DESC")
    .all() as any[];

  rows.forEach((entry) => {
    register({
      id: Number(entry.id),
      endpoint: entry.endpoint,
      method: entry.method,
      expected_status: entry.expected_status,
      interval: entry.interval,
      headers: entry.headers ? JSON.parse(entry.headers) : undefined,
      body: entry.body ? JSON.parse(entry.body) : undefined,
      alert_threshold: entry.alert_threshold,
      alert_cooldown: entry.alert_cooldown,
      last_alert_at: entry.last_alert_at,
    });
  });
  startCleanupJob();
}

async function runMonitor(monitor: monitorType): Promise<MonitorResult> {
  const url = new URL(monitor.endpoint);
  const protocol = url.protocol;
  const timeout = Math.min(monitor.interval * 1000 + 7000, 28000);
  if (protocol === "http:" || protocol === "https:") {
    return await runHttpMonitor(monitor, timeout);
  }

  if (protocol === "ws:" || protocol === "wss:") {
    return await runWebSocketMonitor(monitor, timeout);
  }
  return {
    success: false,
    statusCode: null,
    error: "Unsupported protocol",
    latency: 0,
  };
}

// just for cleanup in case of server shutdown.
export function stopAllMonitors() {
  for (const { timer } of monitorRegistry.values()) {
    clearTimeout(timer);
  }
  monitorRegistry.clear();
}
