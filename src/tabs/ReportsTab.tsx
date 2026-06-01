import { useMemo, useState } from "react";
import {
  fc,
  fd,
  inp,
  normalizePurchase,
  poDiscount,
  poItems,
  poSubtotal,
  purchaseDebt,
  purchasePaid,
  purchasePayments,
  purchaseStatus,
  purchaseTotal,
  PURCHASE_CATS,
  REPORT_CATEGORIES,
  sc,
} from "../dashboardeo-core";
import { AuditLogPanel } from "../components/AuditLogPanel";

const itemNote = (it) => it?.description || it?.note || it?.details || "";
const invoicePaid = (i) => (i?.payments || []).reduce((s, p) => s + Number(p.amount || 0), Number(i?.paid && !i?.payments?.length ? i.paid : 0));
const invoiceBalance = (i) => Math.max(0, Number(i?.total || 0) - invoicePaid(i));
const purchaseDate = (p) => p.orderDate || p.date || "";
const purchaseRef = (p) => p.poNumber || p.number || p.item || "PO";
const eventTitle = (events, id, fallback = "—") => events.find((e) => e.id === Number(id))?.title || fallback;

function Card({ label, value, tone = "text-gray-800" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{label}</p>
      <p className={`text-lg md:text-xl font-black truncate ${tone}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <h2 className="font-bold text-gray-800 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Table({ children }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>;
}

export function ReportsTab({events, quotes, invoices, purchases, eventWorkers, clients, vendors, workers, auditLog, sym, onPrint}) {
  const [category,setCategory] = useState("all");
  const poRows = useMemo(() => purchases.map((p, i) => normalizePurchase(p, purchases.slice(0, i))), [purchases]);
  const purchaseItemRows = useMemo(() => poRows.flatMap((po) => {
    const subtotal = poSubtotal(po);
    const discount = poDiscount(po);
    return poItems(po).map((it) => {
      const gross = Number(it.qty || 0) * Number(it.unitPrice ?? it.price ?? 0);
      const net = Math.max(0, gross - (subtotal > 0 ? discount * gross / subtotal : 0));
      return {
        po,
        item: it.item || it.desc || "Purchase",
        description: itemNote(it),
        category: it.category || po.category || "Materials",
        qty: Number(it.qty || 0),
        unitPrice: Number(it.unitPrice ?? it.price ?? 0),
        net,
        vendor: po.vendor || "—",
        date: purchaseDate(po),
        event: eventTitle(events, po.eventId),
      };
    });
  }), [poRows, events]);

  const revenue = invoices.reduce((s,i)=>s+invoicePaid(i),0);
  const outstanding = invoices.reduce((s,i)=>s+invoiceBalance(i),0);
  const purchaseCost = poRows.reduce((s,p)=>s+purchaseTotal(p),0);
  const workerCost = eventWorkers.reduce((s,w)=>s+Number(w.fee||0),0);
  const costs = purchaseCost + workerCost;
  const doneEvents = events.filter(e=>["Done","Finished"].includes(e.status));
  const canceledEvents = events.filter(e=>e.status==="Cancelled");
  const pendingQuotes = quotes.filter(q=>q.status==="Pending");
  const selectedLabel = REPORT_CATEGORIES.find(c=>c.id===category)?.label || "Full Report";

  const eventRows = events.map(ev=>{
    const inv = invoices.filter(i=>Number(i.eventId)===ev.id);
    const paid = inv.reduce((s,i)=>s+invoicePaid(i),0);
    const total = inv.reduce((s,i)=>s+Number(i.total||0),0);
    const eventPurchases = poRows.filter(p=>Number(p.eventId)===ev.id);
    const eventWorkersRows = eventWorkers.filter(w=>Number(w.eventId)===ev.id);
    const cost = eventPurchases.reduce((s,p)=>s+purchaseTotal(p),0) + eventWorkersRows.reduce((s,w)=>s+Number(w.fee||0),0);
    return {...ev,total,paid,balance:Math.max(0,total-paid),cost,profit:paid-cost,purchases:eventPurchases,workers:eventWorkersRows};
  });
  const purchaseByCategory = PURCHASE_CATS.map(cat=>{
    const rows = purchaseItemRows.filter(r=>r.category===cat);
    return {cat,total:rows.reduce((s,r)=>s+r.net,0),count:rows.length};
  }).filter(c=>c.total>0 || c.count>0).sort((a,b)=>b.total-a.total);
  const transactions = [
    ...invoices.map(i=>({date:i.date,type:"Invoice",ref:i.number,party:i.client,event:i.eventTitle||eventTitle(events,i.eventId),category:i.status,in:invoicePaid(i),out:0})),
    ...poRows.map(p=>({date:purchaseDate(p),type:"Purchase Order",ref:purchaseRef(p),party:p.vendor||"—",event:eventTitle(events,p.eventId),category:[...new Set(poItems(p).map(it=>it.category||p.category||"Materials"))].join(", "),in:0,out:purchaseTotal(p)})),
    ...eventWorkers.map(w=>{ const ev=events.find(e=>e.id===w.eventId); const worker=workers.find(x=>x.id===w.workerId); return {date:ev?.date,type:"Worker Fee",ref:w.jobDesc,party:worker?.name||"—",event:ev?.title||"—",category:"Labor",in:0,out:Number(w.fee||0)}; }),
  ].sort((a,b)=>new Date(b.date||0) - new Date(a.date||0));
  const pdrRows = [
    ...quotes.map(q=>({doc:q.number,type:"Quotation",client:q.client,event:q.eventTitle||eventTitle(events,q.eventId),date:q.generatedDate||q.date,status:q.status,total:Number(q.total||0),balance:0,files:(q.attachments||[]).filter(a=>a?.title||a?.content||a?.dataUrl).length})),
    ...invoices.map(i=>({doc:i.number,type:"Invoice",client:i.client,event:i.eventTitle||eventTitle(events,i.eventId),date:i.date,status:i.status,total:Number(i.total||0),balance:invoiceBalance(i),files:(i.attachments||[]).filter(a=>a?.title||a?.content||a?.dataUrl).length})),
  ];
  const repeatRows = clients.map(c=>{ const clientEvents=events.filter(e=>e.client===c.name); const clientInvoices=invoices.filter(i=>i.client===c.name); return {client:c.name,events:clientEvents.length,invoices:clientInvoices.length,repeat:Math.max(0,clientEvents.length-1),last:clientEvents.map(e=>e.date).filter(Boolean).sort().pop()||""}; });

  return <div className="p-4 md:p-8 overflow-x-hidden">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Reports</h1><p className="text-gray-500 text-sm mt-0.5">Detailed reports by category, ready for preview and print.</p></div>
      <button onClick={()=>onPrint(category)} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">🖨️ Print Selected Report</button>
    </div>

    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,360px)_1fr] gap-4 items-end">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Report Category
          <select aria-label="Report Category" value={category} onChange={e=>setCategory(e.target.value)} className={inp + " mt-1"}>
            {REPORT_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <div className="md:text-right">
          <p className="text-xs text-gray-400">Export scope</p>
          <p className="font-bold text-gray-700">{selectedLabel}</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Card label="Paid Revenue" value={fc(revenue,sym)} tone="text-emerald-700"/>
      <Card label="Outstanding" value={fc(outstanding,sym)} tone="text-amber-700"/>
      <Card label="Total Costs" value={fc(costs,sym)} tone="text-red-700"/>
      <Card label="Net Cashflow" value={fc(revenue-costs,sym)} tone={revenue-costs>=0?"text-blue-700":"text-red-700"}/>
      <Card label="Events" value={events.length}/>
      <Card label="Pending Quotes" value={pendingQuotes.length}/>
      <Card label="Finished Events" value={doneEvents.length}/>
      <Card label="Canceled Events" value={canceledEvents.length}/>
    </div>

    {(category==="all" || category==="finance") && <Section title="Finance Detail">
      <Table><tbody>
        <tr className="border-t"><td className="px-3 py-2">Paid Revenue</td><td className="px-3 py-2 text-right font-bold">{fc(revenue,sym)}</td><td className="px-3 py-2">Outstanding</td><td className="px-3 py-2 text-right font-bold">{fc(outstanding,sym)}</td></tr>
        <tr className="border-t"><td className="px-3 py-2">Purchase Orders</td><td className="px-3 py-2 text-right font-bold">{fc(purchaseCost,sym)}</td><td className="px-3 py-2">Worker Fees</td><td className="px-3 py-2 text-right font-bold">{fc(workerCost,sym)}</td></tr>
        <tr className="border-t bg-red-50"><td className="px-3 py-2 font-bold">Net Cashflow</td><td className="px-3 py-2 text-right font-bold">{fc(revenue-costs,sym)}</td><td className="px-3 py-2 font-bold">Total Costs</td><td className="px-3 py-2 text-right font-bold">{fc(costs,sym)}</td></tr>
      </tbody></Table>
      <div className="mt-5">
        <h3 className="font-bold text-gray-700 mb-2">Profit & Loss by Event</h3>
        <Table><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Event</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2">Invoiced</th><th className="text-right px-3 py-2">Paid</th><th className="text-right px-3 py-2">Cost</th><th className="text-right px-3 py-2">Profit</th></tr></thead><tbody>{eventRows.map(r=><tr key={r.id} className="border-t"><td className="px-3 py-2 font-medium">{r.title}</td><td className="px-3 py-2"><span className={`text-xs px-2 py-1 rounded-full font-medium ${sc(r.status)}`}>{r.status}</span></td><td className="px-3 py-2 text-right">{fc(r.total,sym)}</td><td className="px-3 py-2 text-right">{fc(r.paid,sym)}</td><td className="px-3 py-2 text-right">{fc(r.cost,sym)}</td><td className={`px-3 py-2 text-right font-bold ${r.profit>=0?"text-emerald-600":"text-red-600"}`}>{fc(r.profit,sym)}</td></tr>)}</tbody></Table>
      </div>
    </Section>}

    {(category==="all" || category==="pdr") && <Section title="PDR & Prints">
      <Table><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Document</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Client</th><th className="text-left px-3 py-2">Event</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2">Total</th><th className="text-right px-3 py-2">Balance</th><th className="text-right px-3 py-2">Files</th></tr></thead><tbody>{pdrRows.map(r=><tr key={`${r.type}-${r.doc}`} className="border-t"><td className="px-3 py-2 font-bold">{r.doc}</td><td className="px-3 py-2">{r.type}</td><td className="px-3 py-2">{r.client}</td><td className="px-3 py-2">{r.event}</td><td className="px-3 py-2">{r.status}</td><td className="px-3 py-2 text-right">{fc(r.total,sym)}</td><td className="px-3 py-2 text-right">{r.balance?fc(r.balance,sym):"—"}</td><td className="px-3 py-2 text-right">{r.files}</td></tr>)}</tbody></Table>
    </Section>}

    {(category==="all" || category==="events") && <Section title="Events Breakdown">
      <Table><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Event</th><th className="text-left px-3 py-2">Client</th><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2">Workers</th><th className="text-right px-3 py-2">PO</th><th className="text-right px-3 py-2">Cost</th><th className="text-right px-3 py-2">Profit</th></tr></thead><tbody>{eventRows.map(r=><tr key={r.id} className="border-t"><td className="px-3 py-2 font-medium">{r.title}</td><td className="px-3 py-2">{r.client||"—"}</td><td className="px-3 py-2">{fd(r.date)}</td><td className="px-3 py-2">{r.status}</td><td className="px-3 py-2 text-right">{r.workers.length}</td><td className="px-3 py-2 text-right">{r.purchases.length}</td><td className="px-3 py-2 text-right">{fc(r.cost,sym)}</td><td className={`px-3 py-2 text-right font-bold ${r.profit>=0?"text-emerald-600":"text-red-600"}`}>{fc(r.profit,sym)}</td></tr>)}</tbody></Table>
    </Section>}

    {(category==="all" || category==="transactions") && <Section title="Transaction Breakdown">
      <Table><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Reference</th><th className="text-left px-3 py-2">Party</th><th className="text-left px-3 py-2">Event</th><th className="text-left px-3 py-2">Category</th><th className="text-right px-3 py-2">In</th><th className="text-right px-3 py-2">Out</th></tr></thead><tbody>{transactions.map((r,i)=><tr key={i} className="border-t"><td className="px-3 py-2">{fd(r.date)}</td><td className="px-3 py-2">{r.type}</td><td className="px-3 py-2">{r.ref}</td><td className="px-3 py-2">{r.party}</td><td className="px-3 py-2">{r.event}</td><td className="px-3 py-2">{r.category}</td><td className="px-3 py-2 text-right">{r.in?fc(r.in,sym):"—"}</td><td className="px-3 py-2 text-right">{r.out?fc(r.out,sym):"—"}</td></tr>)}</tbody></Table>
    </Section>}

    {(category==="all" || category==="purchases") && <Section title="Purchases by Category">
      <div className="grid grid-cols-1 lg:grid-cols-[.8fr_1.2fr] gap-5">
        <Table><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Category</th><th className="text-right px-3 py-2">Items</th><th className="text-right px-3 py-2">Total</th></tr></thead><tbody>{purchaseByCategory.map(c=><tr key={c.cat} className="border-t"><td className="px-3 py-2 font-medium">{c.cat}</td><td className="px-3 py-2 text-right">{c.count}</td><td className="px-3 py-2 text-right font-bold">{fc(c.total,sym)}</td></tr>)}</tbody></Table>
        <Table><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">PO</th><th className="text-left px-3 py-2">Vendor</th><th className="text-left px-3 py-2">Item</th><th className="text-left px-3 py-2">Category</th><th className="text-right px-3 py-2">Net</th></tr></thead><tbody>{purchaseItemRows.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).map((r,i)=><tr key={`${r.po.id}-${i}`} className="border-t"><td className="px-3 py-2">{purchaseRef(r.po)}<p className="text-xs text-gray-400">{fd(r.date)} · {r.event}</p></td><td className="px-3 py-2">{r.vendor}</td><td className="px-3 py-2"><b>{r.item}</b>{r.description&&<p className="text-xs text-gray-500">{r.description}</p>}</td><td className="px-3 py-2">{r.category}</td><td className="px-3 py-2 text-right font-bold">{fc(r.net,sym)}</td></tr>)}</tbody></Table>
      </div>
    </Section>}

    {category==="all" && <Section title="Repeat Order Tracking">
      <Table><thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Client</th><th className="text-right px-3 py-2">Events</th><th className="text-right px-3 py-2">Invoices</th><th className="text-right px-3 py-2">Repeat Orders</th><th className="text-left px-3 py-2">Last Event</th></tr></thead><tbody>{repeatRows.map(r=><tr key={r.client} className="border-t"><td className="px-3 py-2 font-medium">{r.client}</td><td className="px-3 py-2 text-right">{r.events}</td><td className="px-3 py-2 text-right">{r.invoices}</td><td className="px-3 py-2 text-right">{r.repeat}</td><td className="px-3 py-2">{fd(r.last)}</td></tr>)}</tbody></Table>
    </Section>}

    <Section title="Module Counts">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card label="Clients" value={clients.length}/>
        <Card label="Vendors" value={vendors.length}/>
        <Card label="Workers" value={workers.length}/>
        <Card label="Purchases" value={poRows.length}/>
        <Card label="Assigned Workers" value={eventWorkers.length}/>
      </div>
    </Section>

    <AuditLogPanel auditLog={auditLog}/>
  </div>;
}
