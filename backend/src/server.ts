import express from "express";
import { initializeSchema } from "./schema.js";
import db from "./db.js";
import monitorRoutes from "./routes/monitors.js";
import { bootstrap } from "./scheduler/index.js";
import eventsRouter from "./routes/events.js";
import { loadSettings } from "./services/settings.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

initializeSchema();
loadSettings();
bootstrap();

app.use("/monitors", monitorRoutes);
app.use("/events", eventsRouter);

app.get("/health", (req, res) => {
  res.json({
    msg: "Koala backend healthy! 🐨 ",
  });
});

// just a debug endpoint to check the db.
app.get("/debug/tables", (_req, res) => {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table';")
    .all();

  res.json(tables);
});

// testing endpoint (for debugging/trying)
app.post("/post", (req, res) => {
  console.log(req.headers);
  console.log(req.body);
  return res.json({
    msg: "hello world",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started at port: ${PORT}`);
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve React build
app.use(express.static(path.join(__dirname, "../public")));

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});
