import { useEffect, useMemo, useState } from "react";
import {
  PURCHASE_CATS,
  allPoItems,
  docNo,
  fc,
  fd,
  formatMoneyInput,
  inp,
  isEventLocked,
  normalizePurchase,
  parseMoneyInput,
  poItems,
  purchaseDebt,
  purchasePaid,
  purchasePayments,
  purchaseStatus,
  purchaseTotal,
  sc,
  ymd,
} from "../dashboardeo-core";
import { AuditLogPanel } from "../components/AuditLogPanel";

function itemNote(it) { return it.description || it.note || it.details || ""; }

function toggleCardKey(e, action) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  action();
}

function SimpleModal({ title, onClose, children, maxWidth = "max-w-3xl" }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-gray-700">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

export function PurchasesTab({ events, vendors, purchases, setPurchases, addAudit, auditLog, sym, initialPO, onInitialPOUsed, onItemsAdded, onPrintPO }) {
  const blankItem = () => ({ id: Date.now() + Math.random(), item: "", description: "", category: "Materials", qty: 1, unitPrice: "", vendor: "" });
  const blank = { defaultVendor: "", eventId: "", orderDate: ymd(), discount: 0, notes: "", items: [blankItem()] };
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [showAdd, setShowAdd] = useState(false);
  const [payPO, setPayPO] = useState(null);
  const [expandedPO, setExpandedPO] = useState(null);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(blank);
  const [payment, setPayment] = useState({ date: ymd(), amount: "", notes: "" });
  const [editPayment, setEditPayment] = useState(null);

  useEffect(() => {
    if (!initialPO) return;
    const rows = (initialPO.items?.length ? initialPO.items : [blankItem()]).map((it, i) => ({
      id: it.id || Date.now() + i,
      item: it.item || it.desc || "",
      description: it.description || it.note || it.details || "",
      category: it.category || "Materials",
      qty: it.qty || 1,
      unitPrice: it.unitPrice ?? it.price ?? "",
      vendor: it.vendor || "",
      quoteItemId: it.quoteItemId || it.id,
    }));
    setForm((f) => ({ ...f, ...initialPO, defaultVendor: "", eventId: initialPO.eventId || "", items: rows, notes: initialPO.notes || f.notes }));
    setShowAdd(true);
    setNotice("Pilih vendor untuk setiap item sebelum Save PO.");
    onInitialPOUsed?.();
  }, [initialPO]);

  const normalized = useMemo(() => purchases.map((p, i) => normalizePurchase(p, purchases.slice(0, i))), [purchases]);
  const eventById = (id) => events.find((e) => e.id === Number(id));
  const formEvent = eventById(form.eventId);
  const formLocked = isEventLocked(formEvent);
  const filtered = normalized.filter((p) => {
    const ev = eventById(p.eventId);
    const paymentText = purchasePayments(p).map((x) => `${x.label} ${x.amount} ${x.status || "Active"}`).join(" ");
    const hay = [p.poNumber, p.vendor, ev?.title, paymentText, ...poItems(p).flatMap((i) => [i.item, itemNote(i)])].join(" ").toLowerCase();
    return (filter === "all" || p.eventId === Number(filter)) && (statusFilter === "all" || purchaseStatus(p) === statusFilter) && (!q || hay.includes(q.toLowerCase()));
  }).sort((a,b) => sort === "oldest" ? new Date(a.orderDate||0) - new Date(b.orderDate||0) : new Date(b.orderDate||0) - new Date(a.orderDate||0));
  const total = filtered.reduce((s, p) => s + purchaseTotal(p), 0);
  const paidTotal = filtered.reduce((s, p) => s + purchasePaid(p), 0);
  const debtTotal = filtered.reduce((s, p) => s + purchaseDebt(p), 0);
  const byCategory = PURCHASE_CATS.map((cat) => ({ cat, total: filtered.reduce((s, p) => s + poItems(p).filter((i) => i.category === cat).reduce((a, i) => a + Number(i.qty || 0) * Number(i.unitPrice || 0), 0), 0) })).filter((c) => c.total > 0);
  const formSubtotal = form.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unitPrice || 0), 0);

  const setItem = (idx, k, v) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)) }));
  const applyDefaultVendor = (vendor) => setForm((f) => ({ ...f, defaultVendor: vendor, items: f.items.map((it) => it.vendor ? it : { ...it, vendor }) }));
  const paymentSummary = (p) => purchasePayments(p).length ? purchasePayments(p).map((x) => `${x.label}: ${fc(x.amount, sym)}${x.status === "Voided" ? " (Voided)" : ""}`).join(" · ") : "No payment yet";
  const openPayment = (po) => {
    const cur = normalizePurchase(po, purchases);
    setPayPO(cur);
    setEditPayment(null);
    setPayment({ date: ymd(), amount: purchaseDebt(cur), notes: "" });
  };

  const add = () => {
    setNotice("");
    if (!form.eventId) { setNotice("Pilih event sebelum Save PO."); return; }
    if (formLocked) { setNotice("Event sudah closed. Data tidak bisa diedit. Print/export masih bisa."); return; }
    const rows = form.items
      .filter((i) => (i.item || "").trim())
      .map((i) => ({ ...i, item: i.item.trim(), description: (i.description || "").trim(), vendor: (i.vendor || form.defaultVendor || "").trim(), qty: Number(i.qty || 0), unitPrice: Number(i.unitPrice || 0) }));
    if (!rows.length) { setNotice("Minimal 1 item PO harus diisi."); return; }
    if (rows.some((i) => !i.vendor)) { setNotice("Pilih vendor untuk setiap item sebelum Save PO."); return; }
    if (rows.some((i) => i.qty <= 0 || i.unitPrice < 0)) { setNotice("Qty harus lebih dari 0 dan harga tidak boleh minus."); return; }

    const grouped = rows.reduce((acc, row) => {
      acc[row.vendor] = [...(acc[row.vendor] || []), row];
      return acc;
    }, {});
    const discount = Math.max(0, Number(form.discount || 0));
    const now = Date.now();
    const created = [];
    Object.entries(grouped).forEach(([vendor, items], idx) => {
      const groupSubtotal = items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0);
      const groupDiscount = discount > 0 && formSubtotal > 0 ? Math.round((discount * groupSubtotal / formSubtotal) * 100) / 100 : 0;
      const row = normalizePurchase({
        id: now + idx,
        poNumber: docNo("po", form.orderDate, [...purchases, ...created]),
        eventId: Number(form.eventId),
        quotationId: form.quotationId || null,
        vendor,
        orderDate: form.orderDate,
        discount: groupDiscount,
        notes: form.notes,
        items: items.map((it, i) => ({ id: now + idx * 100 + i, item: it.item, description: it.description || "", category: it.category || "Materials", qty: Number(it.qty || 0), unitPrice: Number(it.unitPrice || 0), quoteItemId: it.quoteItemId || it.id })),
        payments: [],
      }, [...purchases, ...created]);
      created.push(row);
    });
    setPurchases((p) => [...p, ...created]);
    onItemsAdded?.(created.flatMap((row) => row.items || []));
    created.forEach((row) => addAudit("po.create", "purchase", row.poNumber, `PO dibuat ${fc(purchaseTotal(row), sym)} vendor ${row.vendor}`));
    setNotice(`${created.length} PO dibuat: ${created.map((row) => row.poNumber).join(", ")}`);
    setForm({ ...blank, items: [blankItem()] });
    setShowAdd(false);
  };

  const savePayment = () => {
    if (!payPO || Number(payment.amount) <= 0) return;
    const ev = eventById(payPO.eventId);
    if (isEventLocked(ev)) { setNotice("Event sudah closed. Payment tidak bisa diedit."); return; }
    setPurchases((list) => list.map((x) => {
      if (x.id !== payPO.id) return x;
      const cur = normalizePurchase(x, list);
      const payments = purchasePayments(cur);
      if (editPayment) {
        const otherPaid = payments.filter((p) => p.id !== editPayment.id && p.status !== "Voided").reduce((s, p) => s + Number(p.amount || 0), 0);
        const amt = Math.min(Number(payment.amount || 0), Math.max(0, purchaseTotal(cur) - otherPaid));
        const updatedPayments = payments.map((p) => p.id === editPayment.id ? { ...p, amount: amt, date: payment.date, notes: payment.notes, status: "Active", updatedAt: new Date().toISOString() } : p);
        const updated = { ...cur, payments: updatedPayments };
        return { ...updated, paid: purchasePaid(updated), status: purchaseStatus(updated) };
      }
      const amt = Math.min(Number(payment.amount || 0), purchaseDebt(cur));
      const no = payments.length + 1;
      const label = amt >= purchaseDebt(cur) ? "Final Payment" : `Payment ${no}`;
      const np = { id: Date.now(), paymentNo: no, label, date: payment.date, amount: amt, notes: payment.notes, status: "Active", createdAt: new Date().toISOString() };
      const updated = { ...cur, payments: [...payments, np] };
      return { ...updated, paid: purchasePaid(updated), status: purchaseStatus(updated) };
    }));
    addAudit(editPayment ? "po.payment.edit" : "po.payment", "purchase", payPO.poNumber, `${editPayment ? "edit" : "payment"} ${fc(Number(payment.amount || 0), sym)}`);
    setPayPO(null);
    setEditPayment(null);
    setPayment({ date: ymd(), amount: "", notes: "" });
  };

  const beginEditPayment = (x) => {
    setEditPayment(x);
    setPayment({ date: x.date || ymd(), amount: x.amount, notes: x.notes || "" });
  };
  const voidPayment = (x) => {
    if (!payPO) return;
    const ev = eventById(payPO.eventId);
    if (isEventLocked(ev)) { setNotice("Event sudah closed. Payment tidak bisa di-void."); return; }
    setPurchases((list) => list.map((po) => {
      if (po.id !== payPO.id) return po;
      const cur = normalizePurchase(po, list);
      const updated = { ...cur, payments: purchasePayments(cur).map((p) => p.id === x.id ? { ...p, status: "Voided", voidedAt: new Date().toISOString(), voidReason: "Voided from payment ledger" } : p) };
      return { ...updated, paid: purchasePaid(updated), status: purchaseStatus(updated) };
    }));
    addAudit("po.payment.void", "purchase", payPO.poNumber, `${x.label} voided`);
    setNotice(`${x.label} Voided`);
    setPayPO(null);
  };

  return (
    <div className="p-4 md:p-8 overflow-x-hidden">
      {payPO && (
        <SimpleModal title={`Payment Ledger - ${payPO.poNumber}`} onClose={() => { setPayPO(null); setEditPayment(null); }} maxWidth="max-w-2xl">
          <div className="space-y-4">
            {isEventLocked(eventById(payPO.eventId)) && <div className="bg-amber-50 border border-amber-100 text-amber-700 rounded-xl p-3 text-sm font-semibold">Event sudah closed. Payment tidak bisa diedit.</div>}
            <div className="bg-red-50 rounded-xl p-3 text-sm grid grid-cols-3 gap-2">
              <p><b>Total:</b><br />{fc(purchaseTotal(payPO), sym)}</p><p><b>Paid:</b><br />{fc(purchasePaid(payPO), sym)}</p><p><b>Balance:</b><br />{fc(purchaseDebt(payPO), sym)}</p>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="hidden md:table w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Payment</th><th className="text-left px-3 py-2">Date</th><th className="text-right px-3 py-2">Amount</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Actions</th></tr></thead>
                <tbody>{purchasePayments(payPO).map((x) => <tr key={x.id} className="border-t"><td className="px-3 py-2 font-bold">{x.label}</td><td className="px-3 py-2">{fd(x.date)}</td><td className="px-3 py-2 text-right">{fc(x.amount, sym)}</td><td className="px-3 py-2">{x.status === "Voided" ? "Voided" : "Active"}</td><td className="px-3 py-2"><div className="flex gap-2">{x.status !== "Voided" && !isEventLocked(eventById(payPO.eventId)) && <><button aria-label={`Edit ${x.label}`} onClick={() => beginEditPayment(x)} className="text-blue-600 font-bold text-xs">Edit</button><button aria-label={`Void ${x.label}`} onClick={() => voidPayment(x)} className="text-red-600 font-bold text-xs">Void</button></>}</div></td></tr>)}</tbody>
              </table>
              <div className="md:hidden divide-y divide-gray-100">{purchasePayments(payPO).map((x) => <div key={x.id} className="p-3 text-sm space-y-2"><div className="flex items-start justify-between gap-3"><div><b>{x.label}</b><p className="text-xs text-gray-500">{fd(x.date)} · {x.status === "Voided" ? "Voided" : "Active"}</p></div><b className="text-right">{fc(x.amount, sym)}</b></div>{x.status !== "Voided" && !isEventLocked(eventById(payPO.eventId)) && <div className="flex gap-2"><button aria-label={`Edit ${x.label}`} onClick={() => beginEditPayment(x)} className="flex-1 bg-blue-50 text-blue-700 rounded-lg py-2 font-bold text-xs">Edit</button><button aria-label={`Void ${x.label}`} onClick={() => voidPayment(x)} className="flex-1 bg-red-50 text-red-700 rounded-lg py-2 font-bold text-xs">Void</button></div>}</div>)}</div>
              {!purchasePayments(payPO).length && <p className="text-center text-gray-400 py-4 text-sm">No payments yet.</p>}
            </div>
            {!isEventLocked(eventById(payPO.eventId)) && <div className="bg-gray-50 rounded-xl p-3 space-y-3"><p className="text-sm font-bold text-gray-700">{editPayment ? `Edit ${editPayment.label}` : "Add Payment"}</p><label className="text-xs font-semibold text-gray-500 uppercase">{editPayment ? "Edit Payment Amount" : "Payment Amount"}<input aria-label={editPayment ? "Edit Payment Amount" : "Payment Amount"} type="text" inputMode="numeric" value={formatMoneyInput(payment.amount)} onChange={e => setPayment(p => ({ ...p, amount: parseMoneyInput(e.target.value) }))} className={inp} /></label><label className="text-xs font-semibold text-gray-500 uppercase">Date<input type="date" value={payment.date} onChange={e => setPayment(p => ({ ...p, date: e.target.value }))} className={inp} /></label><textarea value={payment.notes} onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan pembayaran" className={inp + " resize-none"} /><div className="flex gap-2"><button onClick={() => { setEditPayment(null); setPayment({ date: ymd(), amount: purchaseDebt(payPO), notes: "" }); }} className="flex-1 border border-gray-200 py-2 rounded-xl font-bold">Reset</button><button onClick={savePayment} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold">{editPayment ? "Save Payment Edit" : "Save Payment"}</button></div></div>}
          </div>
        </SimpleModal>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6"><div><h1 className="text-2xl font-bold text-gray-800">Purchases</h1><p className="text-gray-500 text-sm mt-0.5">{purchases.length} PO · compact expandable payables</p></div><button onClick={() => { setShowAdd(true); setNotice(""); }} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">+ New PO</button></div>
      {notice && <div className="mb-4 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3 text-sm font-semibold">{notice}</div>}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"><div className="bg-white rounded-2xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500 uppercase">Total PO</p><p className="text-2xl font-bold text-red-600">{fc(total, sym)}</p></div><div className="bg-white rounded-2xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500 uppercase">Paid</p><p className="text-2xl font-bold text-emerald-600">{fc(paidTotal, sym)}</p></div><div className="bg-white rounded-2xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500 uppercase">Debt</p><p className="text-2xl font-bold text-red-600">{fc(debtTotal, sym)}</p></div><div className="bg-white rounded-2xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-2">Category</p><div className="flex flex-wrap gap-1">{byCategory.map((c) => <span key={c.cat} className="text-[11px] bg-gray-100 rounded px-2 py-1">{c.cat}: {fc(c.total, sym)}</span>)}</div></div></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search PO, vendor, item, event" className={inp} /><select value={filter} onChange={e => setFilter(e.target.value)} className={inp}><option value="all">All Events</option>{events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inp}><option value="all">All Status</option>{["Unpaid", "Partial", "Paid", "Cancelled"].map(s => <option key={s}>{s}</option>)}</select><select value={sort} onChange={e => setSort(e.target.value)} className={inp} aria-label="Purchase date sort"><option value="newest">Newest date</option><option value="oldest">Oldest date</option></select></div>
      {showAdd && <div className="bg-white rounded-2xl border border-red-100 p-5 mb-5"><p className="font-bold text-gray-700 mb-3">Purchase Order Baru</p>{formLocked && <div className="mb-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl p-3 text-sm font-bold">Event sudah closed. Data tidak bisa diedit. Print/export masih bisa.</div>}<div className="grid grid-cols-1 md:grid-cols-2 gap-3"><label className="text-xs font-semibold text-gray-500 uppercase">Default Vendor<select aria-label="Default Vendor" value={form.defaultVendor} onChange={e => applyDefaultVendor(e.target.value)} className={inp}><option value="">Pilih Vendor default</option>{vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}</select></label><label className="text-xs font-semibold text-gray-500 uppercase">Event<select aria-label="Event" value={form.eventId} onChange={e => setForm(p => ({ ...p, eventId: e.target.value }))} className={inp}><option value="">Pilih Event</option>{events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label><label className="text-xs font-semibold text-gray-500 uppercase">Tanggal PO<input type="date" value={form.orderDate} onChange={e => setForm(p => ({ ...p, orderDate: e.target.value }))} className={inp} /></label><label className="text-xs font-semibold text-gray-500 uppercase">Vendor Discount<input aria-label="Vendor Discount" type="text" inputMode="numeric" value={formatMoneyInput(form.discount)} onChange={e => setForm(p => ({ ...p, discount: parseMoneyInput(e.target.value) }))} className={inp} /></label></div><div className="mt-4 space-y-3">{form.items.map((it, idx) => <div key={it.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-gray-50 rounded-xl p-3"><input aria-label={`Item ${idx + 1}`} value={it.item} onChange={e => setItem(idx, "item", e.target.value)} placeholder={`Item ${idx + 1}`} className={"md:col-span-3 " + inp} /><select aria-label={`Vendor Item ${idx + 1}`} value={it.vendor || ""} onChange={e => setItem(idx, "vendor", e.target.value)} className={"md:col-span-3 " + inp}><option value="">Pilih Vendor Item {idx + 1}</option>{vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}</select><select value={it.category} onChange={e => setItem(idx, "category", e.target.value)} className={"md:col-span-2 " + inp}>{PURCHASE_CATS.map(c => <option key={c}>{c}</option>)}</select><input aria-label={`Qty ${idx + 1}`} type="number" min="0" value={it.qty} onChange={e => setItem(idx, "qty", e.target.value)} className={"md:col-span-1 " + inp} /><input aria-label={`Unit Price ${idx + 1}`} type="text" inputMode="numeric" value={formatMoneyInput(it.unitPrice)} onChange={e => setItem(idx, "unitPrice", parseMoneyInput(e.target.value))} className={"md:col-span-2 " + inp} /><button aria-label={`Delete Item ${idx + 1}`} onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="md:col-span-1 text-red-500 font-black text-xl">×</button><textarea aria-label={`Item Description ${idx + 1}`} value={it.description || ""} onChange={e => setItem(idx, "description", e.target.value)} placeholder="Item description / vendor instructions" className={"md:col-span-12 " + inp + " resize-none"} rows={2}/></div>)}</div><button onClick={() => setForm(p => ({ ...p, items: [...p.items, blankItem()] }))} className="mt-3 text-sm text-red-600 font-bold hover:underline">+ Add Item</button><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan PO" className={inp + " resize-none mt-3"} /><div className="bg-blue-50 rounded-xl p-3 mt-3 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>{fc(formSubtotal, sym)}</b></div><div className="flex justify-between"><span>Discount</span><b>-{fc(Number(form.discount || 0), sym)}</b></div><div className="flex justify-between text-blue-800"><span>Total</span><b>{fc(Math.max(0, formSubtotal - Number(form.discount || 0)), sym)}</b></div></div><div className="flex gap-3 mt-3"><button onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 py-2 rounded-xl">Cancel</button><button onClick={add} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold">Save PO</button></div></div>}
      <div className="space-y-3">{filtered.map(p => { const ev = eventById(p.eventId); const locked = isEventLocked(ev); const open = expandedPO === p.id; return <div key={p.id} onClick={() => setExpandedPO(open ? null : p.id)} role="button" aria-label={`Open purchase details ${p.poNumber}`} tabIndex={0} onKeyDown={e => toggleCardKey(e, () => setExpandedPO(open ? null : p.id))} className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-sm transition focus:outline-none focus:ring-2 focus:ring-red-200"><div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_auto] gap-3"><div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">PO No.</p><p className="font-black text-gray-800">{p.poNumber}</p><p className="text-sm text-gray-500"><span className="font-bold text-gray-600">Vendor</span> · {p.vendor || "—"}</p><p className="text-xs text-gray-400">{ev?.title || '—'} · {fd(p.orderDate)}</p></div><div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Items</p><p className="text-sm text-gray-700">{poItems(p).map(i => i.item).join(', ')}</p><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-2">Payment Details</p><p className="text-[11px] text-gray-500">{paymentSummary(p)}</p></div><div className="grid grid-cols-3 lg:grid-cols-1 gap-2 text-xs lg:text-right"><div><p className="text-gray-400">Total</p><b>{fc(purchaseTotal(p), sym)}</b></div><div><p className="text-gray-400">Paid</p><b className="text-emerald-600">{fc(purchasePaid(p), sym)}</b></div><div><p className="text-gray-400">Balance</p><b className="text-red-600">{fc(purchaseDebt(p), sym)}</b></div></div></div><div className="flex flex-wrap items-center gap-2 mt-3" onClick={e => e.stopPropagation()}><span className={`text-xs px-2 py-1 rounded-full ${sc(purchaseStatus(p))}`}>{purchaseStatus(p)}</span>{locked && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-bold">Locked</span>}<button onClick={() => setExpandedPO(open ? null : p.id)} className="bg-gray-100 text-gray-700 rounded-xl px-3 py-2 text-sm font-bold">{open ? "Hide Details" : "Details"}</button><button onClick={() => openPayment(p)} className="bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2 text-sm font-bold">Payment</button><button onClick={() => onPrintPO?.(p)} className="bg-indigo-50 text-indigo-700 rounded-xl px-3 py-2 text-sm font-bold">Print PO</button></div>{open && <div onClick={e => e.stopPropagation()} className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-3"><div className="space-y-2"><p className="text-xs font-bold text-gray-500 uppercase">Item Descriptions</p>{poItems(p).map((it,i)=><div key={i} className="bg-gray-50 rounded-xl p-3 text-sm"><div className="flex justify-between gap-3"><b>{it.item}</b><span>{it.qty} × {fc(it.unitPrice, sym)}</span></div>{itemNote(it)&&<p className="text-xs text-gray-500 mt-1">{itemNote(it)}</p>}</div>)}</div><div className="space-y-2"><p className="text-xs font-bold text-gray-500 uppercase">Payment Ledger</p>{purchasePayments(p).length ? purchasePayments(p).map(x=><div key={x.id} className="bg-gray-50 rounded-xl p-3 text-sm flex justify-between"><span>{x.label} · {fd(x.date)}{x.status === "Voided" ? " (Voided)" : ""}</span><b>{fc(x.amount, sym)}</b></div>) : <p className="text-sm text-gray-400">No payment yet</p>}</div></div>}</div>; })}</div>
      {!filtered.length && <p className="text-center text-gray-400 py-8 bg-white rounded-2xl border border-gray-100">No purchases found.</p>}
      <div className="mt-6"><AuditLogPanel auditLog={auditLog}/></div>
    </div>
  );
}
