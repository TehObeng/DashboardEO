export const CURRENCIES = [
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

export const SEED_CLIENTS = [
  { id: 1, name: "Maria Santos", email: "maria@email.com", phone: "+63 912 345 6789", address: "Quezon City, Metro Manila", type: "Wedding", events: 1 },
  { id: 2, name: "ABC Corporation", email: "events@abccorp.com", phone: "+63 917 222 3333", address: "Makati, Metro Manila", type: "Corporate", events: 2 },
  { id: 3, name: "Juan dela Cruz", email: "juan@gmail.com", phone: "+63 921 888 9999", address: "Tagaytay, Cavite", type: "Birthday", events: 1 },
];
export const SEED_VENDORS = [
  { id: 1, name: "Bloom Florals", category: "Flowers & Décor", phone: "+63 912 111 2222", email: "bloom@florals.com", address: "Pasig, Metro Manila", rate: 15000, status: "Active" },
  { id: 2, name: "SoundPro Audio", category: "Sound & Lights", phone: "+63 917 333 4444", email: "sound@pro.com", address: "Mandaluyong", rate: 25000, status: "Active" },
  { id: 3, name: "Lens & Light PH", category: "Photography", phone: "+63 921 555 6666", email: "lens@light.ph", address: "BGC, Taguig", rate: 35000, status: "Active" },
  { id: 4, name: "Party Rentals Co.", category: "Equipment Rental", phone: "+63 905 777 8888", email: "party@rentals.com", address: "Caloocan", rate: 18000, status: "Active" },
];
export const SEED_WORKERS = [
  { id: 1, name: "Carlo Reyes", jobDesc: "Event Coordinator", phone: "+63 912 000 0001", email: "carlo@phoenix.com", fee: 5000, status: "Active" },
  { id: 2, name: "Liza Manalo", jobDesc: "Lights Technician", phone: "+63 912 000 0002", email: "liza@phoenix.com", fee: 3500, status: "Active" },
  { id: 3, name: "Marco Santos", jobDesc: "Sound Engineer", phone: "+63 912 000 0003", email: "marco@phoenix.com", fee: 4000, status: "Active" },
  { id: 4, name: "Ana Cruz", jobDesc: "MC / Host", phone: "+63 912 000 0004", email: "ana@phoenix.com", fee: 6000, status: "Active" },
];
export const SEED_EVENTS = [
  { id: 1, title: "Santos Wedding", client: "Maria Santos", type: "Wedding", date: "2026-06-15", venue: "Grand Ballroom, Manila Hotel", status: "Confirmed", notes: "Romantic garden theme" },
  { id: 2, title: "ABC Corp Annual Meeting", client: "ABC Corporation", type: "Corporate", date: "2026-06-28", venue: "Makati Shangri-La", status: "Planning", notes: "Need projector & PA system" },
];
export const SEED_QUOTES = [
  { id: 1, number: "001/PX/05/26", client: "Maria Santos", eventId: 1, eventTitle: "Santos Wedding", date: "2026-05-01", total: 248000, status: "Approved", items: [{ desc: "Venue Coordination", qty: 1, price: 50000 }, { desc: "Floral Arrangements", qty: 1, price: 15000 }, { desc: "Photography", qty: 1, price: 35000 }, { desc: "Sound & Lights", qty: 1, price: 25000 }, { desc: "Catering (100 pax)", qty: 100, price: 1230 }] },
  { id: 2, number: "002/PX/05/26", client: "ABC Corporation", eventId: 2, eventTitle: "ABC Corp Annual Meeting", date: "2026-05-10", total: 175000, status: "Pending", items: [{ desc: "Venue Coordination", qty: 1, price: 40000 }, { desc: "AV Equipment", qty: 1, price: 25000 }, { desc: "Catering (80 pax)", qty: 80, price: 1375 }] },
];
export const SEED_INVOICES = [
  { id: 1, number: "INV-001", client: "Maria Santos", eventId: 1, eventTitle: "Santos Wedding", date: "2026-05-15", due: "2026-06-01", total: 248000, paid: 124000, status: "Partial" },
  { id: 2, number: "INV-002", client: "Juan dela Cruz", eventId: null, eventTitle: "Birthday Party", date: "2026-05-20", due: "2026-06-20", total: 118000, paid: 0, status: "Unpaid" },
];
export const SEED_EVENT_WORKERS = [
  { id: 1, eventId: 1, workerId: 1, jobDesc: "Lead Coordinator", fee: 5000 },
  { id: 2, eventId: 1, workerId: 3, jobDesc: "Sound Engineer", fee: 4000 },
  { id: 3, eventId: 2, workerId: 2, jobDesc: "AV Technician", fee: 3500 },
];
export const SEED_PURCHASES = [
  { id: 1, eventId: 1, item: "Floral Arrangement Supplies", vendor: "Bloom Florals", date: "2026-05-20", qty: 1, price: 8000, paid: 4000, category: "Materials" },
  { id: 2, eventId: 1, item: "Sound Equipment Rental", vendor: "SoundPro Audio", date: "2026-05-22", qty: 1, price: 15000, paid: 0, category: "Equipment" },
  { id: 3, eventId: 2, item: "Projector Rental", vendor: "Party Rentals Co.", date: "2026-06-01", qty: 1, price: 5000, paid: 5000, category: "Equipment" },
];
export const DEFAULT_COMPANY = {
  name: "Phoenix Event", tagline: "Event Organizer & Multimedia",
  address: "Manila, Philippines", phone: "+63 900 000 0000",
  email: "info@phoenixevent.com", logo: null,
};
export const PURCHASE_CATS = ["Materials", "Equipment", "Catering", "Transportation", "Venue", "Labor", "Other"];
export const EVENT_TYPES = ["Wedding", "Corporate", "Birthday", "Concert", "Equipment Rental", "Other"];
export const VENDOR_CATS = ["Flowers & Décor", "Sound & Lights", "Photography", "Equipment Rental", "Catering", "Transportation", "Other"];
export const REPORT_CATEGORIES = [
  { id: "all", label: "Full Report" },
  { id: "finance", label: "Finance Detail" },
  { id: "pdr", label: "PDR & Prints" },
  { id: "events", label: "Events Breakdown" },
  { id: "transactions", label: "Transaction Breakdown" },
  { id: "purchases", label: "Purchases by Category" },
];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DEFAULT_STATE = {
  clients: SEED_CLIENTS,
  vendors: SEED_VENDORS,
  workers: SEED_WORKERS,
  events: SEED_EVENTS,
  quotes: SEED_QUOTES,
  invoices: SEED_INVOICES,
  eventWorkers: SEED_EVENT_WORKERS,
  purchases: SEED_PURCHASES,
  company: DEFAULT_COMPANY,
  currency: "IDR",
  auditLog: [],
};

export const parseMoneyInput = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const sign = raw.startsWith("-") ? -1 : 1;
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? sign * Number(digits) : "";
};
export const formatMoneyInput = (value) => {
  const parsed = typeof value === "number" ? value : parseMoneyInput(value);
  if (parsed === "" || Number.isNaN(Number(parsed))) return "";
  return Number(parsed || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });
};
export const formatCurrencyDisplay = (value) => Number(value || 0).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fc = (n, sym) => `${sym || "₱"}${formatCurrencyDisplay(n)}`;
export const formatCount = (n) => Number(n || 0).toLocaleString("id-ID");
export const fd = (d) => (d ? new Date(d).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "");
export const isEventLocked = (eventOrStatus) => ["Done", "Closed", "Finished"].includes(typeof eventOrStatus === "string" ? eventOrStatus : eventOrStatus?.status);
export const sc = (s) => ({
  Confirmed: "bg-emerald-100 text-emerald-700",
  Planning: "bg-amber-100 text-amber-700",
  Pending: "bg-orange-100 text-orange-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Partial: "bg-blue-100 text-blue-700",
  Unpaid: "bg-red-100 text-red-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Active: "bg-emerald-100 text-emerald-700",
  Done: "bg-indigo-100 text-indigo-700",
  Finished: "bg-indigo-100 text-indigo-700",
  Inactive: "bg-gray-100 text-gray-500",
  Cancelled: "bg-red-100 text-red-700",
  Voided: "bg-gray-200 text-gray-600",
}[s] || "bg-gray-100 text-gray-600");
export const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white";
export const ymd = (d = new Date()) => new Date(d).toISOString().split("T")[0];
export const docNo = (type, date, rows = []) => {
  const dt = new Date(date || ymd());
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear()).slice(-2);
  const prefix = type === "po" ? "PO/" : type === "invoice" ? "INV/" : "";
  const re = type === "po" ? /^PO\/(\d{3})\/PX\/(\d{2})\/(\d{2})$/ : type === "invoice" ? /^INV\/(\d{3})\/PX\/(\d{2})\/(\d{2})$/ : /^(\d{3})\/PX\/(\d{2})\/(\d{2})$/;
  const max = rows.reduce((m, r) => {
    const n = String(r.number || r.poNumber || "").match(re);
    return n && n[2] === mm && n[3] === yy ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}/PX/${mm}/${yy}`;
};
export const quoteDateForSequence = (quote) => quote?.generatedDate || quote?.date || quote?.eventDate || ymd();
export const quoteSequencePreview = (date, quotes = [], currentId = null) => {
  const probeId = currentId ?? "__new_quote__";
  const probe = { id: probeId, date, generatedDate: date };
  const rows = [...quotes.filter((q) => q.id !== currentId), probe];
  return renumberQuotesByMonth(rows).find((q) => q.id === probeId)?.number || docNo("quote", date, quotes);
};
export const renumberQuotesByMonth = (quotes = []) => {
  const counters = {};
  return [...quotes]
    .sort((a, b) => {
      const ad = quoteDateForSequence(a);
      const bd = quoteDateForSequence(b);
      if (ad !== bd) return String(ad).localeCompare(String(bd));
      return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    })
    .map((quote) => {
      const dt = new Date(quoteDateForSequence(quote));
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yy = String(dt.getFullYear()).slice(-2);
      const key = `${yy}-${mm}`;
      counters[key] = (counters[key] || 0) + 1;
      return { ...quote, number: `${String(counters[key]).padStart(3, "0")}/PX/${mm}/${yy}` };
    });
};
export const normalizeEventWorkerState = (eventWorkers = [], workerPayments = []) => {
  const seen = new Map();
  const idMap = new Map();
  const deduped = [];
  eventWorkers.forEach((row) => {
    const key = `${row.eventId}:${row.workerId}`;
    const kept = seen.get(key);
    if (kept) {
      idMap.set(row.id, kept.id);
      return;
    }
    seen.set(key, row);
    deduped.push(row);
  });
  return {
    eventWorkers: deduped,
    workerPayments: workerPayments.map((payment) => idMap.has(payment.eventWorkerId) ? { ...payment, eventWorkerId: idMap.get(payment.eventWorkerId) } : payment),
  };
};
export const normalizeDashboardState = (state = {}) => {
  const normalizedPurchases = (state.purchases || DEFAULT_STATE.purchases).map((p, i, rows) => normalizePurchase(p, rows.slice(0, i)));
  const workerState = normalizeEventWorkerState(state.eventWorkers || DEFAULT_STATE.eventWorkers, state.workerPayments || []);
  return {
    ...state,
    quotes: renumberQuotesByMonth(state.quotes || DEFAULT_STATE.quotes),
    purchases: normalizedPurchases,
    eventWorkers: workerState.eventWorkers,
    workerPayments: workerState.workerPayments,
  };
};
export const allPoItems = (p) => Array.isArray(p?.items) && p.items.length ? p.items : [{ id: p?.id, item: p?.item || "Purchase", description: p?.description || p?.note || p?.details || "", category: p?.category || "Materials", qty: Number(p?.qty || 1), unitPrice: Number(p?.price ?? p?.unitPrice ?? 0), status: p?.status === "Voided" ? "Voided" : "Active" }];
export const activePoItems = (p) => allPoItems(p).filter((it) => it?.status !== "Voided" && p?.status !== "Voided");
export const poItems = activePoItems;
export const purchaseQty = (p) => Number(poItems(p)[0]?.qty || 0);
export const purchasePrice = (p) => Number(poItems(p)[0]?.unitPrice ?? poItems(p)[0]?.price ?? 0);
export const poSubtotal = (p) => poItems(p).reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice ?? it.price ?? 0), 0);
export const poDiscount = (p) => Math.max(0, Number(p?.discount || 0));
export const purchaseTotal = (p) => p?.status === "Voided" ? 0 : Math.max(0, poSubtotal(p) - poDiscount(p));
export const purchasePayments = (p) => Array.isArray(p?.payments) ? p.payments : (Number(p?.paid ?? p?.paidAmount ?? 0) > 0 ? [{ id: `legacy-${p?.id}`, paymentNo: 1, label: Number(p?.paid) >= purchaseTotal(p) ? "Final Payment" : "Payment 1", date: p?.date || ymd(), amount: Number(p?.paid), status: "Active" }] : []);
export const activePurchasePayments = (p) => purchasePayments(p).filter((x) => x?.status !== "Voided");
export const purchasePaid = (p) => p?.status === "Voided" ? 0 : Math.min(purchaseTotal(p), activePurchasePayments(p).reduce((s, x) => s + Number(x.amount || 0), 0));
export const purchaseDebt = (p) => Math.max(0, purchaseTotal(p) - purchasePaid(p));
export const purchaseStatus = (p) => (p?.status === "Voided" ? "Voided" : p?.status === "Cancelled" ? "Cancelled" : purchaseDebt(p) <= 0 ? "Paid" : purchasePaid(p) > 0 ? "Partial" : "Unpaid");
export const normalizePurchase = (p, rows = []) => {
  const date = p.orderDate || p.date || ymd();
  const items = allPoItems(p).map((it, i) => ({ ...it, id: it.id || Date.now() + i, item: it.item || it.desc || "Purchase", description: it.description || it.note || it.details || "", category: it.category || p.category || "Materials", qty: Number(it.qty || 1), unitPrice: Number(it.unitPrice ?? it.price ?? 0), status: it.status || "Active" }));
  const base = { ...p, id: p.id || Date.now(), poNumber: p.poNumber || p.number || docNo("po", date, rows), eventId: Number(p.eventId) || null, vendor: p.vendor || "", orderDate: date, discount: Number(p.discount || 0), items, payments: Array.isArray(p.payments) ? p.payments : [] };
  if (!base.payments.length && Number(p.paid || 0) > 0) base.payments = [{ id: Date.now() + 11, paymentNo: 1, label: Number(p.paid) >= purchaseTotal(base) ? "Final Payment" : "Payment 1", date, amount: Number(p.paid || 0) }];
  return { ...base, status: purchaseStatus(base) };
};
