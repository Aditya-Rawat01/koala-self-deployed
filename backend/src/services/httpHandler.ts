import axios, { AxiosError } from "axios";
import type { monitorType } from "../scheduler/index.js";

export async function runHttpMonitor(monitor: monitorType, timeout: number) {
  const timeStart = Date.now();
  // timeout represents the timeout before the req need to be resolved.
  // 7 sec as grace buffer time when interval is low.
  try {
    const result = await axios({
      method: monitor.method,
      url: monitor.endpoint,
      headers: monitor.headers,
      data: monitor.body ?? undefined,
      timeout,
    });

    const latency = Date.now() - timeStart;
    return {
      success: result.status === monitor.expected_status,
      statusCode: result.status,
      error: null,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - timeStart;
    console.log("error", error as any);
    return {
      success: false,
      statusCode: (error as AxiosError).response?.status ?? null,
      error: String((error as AxiosError).message),
      latency,
    };
  }
}
