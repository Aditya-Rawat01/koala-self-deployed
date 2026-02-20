import axios from "axios";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function MailComponent() {
  const [emails, setEmails] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      axios.get("/monitors/settings").then((res) => {
        setEmails(res.data.alert_emails);
      });
      toast.success("Mail list fetched")
    } catch (error) {
      console.error(error);
      toast.error(
          <div className="flex flex-col">
            <span className="font-semibold">
              Failed to fetch alert mails
            </span>
            <span className="text-xs opacity-70">See console for details</span>
          </div>,
        );
    }
  }, []);

  function handleAdd() {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return;
    // avoid duplicate mails, a popup would be better here.
    if (emails.includes(trimmed)) return;
    if (emails.length >= 5) return;

    setEmails([...emails, trimmed]);
    setInput("");
  }

  function removeEmail(email: string) {
    setEmails(emails.filter((e) => e !== email));
  }

  async function handleSave() {
    try {
      await axios.put("/monitors/settings", {
        alert_emails: emails,
      });
      setOpen(false);
      toast.success("Mail added")
      
    } catch (error) {
      console.error(error)
      toast.error("Error !, Open console for more info")
    }
  }
  return (
    <div className="">
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-full  hover:bg-gray-300 dark:hover:bg-gray-700 transition text-xl w-10 h-10 flex items-center justify-center "
      >
        📬
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 w-[95vw] max-w-md p-8 rounded-2xl shadow-xl relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-gray-400 dark:hover:text-white hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-xl font-semibold mb-6 text-black dark:text-white">
              Alert Emails
            </h2>

            <div className="flex flex-wrap gap-2 mb-4">
              {emails.map((e) => (
                <div
                  key={e}
                  className=" bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white px-3 py-1.5 rounded-full flex items-center gap-2 border border-neutral-200 dark:border-neutral-7"
                >
                  <span className="text-sm">{e}</span>
                  <button
                    onClick={() => removeEmail(e)}
                    className="text-neutral-500 hover:text-red-500 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition"
              />

              <button
                onClick={handleAdd}
                disabled={emails.length >= 5}
                className="px-6 py-3 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-400 dark:text-black transition disabled:opacity-40"
              >
                Add
              </button>
            </div>
            <p className="text-sm text-gray-400">{emails.length} / 5 emails</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
