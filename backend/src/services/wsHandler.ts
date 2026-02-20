import WebSocket from "ws";
import type { MonitorResult, monitorType } from "../scheduler/index.js";

export async function runWebSocketMonitor(
  monitor: monitorType,
  timeout: number,
): Promise<MonitorResult> {
  const timeStart = Date.now();

  return new Promise((resolve) => {
    const ws = new WebSocket(monitor.endpoint);

    const timer = setTimeout(() => {
      ws.terminate();
      resolve({
        success: false,
        statusCode: null,
        error: "Connection timeout",
        latency: Date.now() - timeStart,
      });
    }, timeout);

    ws.on("open", () => {
      clearTimeout(timer);
      ws.close();
      resolve({
        success: true,
        statusCode: null,
        error: null,
        latency: Date.now() - timeStart,
      });
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        statusCode: null,
        error: String(err.message),
        latency: Date.now() - timeStart,
      });
    });
  });
}
