import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type GraphPoint = {
  timestamp: number;
  latency: number;
  success: boolean;
};

export default function GraphModal({
  data,
  onClose,
}: {
  data: GraphPoint[];
  onClose: () => void;
}) {
  const isDark = document.documentElement.classList.contains("dark");
  const total = data.length;
  const successCount = data.filter((d) => d.success).length;
  const uptime = total ? ((successCount / total) * 100).toFixed(2) : "0";
  const avgLatency = total
    ? Math.round(data.reduce((sum, d) => sum + d.latency, 0) / total)
    : 0;

  const failures = total - successCount;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 text-black dark:text-white w-[95vw] max-w-6xl h-[85vh] rounded-xl p-1 flex flex-col">
        <div className="flex justify-between items-center sm:items-start p-4">
          <div> 
            <h2 className="text-lg font-semibold">Latency (Last 30 Checks)</h2>
            <div className="hidden sm:grid grid-cols-3 gap-4 mt-3">
              <div>
                <p className="text-xs text-neutral-400">Uptime</p>
                <p
                  className={`${
                    Number(uptime) >= 99
                      ? "text-green-500"
                      : Number(uptime) >= 95
                        ? "text-yellow-500"
                        : "text-red-500"
                  } text-lg font-semibold`}
                >
                  {uptime}%
                </p>
              </div>

              <div>
                <p className="text-xs text-neutral-400">Avg. Latency</p>
                <p
                  className={`${
                    Number(avgLatency) < 300
                      ? "text-green-500"
                      : Number(avgLatency) < 1000
                        ? "text-yellow-500"
                        : "text-red-500"
                  } text-lg font-semibold`}
                >
                  {avgLatency}ms
                </p>
              </div>

              <div>
                <p className="text-xs text-neutral-400">Failures</p>
                <p
                  className={`${
                    failures === 0
                      ? "text-green-500"
                      : failures <= 2
                        ? "text-yellow-500"
                        : "text-red-500"
                  } text-lg font-semibold`}
                >
                  {failures}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-black/80 hover:bg-black text-white dark:bg-slate-500 rounded dark:hover:bg-slate-400"
          >
            Close
          </button>

          
        </div>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 px-3 text-center sm:hidden">
              <div>
                <p className="text-xs text-neutral-400">Uptime</p>
                <p
                  className={`${
                    Number(uptime) >= 99
                      ? "text-green-500"
                      : Number(uptime) >= 95
                        ? "text-yellow-500"
                        : "text-red-500"
                  } text-lg font-semibold`}
                >
                  {uptime}%
                </p>
              </div>

              <div>
                <p className="text-xs text-neutral-400">Avg. Latency</p>
                <p
                  className={`${
                    Number(avgLatency) < 300
                      ? "text-green-500"
                      : Number(avgLatency) < 1000
                        ? "text-yellow-500"
                        : "text-red-500"
                  } text-lg font-semibold`}
                >
                  {avgLatency}ms
                </p>
              </div>

              <div>
                <p className="text-xs text-neutral-400">Failures</p>
                <p
                  className={`${
                    failures === 0
                      ? "text-green-500"
                      : failures <= 2
                        ? "text-yellow-500"
                        : "text-red-500"
                  } text-lg font-semibold`}
                >
                  {failures}
                </p>
              </div>
            </div>
        
        <div className="w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                stroke={!isDark ? "#374151" : "#e5e7eb"}
                strokeDasharray="3 3"
                opacity={isDark ? 0.15 : 0.5}
                syncWithTicks={true}
              />

              <XAxis
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
                dataKey="timestamp"
                tickFormatter={(t) => new Date(t).toLocaleTimeString()}
                tickMargin={12}
              />

              <YAxis
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
                tickFormatter={(v) => `${v}ms`}
                allowDecimals={false}
                width="auto"
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(value) => `${value ?? 0} ms`}
                labelFormatter={(label) =>
                  new Date(label as number).toLocaleTimeString()
                }
              />

              <Line
                type="monotone"
                dataKey="latency"
                stroke={!isDark ? "#22c55e" : "#16a34a"}
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;

                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={!payload.success ? 3 : 4}
                      fill={payload.success ? "none" : "white"}
                      stroke={payload.success ? "none" : "#ef4444"}
                      strokeWidth={2}
                    />
                  );
                }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
