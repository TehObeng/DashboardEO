import { useMemo, useState } from "react";
import {
  fc,
  fd,
  inp,
  normalizePurchase,
  poItems,
  purchaseDebt,
  purchasePaid,
  purchaseStatus,
  purchaseTotal,
  REPORT_CATEGORIES,
  sc,
} from "../dashboardeo-core";
import { AuditLogPanel } from "../components/AuditLogPanel";
import { ActionButton, FilterBar, PageHeader, PageShell, PrimaryButton, RecordCard, SummaryCard, SummaryGrid } from "../components/OperationalLayout";

const invoicePaid = (i) => (i?.payments || []).reduce((s, p) => s + Number(p.amount || 0), Number(i?.paid && !i?.payments?.length ? i.paid : 0));
const invoiceBalance = (i) => Math.max(0, Number(i?.total || 0) - invoicePaid(i));
const eventTitle = (events, id, fallback = "—") => events.find((e) => e.id === Number(id))?.title || fallback;

function MiniTable({ headers, rows, empty = "No rows." }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{headers.map((h) => <th key={h} className="text-left px-3 py-2 text-gray-500 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows : <tr><td colSpan={headers.length} className="px-3 py-5 text-center text-gray-400">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ReportSection({ title, children }) {
  return <RecordCard className="mb-5"><h2 className="font-bold text-gray-800 mb-3">{title}</h2>{children}</RecordCard>;
}

export function ReportsTab({events, quotes, invoices, purchases, eventWorkers, clients, vendors, workers, auditLog, sym, onPrint}) {
  const [category,setCategory] = useState("all");
  const poRows = useMemo(() => purchases.map((p, i) => normalizePurchase(p, purchases.slice(0, i))), [purchases]);
  const selectedLabel = REPORT_CATEGORIES.find(c=>c.id===category)?.label || "All Page Summaries";
  const show = (id) => category === "all" || category === id;

  const eventRows = events.map(ev => {
    const evQuotes = quotes.filter(q => Number(q.eventId) === ev.id);
    const evInvoices = invoices.filter(i => Number(i.eventId) === ev.id);
    const evPO = poRows.filter(p => Number(p.eventId) === ev.id);
    const evWorkers = eventWorkers.filter(w => Number(w.eventId) === ev.id);
    const receivable = evInvoices.reduce((s,i)=>s+invoiceBalance(i),0);
    const payable = evPO.reduce((s,p)=>s+purchaseDebt(p),0) + evWorkers.reduce((s,w)=>s+Number(w.fee||0),0);
    return { ...ev, quotes: evQuotes.length, invoices: evInvoices.length, po: evPO.length, workers: evWorkers.length, receivable, payable };
  });
  const quoteTotal = quotes.reduce((s,q)=>s+Number(q.total||0),0);
  const invoiceTotal = invoices.reduce((s,i)=>s+Number(i.total||0),0);
  const invoicePaidTotal = invoices.reduce((s,i)=>s+invoicePaid(i),0);
  const invoiceOutstanding = invoices.reduce((s,i)=>s+invoiceBalance(i),0);
  const purchaseTotalAmount = poRows.reduce((s,p)=>s+purchaseTotal(p),0);
  const purchaseDebtAmount = poRows.reduce((s,p)=>s+purchaseDebt(p),0);
  const workerFeeTotal = eventWorkers.reduce((s,w)=>s+Number(w.fee||0),0);
  const clientRows = clients.map(c => {
    const cEvents = events.filter(e=>e.client===c.name);
    const cQuotes = quotes.filter(q=>q.client===c.name);
    const cInvoices = invoices.filter(i=>i.client===c.name);
    return { ...c, events: cEvents.length, quotes: cQuotes.length, invoices: cInvoices.length, repeat: Math.max(0, cEvents.length - 1), quoted: cQuotes.reduce((s,q)=>s+Number(q.total||0),0), invoiced: cInvoices.reduce((s,i)=>s+Number(i.total||0),0), last: cEvents.map(e=>e.date).filter(Boolean).sort().pop() || "" };
  });
  const vendorRows = vendors.map(v => {
    const rows = poRows.filter(p=>p.vendor===v.name);
    return { ...v, po: rows.length, spend: rows.reduce((s,p)=>s+purchaseTotal(p),0), debt: rows.reduce((s,p)=>s+purchaseDebt(p),0) };
  });
  const workerRows = workers.map(w => {
    const assignments = eventWorkers.filter(ew=>ew.workerId===w.id);
    return { ...w, assignments: assignments.length, total: assignments.reduce((s,ew)=>s+Number(ew.fee||0),0) };
  });

  return <PageShell>
    <PageHeader
      title="Reports"
      subtitle="Per-page operating summaries for every major tab."
      action={<PrimaryButton onClick={()=>onPrint(category)}>Print Selected Report</PrimaryButton>}
    />
    <FilterBar columns="md:grid-cols-[minmax(220px,360px)_1fr_auto]">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Report Category
        <select aria-label="Report Category" value={category} onChange={e=>setCategory(e.target.value)} className={inp + " mt-1"}>
          {REPORT_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-400">Export scope</p>
        <p className="font-bold text-gray-700">{selectedLabel}</p>
      </div>
      <ActionButton onClick={()=>setCategory("all")}>All Pages</ActionButton>
    </FilterBar>

    <SummaryGrid>
      <SummaryCard label="Events" value={events.length} tone="text-red-700"/>
      <SummaryCard label="Quotations" value={fc(quoteTotal,sym)} tone="text-blue-700"/>
      <SummaryCard label="Invoices Outstanding" value={fc(invoiceOutstanding,sym)} tone="text-amber-700"/>
      <SummaryCard label="Purchase Debt" value={fc(purchaseDebtAmount,sym)} tone="text-red-700"/>
    </SummaryGrid>

    {show("events") && <ReportSection title="Events Summary">
      <MiniTable headers={["Event","Client","Date","Status","Quotes","Invoices","PO","Workers","Open Money"]} rows={eventRows.map(r=><tr key={r.id} className="border-t"><td className="px-3 py-2 font-medium">{r.title}</td><td className="px-3 py-2">{r.client||"—"}</td><td className="px-3 py-2">{fd(r.date)}</td><td className="px-3 py-2"><span className={`text-xs px-2 py-1 rounded-full ${sc(r.status)}`}>{r.status}</span></td><td className="px-3 py-2">{r.quotes}</td><td className="px-3 py-2">{r.invoices}</td><td className="px-3 py-2">{r.po}</td><td className="px-3 py-2">{r.workers}</td><td className="px-3 py-2 font-bold">{fc(r.receivable+r.payable,sym)}</td></tr>)}/>
    </ReportSection>}

    {show("quotes") && <ReportSection title="Quotations Summary">
      <SummaryGrid className="md:grid-cols-3 mb-4"><SummaryCard label="Quote Count" value={quotes.length}/><SummaryCard label="Pending" value={quotes.filter(q=>q.status==="Pending").length} tone="text-amber-700"/><SummaryCard label="Approved Value" value={fc(quotes.filter(q=>q.status==="Approved").reduce((s,q)=>s+Number(q.total||0),0),sym)} tone="text-emerald-700"/></SummaryGrid>
      <MiniTable headers={["Quote","Client","Event","Date","Status","Total"]} rows={quotes.map(q=><tr key={q.id} className="border-t"><td className="px-3 py-2 font-bold">{q.number}</td><td className="px-3 py-2">{q.client}</td><td className="px-3 py-2">{q.eventTitle||eventTitle(events,q.eventId)}</td><td className="px-3 py-2">{fd(q.generatedDate||q.date)}</td><td className="px-3 py-2">{q.status}</td><td className="px-3 py-2 font-bold">{fc(q.total,sym)}</td></tr>)}/>
    </ReportSection>}

    {show("invoices") && <ReportSection title="Invoices Summary">
      <SummaryGrid className="md:grid-cols-3 mb-4"><SummaryCard label="Invoiced" value={fc(invoiceTotal,sym)} tone="text-blue-700"/><SummaryCard label="Paid" value={fc(invoicePaidTotal,sym)} tone="text-emerald-700"/><SummaryCard label="Outstanding" value={fc(invoiceOutstanding,sym)} tone="text-red-700"/></SummaryGrid>
      <MiniTable headers={["Invoice","Client","Event","Due","Status","Paid","Balance"]} rows={invoices.map(i=><tr key={i.id} className="border-t"><td className="px-3 py-2 font-bold">{i.number}</td><td className="px-3 py-2">{i.client}</td><td className="px-3 py-2">{i.eventTitle||eventTitle(events,i.eventId)}</td><td className="px-3 py-2">{fd(i.due||i.date)}</td><td className="px-3 py-2">{i.status}</td><td className="px-3 py-2 font-bold">{fc(invoicePaid(i),sym)}</td><td className="px-3 py-2 font-bold">{fc(invoiceBalance(i),sym)}</td></tr>)}/>
    </ReportSection>}

    {show("purchases") && <ReportSection title="Purchases Summary">
      <SummaryGrid className="md:grid-cols-3 mb-4"><SummaryCard label="PO Total" value={fc(purchaseTotalAmount,sym)} tone="text-red-700"/><SummaryCard label="Paid" value={fc(poRows.reduce((s,p)=>s+purchasePaid(p),0),sym)} tone="text-emerald-700"/><SummaryCard label="Debt" value={fc(purchaseDebtAmount,sym)} tone="text-red-700"/></SummaryGrid>
      <MiniTable headers={["PO","Vendor","Event","Status","Items","Paid","Balance"]} rows={poRows.map(p=><tr key={p.id} className="border-t"><td className="px-3 py-2 font-bold">{p.poNumber}</td><td className="px-3 py-2">{p.vendor||"—"}</td><td className="px-3 py-2">{eventTitle(events,p.eventId)}</td><td className="px-3 py-2">{purchaseStatus(p)}</td><td className="px-3 py-2">{poItems(p).map(i=>i.item).join(", ")}</td><td className="px-3 py-2 font-bold">{fc(purchasePaid(p),sym)}</td><td className="px-3 py-2 font-bold">{fc(purchaseDebt(p),sym)}</td></tr>)}/>
    </ReportSection>}

    {show("clients") && <ReportSection title="Clients Summary">
      <MiniTable headers={["Client","Type","Events","Quotes","Invoices","Repeat","Quoted","Invoiced","Last Event"]} rows={clientRows.map(r=><tr key={r.id} className="border-t"><td className="px-3 py-2 font-bold">{r.name}</td><td className="px-3 py-2">{r.type}</td><td className="px-3 py-2">{r.events}</td><td className="px-3 py-2">{r.quotes}</td><td className="px-3 py-2">{r.invoices}</td><td className="px-3 py-2">{r.repeat}</td><td className="px-3 py-2">{fc(r.quoted,sym)}</td><td className="px-3 py-2">{fc(r.invoiced,sym)}</td><td className="px-3 py-2">{fd(r.last)}</td></tr>)}/>
    </ReportSection>}

    {show("vendors") && <ReportSection title="Vendors Summary">
      <MiniTable headers={["Vendor","Category","Status","PO","Spend","Debt","Base Rate"]} rows={vendorRows.map(r=><tr key={r.id} className="border-t"><td className="px-3 py-2 font-bold">{r.name}</td><td className="px-3 py-2">{r.category}</td><td className="px-3 py-2">{r.status}</td><td className="px-3 py-2">{r.po}</td><td className="px-3 py-2">{fc(r.spend,sym)}</td><td className="px-3 py-2">{fc(r.debt,sym)}</td><td className="px-3 py-2">{fc(r.rate,sym)}</td></tr>)}/>
    </ReportSection>}

    {show("workers") && <ReportSection title="Workers Summary">
      <SummaryGrid className="md:grid-cols-3 mb-4"><SummaryCard label="Workers" value={workers.length}/><SummaryCard label="Assignments" value={eventWorkers.length} tone="text-orange-700"/><SummaryCard label="Worker Fees" value={fc(workerFeeTotal,sym)} tone="text-red-700"/></SummaryGrid>
      <MiniTable headers={["Worker","Role","Status","Assignments","Total Fee"]} rows={workerRows.map(r=><tr key={r.id} className="border-t"><td className="px-3 py-2 font-bold">{r.name}</td><td className="px-3 py-2">{r.jobDesc}</td><td className="px-3 py-2">{r.status}</td><td className="px-3 py-2">{r.assignments}</td><td className="px-3 py-2">{fc(r.total,sym)}</td></tr>)}/>
    </ReportSection>}

    <AuditLogPanel auditLog={auditLog}/>
  </PageShell>;
}
