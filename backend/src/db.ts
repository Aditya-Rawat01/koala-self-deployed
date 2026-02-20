import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const isDocker = process.env.DOCKER === "true";
// Ensure data directory exists
const dataDir = isDocker ? "/app/data" : path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Absolute path inside container
const dbPath = path.join(dataDir, "koala.db");

const db: Database.Database = new Database(dbPath);

export default db;
