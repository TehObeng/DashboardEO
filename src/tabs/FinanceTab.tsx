import { useState } from "react";
import { fc, fd, MONTHS, PURCHASE_CATS, purchaseDebt, purchasePaid, purchaseTotal, sc } from "../dashboardeo-core";
import { AuditLogPanel } from "../components/AuditLogPanel";

export function FinanceTab({events, invoices, purchases, eventWorkers, vendors, auditLog, sym}) {
  const [period,setPeriod] = useState("all");
  const [year,setYear] = useState(new Date().getFullYear());
  const [drill,setDrill] = useState("events");
  const now = new Date();
  const inPeriod = (date) => {
    if(period === "all") return true;
    const d = new Date(date);
    if(period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === year;
    if(period === "year") return d.getFullYear() === year;
    return true;
  };
  const filteredInvoices = invoices.filter(i => inPeriod(i.date));
  const filteredPurchases = purchases.filter(p => inPeriod(p.orderDate || p.date));
  const totalInvoiced = filteredInvoices.reduce((s,i)=>s+Number(i.total||0),0);
  const totalRevenue = filteredInvoices.reduce((s,i)=>s+Number(i.paid||0),0);
  const totalOutstanding = filteredInvoices.reduce((s,i)=>s+Math.max(0,Number(i.total||0)-Number(i.paid||0)),0);
  const totalPurchases = filteredPurchases.reduce((s,p)=>s+purchaseTotal(p),0);
  const totalPurchasePaid = filteredPurchases.reduce((s,p)=>s+purchasePaid(p),0);
  const totalPurchaseDebt = filteredPurchases.reduce((s,p)=>s+purchaseDebt(p),0);
  const totalWorkerCost = eventWorkers.reduce((s,ew)=>{
    const ev=events.find(e=>e.id===ew.eventId); if(!ev) return s;
    return inPeriod(ev.date) ? s+Number(ew.fee||0) : s;
  },0);
  const totalCosts = totalPurchases + totalWorkerCost;
  const profit = totalRevenue - totalCosts;
  const margin = totalRevenue>0 ? (profit/totalRevenue)*100 : 0;
  const outstandingFor = (inv)=>Math.max(0,Number(inv.total||0)-Number(inv.paid||0));
  const aging = [
    {id:"notdue",label:"Not Due Yet", test:(days)=>days<0},
    {id:"0-7",label:"0–7 Days Overdue", test:(days)=>days>=0&&days<=7},
    {id:"8-30",label:"8–30 Days Overdue", test:(days)=>days>=8&&days<=30},
    {id:"31+",label:"31+ Days Overdue", test:(days)=>days>=31},
  ].map(b=>{ const list=filteredInvoices.filter(i=>outstandingFor(i)>0&&b.test(Math.floor((now-new Date(i.due||i.date))/(86400000)))); return {...b,list,count:list.length,total:list.reduce((s,i)=>s+outstandingFor(i),0)}; });
  const eventPL = events.map(ev=>{
    const inv = invoices.filter(i=>i.eventId===ev.id);
    const invoiced = inv.reduce((s,i)=>s+Number(i.total||0),0);
    const paid = inv.reduce((s,i)=>s+Number(i.paid||0),0);
    const pur = purchases.filter(p=>p.eventId===ev.id).reduce((s,p)=>s+purchaseTotal(p),0);
    const wCost = eventWorkers.filter(ew=>ew.eventId===ev.id).reduce((s,ew)=>s+Number(ew.fee||0),0);
    const cost=pur+wCost, ep=paid-cost;
    return {...ev,invoiced,paid,purchases:pur,workerFees:wCost,cost,profit:ep,margin:paid>0?(ep/paid)*100:0};
  }).filter(ev => inPeriod(ev.date)).sort((a,b)=>a.profit-b.profit);
  const cancelled = eventPL.filter(e=>e.status==="Cancelled");
  const cancelledImpact = cancelled.reduce((a,e)=>({invoiced:a.invoiced+e.invoiced,paid:a.paid+e.paid,cost:a.cost+e.cost,net:a.net+e.profit}),{invoiced:0,paid:0,cost:0,net:0});
  const vendorSpend = vendors.map(v=>({name:v.name,total:filteredPurchases.filter(p=>p.vendor===v.name).reduce((s,p)=>s+purchaseTotal(p),0),count:filteredPurchases.filter(p=>p.vendor===v.name).length})).filter(v=>v.total>0).sort((a,b)=>b.total-a.total);
  const categorySpend = PURCHASE_CATS.map(cat=>({cat,total:filteredPurchases.filter(p=>p.category===cat || (p.items||[]).some(it=>it.category===cat)).reduce((s,p)=>s+purchaseTotal(p),0),count:filteredPurchases.filter(p=>p.category===cat || (p.items||[]).some(it=>it.category===cat)).length})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
  const workerCostRows = eventWorkers.map(ew=>({ ...ew, event: events.find(e=>e.id===ew.eventId) })).filter(ew=>ew.event && inPeriod(ew.event.date));
  const monthlyData = MONTHS.map((m,mi)=>{
    const inv=invoices.filter(i=>{const d=new Date(i.date); return d.getMonth()===mi&&d.getFullYear()===year;});
    const invoiced=inv.reduce((s,i)=>s+Number(i.total||0),0), rev=inv.reduce((s,i)=>s+Number(i.paid||0),0);
    const cost=purchases.filter(p=>{const d=new Date(p.orderDate||p.date); return d.getMonth()===mi&&d.getFullYear()===year;}).reduce((s,p)=>s+purchaseTotal(p),0)+eventWorkers.reduce((s,ew)=>{ const ev=events.find(e=>e.id===ew.eventId); if(!ev)return s; const d=new Date(ev.date); return d.getMonth()===mi&&d.getFullYear()===year?s+Number(ew.fee||0):s; },0);
    return {m,invoiced,rev,cost,profit:rev-cost,margin:rev>0?((rev-cost)/rev)*100:0};
  });
  const maxBar = Math.max(...monthlyData.map(d=>Math.max(d.rev,d.cost,1)));
  const statCard = (id,label,value,sub,icon,tone="gray") => <button onClick={()=>setDrill(id)} className={`text-left rounded-xl p-3 bg-white border shadow-sm hover:shadow-md transition min-w-0 ${drill===id?"border-red-300 ring-2 ring-red-100":"border-gray-100"}`}>
    {icon&&<p className="text-lg mb-1">{icon}</p>}<p className={`text-sm md:text-base font-black truncate ${tone}`}>{value}</p><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold truncate">{label}</p>{sub&&<p className="text-[11px] text-gray-500 mt-0.5 truncate">{sub}</p>}
  </button>;
  const DetailPanel = () => {
    if(drill === "invoiced") return <div className="space-y-2"><p className="text-xs font-bold text-gray-500 uppercase">Contracted Invoice Detail</p>{filteredInvoices.map(i=><div key={i.id} className="rounded-xl bg-blue-50 p-3 flex flex-wrap justify-between gap-3 text-sm"><span><b>{i.number}</b> · {i.client} · {fd(i.date)}</span><b>{fc(i.total,sym)}</b></div>)}</div>;
    if(drill === "revenue") return <div className="space-y-2">{filteredInvoices.map(i=><div key={i.id} className="rounded-xl bg-emerald-50 p-3 flex flex-wrap justify-between gap-3 text-sm"><span><b>{i.number}</b> · {i.client} · {fd(i.date)}</span><b>{fc(i.paid,sym)}</b></div>)}</div>;
    if(drill === "outstanding") return <div className="space-y-2">{filteredInvoices.filter(i=>outstandingFor(i)>0).map(i=><div key={i.id} className="rounded-xl bg-amber-50 p-3 flex flex-wrap justify-between gap-3 text-sm"><span><b>{i.number}</b> · {i.client} · due {fd(i.due||i.date)}</span><b>{fc(outstandingFor(i),sym)}</b></div>)}</div>;
    if(drill === "payables") return <div className="space-y-2">{filteredPurchases.filter(p=>purchaseDebt(p)>0).map(p=><div key={p.id} className="rounded-xl bg-red-50 p-3 flex flex-wrap justify-between gap-3 text-sm"><span><b>{p.poNumber||p.item}</b> · {p.vendor}</span><b>{fc(purchaseDebt(p),sym)}</b></div>)}</div>;
    if(drill === "costs") return <div className="space-y-4"><div><p className="text-xs font-bold text-gray-500 uppercase mb-2">Purchase Category Costs</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{categorySpend.map(c=><div key={c.cat} className="rounded-xl bg-gray-50 p-3 flex justify-between text-sm"><span>{c.cat} <b className="text-gray-400">({c.count})</b></span><b>{fc(c.total,sym)}</b></div>)}</div></div><div><p className="text-xs font-bold text-gray-500 uppercase mb-2">Worker Payroll Costs</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{workerCostRows.map(ew=><div key={ew.id} className="rounded-xl bg-orange-50 p-3 flex justify-between text-sm"><span>{ew.event?.title || "Event"} · {ew.jobDesc}</span><b>{fc(ew.fee,sym)}</b></div>)}</div></div></div>;
    if(drill === "vendors") return <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{vendorSpend.map(v=><div key={v.name} className="rounded-xl bg-indigo-50 p-3 flex justify-between text-sm"><span>{v.name} <b className="text-gray-400">({v.count})</b></span><b>{fc(v.total,sym)}</b></div>)}</div>;
    if(drill === "monthly") return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{monthlyData.map(d=><div key={d.m} className="rounded-xl border border-gray-100 p-3 text-sm"><div className="flex justify-between"><b>{d.m}</b><span>{d.margin.toFixed(1)}%</span></div><p className="text-gray-500 mt-1">Paid {fc(d.rev,sym)}</p><p className="text-gray-500">Costs {fc(d.cost,sym)}</p><p className={d.profit>=0?"text-emerald-600 font-bold":"text-red-600 font-bold"}>Profit {fc(d.profit,sym)}</p></div>)}</div>;
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{eventPL.map(ev=><div key={ev.id} className="rounded-xl border border-gray-100 p-4 bg-gray-50"><div className="flex flex-wrap justify-between gap-2"><div><b className="text-gray-800">{ev.title}</b><p className="text-xs text-gray-500">{ev.client||"—"} · {fd(ev.date)}</p></div><span className={`h-fit text-xs px-2 py-1 rounded-full ${sc(ev.status)}`}>{ev.status}</span></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs"><p>Paid<br/><b>{fc(ev.paid,sym)}</b></p><p>Purchases<br/><b>{fc(ev.purchases,sym)}</b></p><p>Workers<br/><b>{fc(ev.workerFees,sym)}</b></p><p>Profit<br/><b className={ev.profit>=0?"text-emerald-600":"text-red-600"}>{fc(ev.profit,sym)}</b></p></div></div>)}</div>;
  };
  return <div className="p-4 md:p-8 overflow-x-hidden">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6"><div><h1 className="text-2xl font-bold text-gray-800">Finance</h1><p className="text-gray-500 text-sm mt-0.5">Clickable owner P&L, receivables, costs, and event profitability.</p></div><div className="flex flex-col sm:flex-row sm:items-center gap-3"><input aria-label="Finance year" type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-full sm:w-24"/><div className="grid grid-cols-3 rounded-xl border border-gray-200 overflow-hidden">{["all","year","month"].map(p=><button key={p} onClick={()=>setPeriod(p)} className={`px-3 py-2 text-sm font-medium ${period===p?"bg-gray-900 text-white":"text-gray-600 hover:bg-gray-50"}`}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>)}</div></div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 md:gap-3 mb-5">{statCard("invoiced","Invoiced",fc(totalInvoiced,sym),"Contracted","","")}{statCard("revenue","Revenue",fc(totalRevenue,sym),"Cash","","text-emerald-600")}{statCard("outstanding","Outstanding",fc(totalOutstanding,sym),"Receivable","","text-amber-600")}{statCard("costs","Costs",fc(totalCosts,sym),"Cost","","")}{statCard("payables","Payables",fc(totalPurchaseDebt,sym),"Debt","","text-red-600")}{statCard("events",profit>=0?"Profit":"Loss",fc(Math.abs(profit),sym),`${margin.toFixed(1)}%`,"",profit>=0?"text-emerald-600":"text-red-600")}{statCard("vendors","Vendor",fc(vendorSpend.reduce((s,v)=>s+v.total,0),sym),"Spend","","")}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"><div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-bold text-gray-700 mb-4">Receivables Aging</h3><div className="space-y-3">{aging.map(a=><button key={a.label} onClick={()=>setDrill("outstanding")} className="w-full flex justify-between text-sm text-left rounded-lg hover:bg-gray-50 p-1"><span className="text-gray-600">{a.label} <b className="text-gray-400">({a.count})</b></span><b>{fc(a.total,sym)}</b></button>)}</div></div><div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-bold text-gray-700 mb-4">Purchase Payables</h3><button onClick={()=>setDrill("payables")} className="w-full space-y-2 text-sm text-left"><p className="flex justify-between"><span>Billed Amount</span><b>{fc(totalPurchases,sym)}</b></p><p className="flex justify-between"><span>Paid Amount</span><b className="text-emerald-600">{fc(totalPurchasePaid,sym)}</b></p><p className="flex justify-between"><span>Purchase Debt</span><b className="text-red-600">{fc(totalPurchaseDebt,sym)}</b></p></button></div><div className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-bold text-gray-700 mb-4">Cancelled Event Impact</h3><button onClick={()=>setDrill("events")} className="grid grid-cols-2 gap-3 text-sm text-left w-full"><p>Cancelled Events<br/><b>{cancelled.length}</b></p><p>Paid Collected<br/><b>{fc(cancelledImpact.paid,sym)}</b></p><p>Costs Spent<br/><b>{fc(cancelledImpact.cost,sym)}</b></p><p>Net Impact<br/><b className={cancelledImpact.net>=0?"text-emerald-600":"text-red-600"}>{fc(cancelledImpact.net,sym)}</b></p></button></div></div>
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"><h3 className="font-bold text-gray-700">Monthly Overview ({year})</h3><button onClick={()=>setDrill("monthly")} className="text-sm text-red-600 font-bold">Open monthly drilldown</button></div><div className="flex items-end gap-1 h-32 mb-4">{monthlyData.map((d,i)=><button key={i} onClick={()=>setDrill("monthly")} className="flex-1 flex flex-col items-center gap-0.5 min-w-0"><div className="w-full flex flex-col-reverse gap-px" style={{height:112}}><div className="w-full bg-red-300 rounded-sm" style={{height:`${(d.cost/maxBar)*100}%`,minHeight:d.cost>0?2:0}}/><div className="w-full bg-emerald-400 rounded-sm" style={{height:`${(d.rev/maxBar)*100}%`,minHeight:d.rev>0?2:0}}/></div><span className="text-[10px] sm:text-xs text-gray-400">{d.m}</span></button>)}</div></div>
    <div className="bg-white rounded-2xl border border-gray-100 p-5"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"><h3 className="font-bold text-gray-700">Finance Drilldown</h3><div className="flex flex-wrap gap-2">{[["invoiced","Invoiced"],["events","Events"],["revenue","Revenue"],["outstanding","Receivables"],["payables","Payables"],["costs","Costs"],["vendors","Vendors"],["monthly","Monthly"]].map(([id,label])=><button key={id} onClick={()=>setDrill(id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${drill===id?"bg-gray-900 text-white":"bg-gray-100 text-gray-600"}`}>{label}</button>)}</div></div><DetailPanel /></div>
    <div className="mt-8"><AuditLogPanel auditLog={auditLog}/></div>
  </div>;
}
