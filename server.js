const express = require("express");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = Number(process.env.PORT || 4192);
const BASE = process.env.BASE_PATH || "/dashboardeo";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "state.json");
const DB_FILE = process.env.SQLITE_FILE || path.join(DATA_DIR, "dashboardeo.sqlite");
const DIST = path.join(__dirname, "dist");
const ZZSHU_API_KEY = process.env.ZZSHU_API_KEY;
const ZZSHU_BASE_URL = process.env.ZZSHU_BASE_URL || "https://zzshu.cc";
const ZZSHU_MODEL = process.env.ZZSHU_MODEL || "gpt-5.4-mini";

fs.mkdirSync(DATA_DIR, { recursive: true });
app.use(express.json({ limit: "50mb" }));

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS document_sequences (
  doc_type TEXT NOT NULL,
  year_month TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (doc_type, year_month)
);
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY,
  po_number TEXT UNIQUE,
  event_id INTEGER,
  vendor TEXT,
  order_date TEXT,
  discount REAL NOT NULL DEFAULT 0,
  status TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  category TEXT,
  qty REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS purchase_payments (
  id INTEGER PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL,
  payment_no INTEGER NOT NULL,
  label TEXT NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  UNIQUE (purchase_order_id, payment_no)
);
`);

function readJsonFileState() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function readState() {
  const row = db.prepare("SELECT state_json, updated_at FROM app_state WHERE id = 1").get();
  if (row) return { state: JSON.parse(row.state_json), updatedAt: row.updated_at };
  const legacy = readJsonFileState();
  const state = legacy.state || legacy || {};
  writeState(state);
  return { state, updatedAt: new Date().toISOString(), migratedFrom: fs.existsSync(DATA_FILE) ? DATA_FILE : null };
}
function writeState(state) {
  const updatedAt = new Date().toISOString();
  const json = JSON.stringify(state || {});
  db.prepare(`INSERT INTO app_state (id, state_json, updated_at) VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at`).run(json, updatedAt);
  const payload = { state, updatedAt };
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, DATA_FILE);
  return payload;
}
function money(n) { return Math.max(1000, Math.round(Number(n || 0) / 1000) * 1000); }
function fallbackQuote({ eventType = "Event", guestCount = 100, budget = "", notes = "" } = {}, source = "fallback") {
  const cap = Number(budget) > 0 ? Number(budget) : Number(guestCount) * 220000;
  const coordination = money(cap * 0.22);
  const production = money(cap * 0.18);
  const catering = money(cap * 0.42 / Math.max(1, Number(guestCount)));
  const decor = money(cap * 0.10);
  const contingency = money(cap * 0.08);
  const items = [
    { desc: `${eventType} planning and coordination`, qty: 1, price: coordination },
    { desc: "Sound, lighting, and technical production", qty: 1, price: production },
    { desc: `Catering package (${guestCount} pax)`, qty: Number(guestCount), price: catering },
    { desc: "Decor, staging, and styling", qty: 1, price: decor },
    { desc: "Logistics and contingency", qty: 1, price: contingency },
  ];
  const total = items.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);
  return { source, items, total, suggestions: [source === "fallback" ? "GPT not configured or unavailable; formula estimator used." : "Generated with GPT quote assistant.", "Review venue restrictions before final costing.", "Lock vendor schedule after down payment.", notes ? `Client notes considered: ${String(notes).slice(0, 120)}` : "Add client notes for a tighter estimate."] };
}
function validateQuote(payload) {
  const items = Array.isArray(payload?.items) ? payload.items.map((it) => ({
    desc: String(it.desc || it.description || "Service").slice(0, 160),
    qty: Math.max(1, Number(it.qty || 1)),
    price: money(it.price || 0),
  })).filter((it) => it.desc && it.price >= 0).slice(0, 20) : [];
  if (!items.length) throw new Error("no valid quote items");
  const total = items.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);
  const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions.map(String).slice(0, 5) : [];
  return { source: "gpt", items, total, suggestions };
}

app.get(`${BASE}/api/health`, (_req, res) => res.json({ ok: true, app: "DashboardEO", base: BASE, dataFile: DATA_FILE, sqlite: true, dbFile: DB_FILE }));
app.get(`${BASE}/api/state`, (_req, res) => res.json(readState()));
app.put(`${BASE}/api/state`, (req, res) => {
  if (!req.body || typeof req.body.state !== "object") return res.status(400).json({ ok: false, error: "state object required" });
  res.json({ ok: true, ...writeState(req.body.state) });
});
app.post(`${BASE}/api/ai-quote`, async (req, res) => {
  const form = req.body || {};
  if (!ZZSHU_API_KEY) return res.json(fallbackQuote(form));
  try {
    const response = await fetch(`${ZZSHU_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ZZSHU_API_KEY}` },
      body: JSON.stringify({
        model: ZZSHU_MODEL,
        messages: [
          { role: "system", content: "You are an Indonesian event organizer finance assistant. Return strict JSON only: {\"items\":[{\"desc\":string,\"qty\":number,\"price\":integer}],\"suggestions\":[string]}. Use IDR rupiah integers rounded to nearest 1000. No markdown." },
          { role: "user", content: JSON.stringify({ eventType: form.eventType || "Event", guestCount: Number(form.guestCount || 100), budget: form.budget || "", notes: form.notes || "", locale: "Indonesia", currency: "IDR" }) }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "{}";
    res.json(validateQuote(JSON.parse(text)));
  } catch (err) {
    res.json(fallbackQuote(form, "fallback"));
  }
});

app.use(BASE, express.static(DIST, { index: false }));
app.use((req, res, next) => {
  if (!req.path.startsWith(BASE)) return next();
  if (req.path.includes("/api/")) return next();
  res.sendFile(path.join(DIST, "index.html"));
});
app.get("/", (_req, res) => res.redirect(BASE + "/"));

app.listen(PORT, "127.0.0.1", () => console.log(`DashboardEO listening on http://127.0.0.1:${PORT}${BASE}/`));
