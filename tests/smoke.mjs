import { chromium } from "playwright";

const base = process.env.SMOKE_URL || "http://127.0.0.1:4192/dashboardeo/";
const stateUrl = base.replace(/\/$/, "") + "/api/state";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", err => errors.push(err.message));

async function api(path = stateUrl, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}
async function nav(label, expected = label) {
  await page.locator("button").filter({ hasText: label }).first().click();
  await page.waitForTimeout(150);
  await page.getByText(expected, { exact: false }).first().waitFor({ state: "visible", timeout: 5000 });
}
async function bodyIncludes(text, p = page) {
  await p.waitForFunction((needle) => document.body.innerText.includes(needle), text, { timeout: 7000 });
}
async function selectByIndex(locator, index) {
  await locator.selectOption({ index });
}

const originalState = await api();
try {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Dashboard", { timeout: 15000 });

  // Dashboard count must not be formatted as money; IDR money must use Indonesian banking separators.
  const dashboardText = await page.locator("body").innerText();
  if (/Rp\s*\d+[,.]00\s*Total Events/i.test(dashboardText)) throw new Error("Total Events still formatted as currency");
  if (!/Rp\d{1,3}(\.\d{3})+,\d{2}/.test(dashboardText)) throw new Error("IDR format must use . for thousands and ,00 decimals");

  // Dashboard controls must be clickable shortcuts into detail surfaces.
  await page.getByRole("button", { name: /^Events\s+\d+/i }).first().click();
  await page.getByText("Event Filters Summary", { exact: false }).first().waitFor({ state: "visible", timeout: 5000 });
  await nav("Dashboard");
  await page.getByRole("button", { name: /Outstanding/i }).first().click();
  await page.getByText("Invoices", { exact: false }).first().waitFor({ state: "visible", timeout: 5000 });
  await nav("Dashboard");

  const labels = ["Events", "Quotations", "Invoices", "Purchases", "Finance", "Reports", "Clients", "Vendors", "Workers", "Settings"];
  for (const label of labels) await nav(label, label === "Vendors" ? "Vendors & Suppliers" : label);

  await nav("Quotations");
  await page.getByRole("button", { name: /New Quote/ }).click();
  await page.waitForSelector("text=New Quotation", { timeout: 5000 });
  await page.locator('select').first().selectOption({ index: 1 });
  await page.getByLabel("Generated Date").fill("2026-06-01");
  await page.getByLabel("Event Date").fill("2026-06-20");
  await page.locator('input[placeholder="e.g. Santos Wedding"]').fill("E2E Smoke Event");
  await page.getByLabel("Quotation Description").fill("E2E smoke quotation description");
  await page.getByLabel("Quote Discount").fill("0");
  await page.locator('input[placeholder="Service"]').first().fill("E2E Sales Item A");
  await page.locator("tbody tr").nth(0).locator('input[type="number"]').fill("1");
  await page.locator("tbody tr").nth(0).locator('input[inputmode="numeric"]').fill("100000");
  await page.getByRole("button", { name: /Add Item/ }).click();
  await page.locator('input[placeholder="Service"]').nth(1).fill("E2E Sales Item B");
  await page.locator("tbody tr").nth(1).locator('input[type="number"]').fill("1");
  await page.locator("tbody tr").nth(1).locator('input[inputmode="numeric"]').fill("50000");
  await page.getByRole("button", { name: /Save Quotation/ }).click();
  await page.waitForSelector("text=E2E smoke quotation description", { timeout: 5000 });
  await bodyIncludes("Rp150.000,00");
  await nav("Quotations");
  await page.locator('div.bg-white.rounded-2xl').filter({ hasText: 'E2E smoke quotation description' }).first().getByRole("button", { name: /Create PO/ }).first().click();
  await page.waitForSelector("text=Purchase Order Baru", { timeout: 5000 });
  await page.getByRole("button", { name: /Save PO/ }).click();
  await bodyIncludes("Pilih vendor untuk setiap item");
  await selectByIndex(page.getByLabel("Vendor Item 1"), 1);
  await selectByIndex(page.getByLabel("Vendor Item 2"), 2);
  await page.getByRole("button", { name: /Save PO/ }).click();
  await bodyIncludes("2 PO dibuat");
  await bodyIncludes("E2E Sales Item A");
  await bodyIncludes("E2E Sales Item B");
  await page.waitForTimeout(800);
  let stateAfterPO = (await api()).state || {};
  const smokePOs = (stateAfterPO.purchases || []).filter(p => (p.items || []).some(i => String(i.item || "").startsWith("E2E Sales Item")));
  if (smokePOs.length !== 2) throw new Error(`Expected 2 vendor-split POs, got ${smokePOs.length}`);
  if (new Set(smokePOs.map(p => p.vendor)).size !== 2) throw new Error("Vendor split did not create one PO per vendor");

  await nav("Purchases");
  await page.getByPlaceholder("Search PO, vendor, item, event").fill("E2E Sales Item A");
  await page.getByRole("button", { name: /^Payment$/ }).first().click();
  await page.getByLabel(/Payment Amount/i).fill("40000");
  await page.getByRole("button", { name: /^Save Payment$/ }).click();
  await bodyIncludes("Payment 1: Rp40.000,00");
  await page.getByRole("button", { name: /^Payment$/ }).first().click();
  await page.getByRole("button", { name: /^Edit Payment 1$/ }).click();
  await page.getByLabel(/Edit Payment Amount/i).fill("50000");
  await page.getByRole("button", { name: /^Save Payment Edit$/ }).click();
  await bodyIncludes("Payment 1: Rp50.000,00");
  await page.getByRole("button", { name: /^Payment$/ }).first().click();
  await page.getByRole("button", { name: /^Void Payment 1$/ }).click();
  await bodyIncludes("Voided");

  await nav("Invoices");
  await page.getByRole("button", { name: /New Invoice/ }).click();
  await page.waitForSelector("text=New Invoice", { timeout: 5000 });
  await page.getByLabel("Client", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Total").fill("300000");
  await page.getByRole("button", { name: /Save/ }).click();
  await page.getByRole("button", { name: /Add Payment/ }).first().click();
  await page.getByLabel("Invoice Payment Amount").fill("100000");
  await page.getByRole("button", { name: /Save Payment/ }).click();
  await page.waitForSelector("text=Invoice Payment 1", { timeout: 5000 });
  await page.getByRole("button", { name: /Add Payment/ }).first().click();
  await page.getByLabel("Invoice Payment Amount").fill("200000");
  await page.getByRole("button", { name: /Save Payment/ }).click();
  await page.waitForSelector("text=Final Invoice Payment", { timeout: 5000 });

  await nav("Events");
  await page.waitForSelector("text=Event Filters Summary", { timeout: 5000 });
  if (await page.getByText("Event Schedule Table", { exact: true }).count()) throw new Error("Legacy wide Event Schedule Table still rendered");
  await page.getByLabel("Sort by Date").selectOption("desc");
  await page.getByLabel("From Date").fill("2026-06-01");
  await page.getByLabel("To Date").fill("2026-12-31");
  await page.getByPlaceholder("Search events").fill("E2E Smoke Event");
  const e2eEventCard = page.locator('div.space-y-4 > div.bg-white.rounded-2xl').filter({ hasText: "E2E Smoke Event" }).first();
  await e2eEventCard.waitFor({ state: "visible", timeout: 5000 });
  await e2eEventCard.getByRole("button", { name: /^Quotation$/ }).click();
  await bodyIncludes("Rincian Quotation");
  await bodyIncludes("E2E Sales Item A");
  await e2eEventCard.getByRole("button", { name: /^Purchase$/ }).click();
  await bodyIncludes("Rincian Purchase");
  await bodyIncludes("Payment 1");

  for (const label of ["Clients", "Vendors", "Workers"]) {
    await nav(label, label === "Vendors" ? "Vendors & Suppliers" : label);
    await page.getByPlaceholder(new RegExp(`Search ${label === "Vendors" ? "vendors" : label.toLowerCase()}`)).fill("zz-no-match");
    await page.waitForSelector("text=No results", { timeout: 5000 });
    await page.getByPlaceholder(new RegExp(`Search ${label === "Vendors" ? "vendors" : label.toLowerCase()}`)).fill("");
    await bodyIncludes(label === "Workers" ? "PAID" : "ACTIONS");
  }

  await nav("Workers");
  await page.waitForSelector("text=Worker Payables", { timeout: 5000 });
  await bodyIncludes("PENDING");
  await page.getByPlaceholder(/Search workers/i).fill("Liza");
  await page.waitForSelector("text=Liza Manalo", { timeout: 5000 });
  await page.getByRole("button", { name: /Pay Worker/ }).first().click();
  await page.getByLabel("Worker Payment Amount").fill("1000");
  await page.getByRole("button", { name: /Save Worker Payment/ }).click();
  await page.waitForSelector("text=Worker Payment 1", { timeout: 5000 });
  await bodyIncludes("PAID");
  await bodyIncludes("PENDING");

  await nav("Purchases");
  await page.waitForSelector("text=PO No.", { timeout: 3000 });
  await page.waitForSelector("text=Vendor", { timeout: 3000 });
  await page.waitForSelector("text=Payment Details", { timeout: 3000 });
  await page.getByRole("button", { name: /New PO|Add Purchase/ }).click();
  await page.waitForSelector("text=Purchase Order Baru", { timeout: 3000 });
  await page.getByLabel("Event", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Item 1", { exact: true }).fill("Smoke Decor Package");
  await page.getByLabel(/Qty 1/i).fill("2");
  await page.getByLabel(/Unit Price 1/i).fill("100000");
  await page.getByLabel("Vendor Item 1").selectOption({ index: 1 });
  await page.getByLabel(/Vendor Discount/i).fill("25000");
  await page.getByRole("button", { name: /Add Item/ }).click();
  await page.getByLabel("Item 2", { exact: true }).fill("PO Delete Probe");
  await page.getByRole("button", { name: /^Delete Item 2$/ }).click();
  const deleteProbeStillVisible = await page.locator("input").evaluateAll(nodes => nodes.some(n => n.value === "PO Delete Probe"));
  if (deleteProbeStillVisible) throw new Error("PO item delete did not remove item row");
  await page.getByRole("button", { name: /Add Item/ }).click();
  await page.getByLabel("Item 2", { exact: true }).fill("Smoke Lighting");
  await page.getByLabel(/Qty 2/i).fill("1");
  await page.getByLabel(/Unit Price 2/i).fill("50000");
  await page.getByLabel("Vendor Item 2").selectOption({ index: 1 });
  await page.getByRole("button", { name: /Save PO/ }).click();
  await page.waitForSelector("text=PO/", { timeout: 5000 });
  await page.waitForSelector("text=Smoke Decor Package", { timeout: 5000 });
  await page.getByPlaceholder("Search PO, vendor, item, event").fill("Smoke Decor Package");
  await bodyIncludes("Rp225.000,00");
  await page.getByRole("button", { name: /^Payment$/ }).first().click();
  await page.getByLabel(/Payment Amount/i).fill("100000");
  await page.getByRole("button", { name: /^Save Payment$/ }).click();
  await bodyIncludes("Payment 1: Rp100.000,00");
  await page.getByRole("button", { name: /^Payment$/ }).first().click();
  await page.getByLabel(/Payment Amount/i).fill("125000");
  await page.getByRole("button", { name: /^Save Payment$/ }).click();
  await bodyIncludes("Final Payment: Rp125.000,00");
  await page.waitForSelector("text=Paid", { timeout: 5000 });
  await page.getByRole("button", { name: /Print PO/ }).first().click();
  await page.waitForSelector("text=PESANAN PEMBELIAN", { timeout: 5000 });
  await page.getByRole("button", { name: /Print \/ Save PDF/ }).waitFor({ state: "visible", timeout: 5000 });
  await page.locator(".print-document").filter({ hasText: "Smoke Decor Package" }).first().waitFor({ state: "visible", timeout: 5000 });
  await page.locator("button").filter({ hasText: "×" }).last().click();
  await page.waitForSelector("text=PESANAN PEMBELIAN", { state: "hidden", timeout: 5000 });

  await page.waitForTimeout(1200);
  const stateAfter = await api();
  const state = stateAfter.state || {};
  const itemNames = (state.items || []).map(i => i.name || i.desc || i.item);
  if (!itemNames.includes("E2E Sales Item A") || !itemNames.includes("Smoke Decor Package")) throw new Error("Item catalog missing sales/purchase items");

  await nav("Finance");
  await page.getByRole("button", { name: /^Invoiced$/ }).click();
  await bodyIncludes("CONTRACTED INVOICE DETAIL");
  await page.getByRole("button", { name: /^Costs$/ }).click();
  await bodyIncludes("PURCHASE CATEGORY COSTS");
  await bodyIncludes("WORKER PAYROLL COSTS");
  await page.getByPlaceholder("Search audit log").fill("po.create");
  await page.locator(".rounded-xl.bg-gray-50").filter({ hasText: "po.create" }).first().waitFor({ state: "visible", timeout: 5000 });
  await page.getByLabel("Audit action filter").selectOption("po.create");
  await page.getByText("PO dibuat", { exact: false }).first().waitFor({ state: "visible", timeout: 5000 });
  await page.getByLabel("Audit sort").selectOption("oldest");

  await nav("Reports");
  await page.getByLabel("Report Category").waitFor({ state: "visible", timeout: 5000 });
  const reportCategorySelects = await page.getByLabel("Report Category").count();
  if (reportCategorySelects !== 1) throw new Error(`Expected one Report Category selector, got ${reportCategorySelects}`);
  const legacyReportButtons = await page.locator("button").filter({ hasText: /^Purchases by Category$/ }).count();
  if (legacyReportButtons) throw new Error("Legacy report category button grid still rendered");
  await page.getByLabel("Report Category").selectOption("purchases");
  await page.getByRole("heading", { name: /^Purchases by Category$/ }).waitFor({ state: "visible", timeout: 5000 });
  await bodyIncludes("Smoke Decor Package");
  await page.getByRole("button", { name: /Print Selected Report/ }).click();
  await page.locator(".print-document").filter({ hasText: "DashboardEO Report — Purchases by Category" }).first().waitFor({ state: "visible", timeout: 5000 });
  await page.locator(".print-document").filter({ hasText: "Smoke Decor Package" }).first().waitFor({ state: "visible", timeout: 5000 });
  await page.getByRole("button", { name: /Print \/ Save PDF/ }).waitFor({ state: "visible", timeout: 5000 });
  await page.locator("button").filter({ hasText: "×" }).last().click();
  await page.waitForSelector("text=DashboardEO Report — Purchases by Category", { state: "hidden", timeout: 5000 });

  const lockId = Date.now() + 900000;
  const lockClient = state.clients?.[0]?.name || "Maria Santos";
  const lockedWorker = { id: lockId + 3, name: "E2E Locked Worker", jobDesc: "Locked Worker", phone: "", email: "", fee: 1000, status: "Active" };
  const lockedState = {
    ...state,
    workers: [lockedWorker, ...(state.workers || [])],
    eventWorkers: [{ id: lockId + 4, eventId: lockId, workerId: lockedWorker.id, jobDesc: "Locked Worker Fee", fee: 1000 }, ...(state.eventWorkers || [])],
    events: [{ id: lockId, title: "E2E Locked Event", client: lockClient, date: "2026-06-30", status: "Done", type: "Wedding", venue: "QA Hall" }, ...(state.events || [])],
    quotes: [{ id: lockId + 1, number: "Q/LOCK/E2E", eventId: lockId, eventTitle: "E2E Locked Event", client: lockClient, date: "2026-06-01", eventDate: "2026-06-30", description: "E2E locked quote", items: [{ id: 1, desc: "Locked Package", qty: 1, price: 1000 }], total: 1000, status: "Approved" }, ...(state.quotes || [])],
    invoices: [{ id: lockId + 2, number: "INV/LOCK/E2E", eventId: lockId, eventTitle: "E2E Locked Event", client: lockClient, date: "2026-06-02", due: "2026-06-15", total: 1000, paid: 1000, status: "Paid", items: [{ id: 1, desc: "Locked Package", note: "Locked invoice item", qty: 1, price: 1000 }] }, ...(state.invoices || [])]
  };
  await api(stateUrl, { method: "PUT", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ state: lockedState }) });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Dashboard", { timeout: 15000 });
  await nav("Events");
  const lockedCard = page.locator('div.space-y-4 > div.bg-white.rounded-2xl').filter({ hasText: "E2E Locked Event" }).first();
  await lockedCard.getByRole("button", { name: /^Purchase$/ }).click();
  await lockedCard.getByText("Locked", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
  const lockedCreatePO = lockedCard.getByRole("button", { name: /^Create PO$/ }).first();
  if (!(await lockedCreatePO.isDisabled())) throw new Error("Locked event still allows Create PO");

  await nav("Quotations");
  const lockedQuote = page.locator('div.bg-white.rounded-2xl').filter({ hasText: "E2E locked quote" }).first();
  await lockedQuote.getByText("Locked event", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
  if (await lockedQuote.getByRole("button", { name: /^Edit$/ }).count()) throw new Error("Locked quote still allows Edit");
  if (await lockedQuote.getByRole("button", { name: /^Delete$/ }).count()) throw new Error("Locked quote still allows Delete");
  if (await lockedQuote.getByRole("button", { name: /Convert to Invoice/ }).count()) throw new Error("Locked quote still allows Convert to Invoice");
  if (await lockedQuote.getByRole("button", { name: /^Create PO$/ }).count()) throw new Error("Locked quote still allows Create PO");
  await lockedQuote.getByRole("button", { name: /Print/ }).waitFor({ state: "visible", timeout: 5000 });

  await nav("Invoices");
  const lockedInvoice = page.locator('div.bg-white.rounded-2xl').filter({ hasText: "INV/LOCK/E2E" }).first();
  await lockedInvoice.getByText("Locked event", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
  if (await lockedInvoice.getByRole("button", { name: /^Edit$/ }).count()) throw new Error("Locked invoice still allows Edit");
  if (await lockedInvoice.getByRole("button", { name: /^Add Payment$/ }).count()) throw new Error("Locked invoice still allows Add Payment");
  if (await lockedInvoice.getByRole("button", { name: /^Delete$/ }).count()) throw new Error("Locked invoice still allows Delete");
  await lockedInvoice.getByRole("button", { name: /Print/ }).waitFor({ state: "visible", timeout: 5000 });

  await nav("Workers");
  await page.getByPlaceholder(/Search workers/i).fill("E2E Locked Worker");
  const lockedWorkerRow = page.locator('div.bg-white.rounded-2xl').filter({ hasText: "E2E Locked Worker" }).first();
  await lockedWorkerRow.waitFor({ state: "visible", timeout: 5000 });
  const lockedWorkerPay = lockedWorkerRow.getByRole("button", { name: /^Pay Worker$/ }).first();
  if (!(await lockedWorkerPay.isDisabled())) throw new Error("Locked worker assignment still allows Pay Worker");
  await lockedWorkerRow.getByRole("button", { name: /^Details$/ }).click();
  const lockedWorkerDetailPay = page.locator('div.bg-white.rounded-2xl').filter({ hasText: "E2E Locked Worker — Payment & Income Details" }).getByRole("button", { name: /^Pay Worker$/ }).first();
  await lockedWorkerDetailPay.waitFor({ state: "visible", timeout: 5000 });
  if (!(await lockedWorkerDetailPay.isDisabled())) throw new Error("Locked worker detail still allows Pay Worker");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(base, { waitUntil: "domcontentloaded" });
  await mobile.getByRole("button", { name: /^More$/ }).click();
  await mobile.getByRole("button", { name: /^Workers$/ }).click();
  await mobile.getByRole("button", { name: /^Purchases$/ }).click();
  await mobile.getByText("PO No.").last().waitFor({ state: "visible", timeout: 5000 });
  const mobilePayment = mobile.getByRole("button", { name: /^Payment$/ }).first();
  await mobilePayment.waitFor({ state: "visible", timeout: 5000 });
  await mobilePayment.click();
  await mobile.getByText(/Payment Ledger/).waitFor({ state: "visible", timeout: 5000 });
  const modalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (modalOverflow) throw new Error("Mobile payment ledger modal has horizontal overflow");
  const mobileText = await mobile.locator("body").innerText();
  if (/Quotatio\.\.\.|Purchas\.\.\.|Dashboa\.\.\./.test(mobileText)) throw new Error("Mobile nav labels are truncated");
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) throw new Error("Mobile layout has horizontal overflow");
  await mobile.close();

  const health = await api(base.replace(/\/$/, "") + "/api/health");
  if (!health.ok) throw new Error("health failed");
  if (!health.sqlite) throw new Error("SQLite not configured in health response");
  if (errors.length) throw new Error("Console errors: " + errors.join(" | "));
  console.log(JSON.stringify({ ok: true, checked: labels.length + 61, base }));
} finally {
  await api(stateUrl, { method: "PUT", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ state: originalState.state || {} }) });
  await browser.close();
}
