import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./index.css";
import GraphModal from "./components/GraphModal";
import toast from "react-hot-toast";
import Modal from "./components/ModalComponent";
export type Monitor = {
  id: number;
  endpoint: string;
  method: string;
  expected_status: number;
  interval: number;
  headers: any;
  created_at: string;
  body?: any;
  // runtime fields
  success?: boolean;
  statusCode?: number | null;
  latency?: number;
};

function DashBoard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [modalMode, setModalMode] = useState<
    { type: "create" } | { type: "edit"; monitor: Monitor } | null
  >(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [graphMonitorId, setGraphMonitorId] = useState<number | null>(null);
  const [graphData, setGraphData] = useState<any[]>([]);
  const graphMonitorRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);
  useEffect(() => {
    async function fetchMonitors() {
      try {
        const res = await axios.get("/monitors");
        setMonitors(res.data);
      } catch (error) {
        console.error(error);
        toast.error(
          <div className="flex flex-col">
            <span className="font-semibold">Failed to fetch monitors</span>
            <span className="text-xs opacity-70">See console for details</span>
          </div>,
        );
      }
    }
    fetchMonitors();
  }, []);
  useEffect(() => {
    graphMonitorRef.current = graphMonitorId;
  }, [graphMonitorId]);

  useEffect(() => {
    const eventSource = new EventSource("/events");
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (graphMonitorRef.current === data.monitorId) {
        setGraphData((prev) => {
          const updated = [
            ...prev,
            {
              timestamp: data.timestamp,
              latency: data.latency,
              success: data.success,
            },
          ];
          return updated.slice(-30);
        });
      }

      setMonitors((prev) =>
        prev.map((m) =>
          m.id === data.monitorId
            ? {
                ...m,
                success: data.success,
                statusCode: data.statusCode,
                latency: data.latency,
              }
            : m,
        ),
      );
    };

    eventSource.onerror = () => {
      console.error("SSE connection lost");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (!graphMonitorId) return;
    async function fetchGraph() {
      try {
        const res = await axios.get(
          `/monitors/${graphMonitorId}/results?limit=30`,
        );
        setGraphData(res.data);
      } catch (error) {
        console.error(error);
        toast.error(
          <div className="flex flex-col">
            <span className="font-semibold">
              Failed to fetch Monitor's Graph
            </span>
            <span className="text-xs opacity-70">See console for details</span>
          </div>,
        );
      }
    }

    fetchGraph();
  }, [graphMonitorId]);

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/monitors/${id}`);
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      toast.success("Monitor Deleted");
    } catch (error) {
      console.error(error);
      toast.error(
        <div className="flex flex-col">
          <span className="font-semibold">Failed to delete Monitor</span>
          <span className="text-xs opacity-70">See console for details</span>
        </div>,
      );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-200 dark:bg-neutral-950 dark:bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#0a0a0a_70%)] text-gray-800 dark:text-white px-4 py-6 sm:px-8">
      <Modal
        modalMode={modalMode}
        setModalMode={setModalMode}
        setMonitors={setMonitors}
        theme={theme}
        setTheme={setTheme}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {monitors.map((m) => (
          <div
            key={m.id}
            className="bg-neutral-50 dark:bg-neutral-900/60 border dark:border-neutral-700/50 rounded-2xl p-5 shadow-lg hover:shadow-xl dark:hover:border-neutral-600 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span
                  className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full
              ${
                  m.success === undefined
                    ? "dark:bg-neutral-700/40 text-neutral-400"
                    : m.success
                      ? `bg-green-500/10 ${m.latency && m.latency < 300? "text-green-400": "text-yellow-400"}`
                      : "bg-red-500/10 text-red-400"
                }
              `}
                >
                  {m.success === undefined
                    ? "Waiting"
                    : m.success
                      ? `UP • ${m.latency}ms`
                      : `DOWN • ${m.statusCode ?? "Network"}`}
                </span>
              </div>

              <span className="text-xs dark:text-white">{m.interval}s</span>
            </div>
            <div className="flex flex-col justify-center w-full p-2">
              <p className="font-semibold">Method: {m.method}</p>
              <p>Endpoint: {m.endpoint}</p>
            </div>

            <div className="px-2 w-full">
              <button
                onClick={() => setGraphMonitorId(m.id)}
                className="p-2 w-full text-sm dark:text-white border-2 rounded-md hover:bg-gray-800 hover:text-white dark:hover:bg-white dark:hover:text-gray-800 transition-all duration-500"
              >
                View Graph
              </button>
            </div>
            <div className="w-full flex p-2 gap-2">
              <button
                onClick={() => setModalMode({ type: "edit", monitor: m })}
                className="p-2 w-1/2 border-2 border-yellow-400 rounded-md text-sm text-yellow-400  hover:bg-yellow-400 hover:text-white hover:scale-105 transition-all duration-500"
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(m.id)}
                className="p-2 w-1/2 border-2 border-red-500 rounded-md text-sm text-red-500 hover:bg-red-500 hover:text-white hover:scale-105 transition-all duration-500"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {graphMonitorId && (
        <GraphModal data={graphData} onClose={() => setGraphMonitorId(null)} />
      )}
    </div>
  );
}

export default DashBoard;
