import { useEffect, useRef, useState } from "react";
import MailComponent from "./mailComponent";
import type { Monitor } from "../Dashboard";
import toast from "react-hot-toast";
import axios from "axios";


export default function Modal({
  modalMode,
  setModalMode,
  setMonitors,
  theme,
  setTheme,
}: {
  modalMode: { type: "create" } | { type: "edit"; monitor: Monitor } | null;
  setModalMode: React.Dispatch<
    React.SetStateAction<
      { type: "create" } | { type: "edit"; monitor: Monitor } | null
    >
  >;
  setMonitors: React.Dispatch<React.SetStateAction<Monitor[]>>;
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
}) {
  const isEdit = modalMode?.type === "edit";
  const monitor = isEdit ? modalMode.monitor : null;
  const [protocol, setProtocol] = useState("https");
  const [host, setHost] = useState("");
  const [method, setMethod] = useState("GET");
  const [expectedStatus, setExpectedStatus] = useState("");
  const [headers, setHeaders] = useState("");
  const [body, setBody] = useState("");
  const isWebSocket = protocol === "ws" || protocol === "wss";
  const [interval, setInterval] = useState("");
  useEffect(() => {
    if (isEdit && monitor) {
      try {
        const url = new URL(monitor.endpoint);
        setProtocol(url.protocol.replace(":", ""));
        setHost(url.host + url.pathname);
        setInterval(monitor.interval.toString());
        setMethod(monitor.method);
        setExpectedStatus(monitor.expected_status? monitor.expected_status.toString() : "");
        setHeaders(monitor.headers ? monitor.headers : "");
        setBody(monitor.body ? monitor.body : "");
      } catch {
        setProtocol("https");
        setHost("");
      }

      setInterval(monitor.interval.toString());
    } else {
      setHost("");
      setBody("");
      setHeaders("");
      setInterval("");
      setExpectedStatus("")
    }
  }, [modalMode]);

  const handleSave = async () => {
    let endpoint: string;

    try {
      endpoint = `${protocol}://${host}`;
      new URL(endpoint);
    } catch {
      toast.error("Invalid Endpoint URL");
      return;
    }
    const parsedInterval = Number(interval);
    const parsedExpectedStatus = Number(expectedStatus || 200);
    if (parsedInterval < 5) {
      toast.error("Minimum interval is 5 seconds");
      return;
    }
    let parsedHeaders = undefined;
    let parsedBody = undefined;
    try {
      if (headers.trim()) {
        parsedHeaders = JSON.parse(headers);
      }
    } catch {
      toast.error("Invalid Headers JSON");
      return;
    }
    try {
      if (body.trim()) {
        parsedBody = JSON.parse(body);
      }
    } catch {
      toast.error("Invalid Body JSON");
      return;
    }
    if (isEdit && monitor) {
      try {
        const res = await axios.put(`/monitors/${monitor.id}`, {
          endpoint,
          method,
          expected_status: isWebSocket ? 0 : parsedExpectedStatus,
          interval: parsedInterval,
          headers: parsedHeaders,
          body: parsedBody,
        });
        setMonitors((prev) =>
          prev.map((m) => (m.id === monitor.id ? res.data.monitor : m)),
        );
        toast.success("Monitor edited");
      } catch (error) {
        console.error(error);
        toast.error(
          <div className="flex flex-col">
            <span className="font-semibold">
              Failed to edit Monitor
            </span>
            <span className="text-xs opacity-70">See console for details</span>
          </div>,
        );
      }
    } else {
      try {
        const res = await axios.post("/monitors", {
          endpoint,
          method,
          expected_status: isWebSocket ? 0 : parsedExpectedStatus,
          interval: parsedInterval,
          headers: parsedHeaders,
          body: parsedBody,
        });

        setMonitors((prev) => [res.data.monitor, ...prev]);
        toast.success("Monitor created");
      } catch (error) {
        console.error(error);
        toast.error(
          <div className="flex flex-col">
            <span className="font-semibold">
              Failed to create Monitor
            </span>
            <span className="text-xs opacity-70">See console for details</span>
          </div>,
        );
      }
    }

    setModalMode(null);
  };
  return (
    <div className="h-full w-full flex items-center justify-between mb-6">
      <div className="flex gap-2 items-center">
        <h1 className="text-3xl font-bold">Koala </h1>
        <h1 className="text-3xl">🐨</h1>
      </div>
      <div className="flex gap-2 items-center">
        <button
          onClick={() =>
            setTheme((prev) => (prev === "dark" ? "light" : "dark"))
          }
          className="py-2 px-3 rounded-full w-10 h-10 flex items-center justify-center transition hover:bg-gray-300 dark:hover:bg-gray-700"
        >
          {theme == "light" ? "🌕" : "☀️"}
        </button>
        <MailComponent />
        <button
          onClick={() => setModalMode({ type: "create" })}
          className="bg-gray-800 dark:bg-white dark:text-gray-800 text-white px-4 py-2 rounded hidden md:block"
        >
          + Add Monitor
        </button>

        <button
          className="md:hidden justify-center fixed bottom-6 right-6 bg-gray-800 text-white dark:bg-white dark:text-gray-800 w-16 h-16 text-4xl rounded-full shadow-md shadow-neutral-800"
          onClick={() => setModalMode({ type: "create" })}
        >
          +
        </button>
      </div>

      {modalMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto p-8 rounded-2xl shadow-xl flex flex-col gap-4">
            <h2 className="text-lg font-semibold mb-4">
              {modalMode.type == "edit" ? "Edit Monitor" : "Add Monitor"}
            </h2>
            {(protocol == "http" || protocol == "https") && <MethodDropdown
              value={method}
              options={["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]}
              onChange={(val) => setMethod(val)}
              className="relative w-full"
            />}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-2">
              <MethodDropdown
                value={protocol}
                options={["http", "https", "ws", "wss"]}
                onChange={(val) => setProtocol(val)}
                className="relative w-full sm:w-40"
              />

              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="api.example.com"
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition"
              />
            </div>

            <input
              placeholder="Interval (seconds)"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={interval}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition"
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*$/.test(value)) {
                  setInterval(value);
                }
              }}
            />
            {!isWebSocket && (
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={expectedStatus}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    setExpectedStatus(value);
                  }
                }}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition"
                placeholder="Expected Status (e.g. 200) (Optional)"
              />
            )}
            <textarea
              value={headers}
              onChange={(e) => {
                setHeaders(e.target.value);
              }}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition"
              placeholder="Headers JSON (optional)"
            />
            {!["GET", "HEAD"].includes(method) && (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition"
                placeholder="Body JSON (optional)"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalMode(null)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={!host.trim() || !interval || Number(interval) < 5}
                className={`px-3 py-1 rounded ${
                  !host.trim() || !interval || Number(interval) < 5
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-gray-800 dark:bg-white dark:text-gray-800 text-white"
                }`}
              >
                {isEdit ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function MethodDropdown({
  value,
  className,
  options,
  onChange,
}: {
  value: string;
  className: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={className}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition"
      >
        {value}
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
          absolute mt-2 w-full
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-700
          rounded-lg
          shadow-lg
          z-50
        "
        >
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`
                w-full text-left px-4 py-2
                hover:bg-neutral-100 dark:hover:bg-neutral-800
                transition
                ${value === option ? "font-semibold" : ""}
              `}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
