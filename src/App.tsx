import { useEffect, useRef, useState } from "react";
import {
  CURRENCIES,
  DEFAULT_COMPANY,
  DEFAULT_STATE,
  docNo,
  EVENT_TYPES,
  fc,
  fd,
  formatMoneyInput,
  formatCount,
  inp,
  isEventLocked,
  MONTHS,
  normalizeDashboardState,
  normalizePurchase,
  parseMoneyInput,
  poDiscount,
  poItems,
  poSubtotal,
  purchaseDebt,
  purchasePaid,
  purchasePayments,
  purchasePrice,
  purchaseQty,
  purchaseStatus,
  purchaseTotal,
  PURCHASE_CATS,
  quoteSequencePreview,
  renumberQuotesByMonth,
  REPORT_CATEGORIES,
  sc,
  SEED_CLIENTS,
  SEED_EVENTS,
  SEED_EVENT_WORKERS,
  SEED_INVOICES,
  SEED_PURCHASES,
  SEED_QUOTES,
  SEED_VENDORS,
  SEED_WORKERS,
  VENDOR_CATS,
  ymd,
} from "./dashboardeo-core";
import { PurchasesTab } from "./tabs/PurchasesTab";
import { AttachmentFields, CompanyHeader, InvoicePrintContent, PrintModal, PurchaseOrderPrintContent, QuotePrintContent, ReportPrintContent } from "./documents";
import { FinanceTab } from "./tabs/FinanceTab";
import { ReportsTab } from "./tabs/ReportsTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { AuditLogPanel } from "./components/AuditLogPanel";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const apiUrl = (path) => `${BASE_PATH}${path}`;
const safeJson = async (res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const Avatar = ({name,size="md",color="from-red-500 to-red-700"}) => {
  const sz = size==="lg"?"w-14 h-14 text-xl":size==="sm"?"w-8 h-8 text-xs":"w-10 h-10 text-sm";
  return <div className={`${sz} rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0`}>{name?.charAt(0)?.toUpperCase()||"?"}</div>;
};

// ─── MODALS ───────────────────────────────────────────────────────────────────
function Modal({title, onClose, children, maxW="max-w-lg", zIndex=50}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{zIndex}}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-y-auto`}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-800 text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ClientModal({client, onSave, onClose}) {
  const [f,setF] = useState(client||{name:"",email:"",phone:"",address:"",type:"Wedding",events:0});
  return <Modal title={f.id?"Edit Client":"New Client"} onClose={onClose}>
    <div className="space-y-3">
      <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Full Name *</label><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="e.g. Maria Santos" className={inp}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Phone</label><input value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} className={inp}/></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Email</label><input type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} className={inp}/></div>
      </div>
      <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Address</label><input value={f.address} onChange={e=>setF(p=>({...p,address:e.target.value}))} className={inp}/></div>
      <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Type</label>
        <select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} className={inp}>{EVENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50">Cancel</button>
        <button onClick={()=>{if(!f.name)return; onSave({...f,id:f.id||Date.now()});}} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">Save</button>
      </div>
    </div>
  </Modal>;
}

function VendorModal({vendor, onSave, onClose}) {
  const [f,setF] = useState(vendor||{name:"",category:"Other",phone:"",email:"",address:"",rate:0,status:"Active"});
  return <Modal title={f.id?"Edit Vendor":"New Vendor"} onClose={onClose}>
    <div className="space-y-3">
      <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Name *</label><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} className={inp}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Category</label>
          <select value={f.category} onChange={e=>setF(p=>({...p,category:e.target.value}))} className={inp}>{VENDOR_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Status</label>
          <select value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))} className={inp}><option>Active</option><option>Inactive</option></select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Phone</label><input value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} className={inp}/></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Email</label><input type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} className={inp}/></div>
      </div>
      <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Address</label><input value={f.address} onChange={e=>setF(p=>({...p,address:e.target.value}))} className={inp}/></div>
      <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Base Rate</label><input type="number" value={f.rate} onChange={e=>setF(p=>({...p,rate:e.target.value}))} className={inp}/></div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50">Cancel</button>
        <button onClick={()=>{if(!f.name)return; onSave({...f,id:f.id||Date.now(),rate:Number(f.rate)});}} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">Save</button>
      </div>
    </div>
  </Modal>;
}

function WorkerModal({worker, onSave, onClose}) {
  const [f,setF] = useState(worker||{name:"",jobDesc:"",phone:"",email:"",fee:0,status:"Active"});
  return <Modal title={f.id?"Edit Worker":"New Worker"} onClose={onClose}>
    <div className="space-y-3">
      <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Full Name *</label><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} className={inp}/></div>
      <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Job Description *</label><input value={f.jobDesc} onChange={e=>setF(p=>({...p,jobDesc:e.target.value}))} placeholder="e.g. Sound Engineer, MC" className={inp}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Phone</label><input value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} className={inp}/></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Email</label><input type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} className={inp}/></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Standard Fee</label><input type="number" value={f.fee} onChange={e=>setF(p=>({...p,fee:e.target.value}))} className={inp}/></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Status</label>
          <select value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))} className={inp}><option>Active</option><option>Inactive</option></select></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50">Cancel</button>
        <button onClick={()=>{if(!f.name||!f.jobDesc)return; onSave({...f,id:f.id||Date.now(),fee:Number(f.fee)});}} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">Save</button>
      </div>
    </div>
  </Modal>;
}

// Worker assignment directly inside an event (inline, not a modal)
function EventWorkerRow({eventId, workers, eventWorkers, setEventWorkers}) {
  const [form,setForm] = useState({workerId:"",jobDesc:"",fee:""});
  const assigned = eventWorkers.filter(ew=>ew.eventId===eventId);
  const pickW = (id) => { const w=workers.find(x=>x.id===Number(id)); setForm(p=>({...p,workerId:id,jobDesc:w?.jobDesc||"",fee:w?.fee||""})); };
  const add = () => {
    if(!form.workerId||!form.jobDesc) return;
    if(eventWorkers.some(ew=>ew.eventId===eventId&&ew.workerId===Number(form.workerId))) return;
    setEventWorkers(p=>[...p,{id:Date.now(),eventId,workerId:Number(form.workerId),jobDesc:form.jobDesc,fee:Number(form.fee)||0}]);
    setForm({workerId:"",jobDesc:"",fee:""});
  };
  const active = workers.filter(w=>w.status==="Active");
  return (
    <div>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Workers Assigned</p>
      {assigned.length>0 && (
        <div className="space-y-2 mb-3">
          {assigned.map(ew=>{
            const w=workers.find(x=>x.id===ew.workerId);
            return <div key={ew.id} className="flex items-center gap-3 bg-orange-50 rounded-xl px-3 py-2">
              <Avatar name={w?.name||"?"} size="sm" color="from-orange-400 to-red-500"/>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800">{w?.name}</p><p className="text-xs text-gray-500">{ew.jobDesc}</p></div>
              <span className="text-sm font-bold text-orange-700">{form.fee||ew.fee ? fc(ew.fee,"") : ""}</span>
              <button onClick={()=>setEventWorkers(p=>p.filter(x=>x.id!==ew.id))} className="text-red-400 hover:text-red-600 text-lg leading-none ml-1">×</button>
            </div>;
          })}
          <div className="bg-orange-100 rounded-xl px-3 py-2 flex justify-between text-sm"><span className="text-orange-700 font-semibold">Total Labor Cost</span><span className="font-bold text-orange-800">{fc(assigned.reduce((s,ew)=>s+ew.fee,0),"")}</span></div>
        </div>
      )}
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500">+ Add Worker</p>
        <div className="grid grid-cols-3 gap-2">
          <select value={form.workerId} onChange={e=>pickW(e.target.value)} className={inp+" col-span-1"}>
            <option value="">Worker</option>{active.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
          <input value={form.jobDesc} onChange={e=>setForm(p=>({...p,jobDesc:e.target.value}))} placeholder="Job / Role" className={inp+" col-span-1"}/>
          <div className="flex gap-1">
            <input type="number" value={form.fee} onChange={e=>setForm(p=>({...p,fee:e.target.value}))} placeholder="Fee" className={inp+" flex-1 min-w-0"}/>
            <button onClick={add} className="bg-orange-500 text-white px-3 rounded-xl font-bold hover:bg-orange-600">+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Purchase rows inside an event
function EventPurchaseRow({eventId, vendors, purchases, setPurchases, sym}) {
  const blank = {item:"",vendor:"",date:new Date().toISOString().split("T")[0],qty:1,price:"",category:"Materials"};
  const [form,setForm] = useState(blank);
  const list = purchases.filter(p=>p.eventId===eventId);
  const add = () => {
    if(!form.item||!form.qty||!form.price) return;
    setPurchases(p=>[...p,{id:Date.now(),eventId,item:form.item,vendor:form.vendor,date:form.date,qty:Number(form.qty)||0,price:Number(form.price)||0,category:form.category}]);
    setForm(blank);
  };
  return (
    <div>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Purchases / Expenses</p>
      {list.length>0&&(
        <div className="space-y-1.5 mb-3">
          {list.map(p=><div key={p.id} className="flex items-center gap-3 bg-blue-50 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800">{p.item}</p><p className="text-xs text-gray-500">{p.vendor||"—"} · {p.category} · {fd(p.date)} · Qty {purchaseQty(p)} × {fc(purchasePrice(p),sym)}</p></div>
            <span className="text-sm font-bold text-blue-700">{fc(purchaseTotal(p),sym)}</span>
            <button onClick={()=>setPurchases(pr=>pr.filter(x=>x.id!==p.id))} className="text-red-400 hover:text-red-600 text-lg leading-none ml-1">×</button>
          </div>)}
          <div className="bg-blue-100 rounded-xl px-3 py-2 flex justify-between text-sm"><span className="text-blue-700 font-semibold">Total Expenses</span><span className="font-bold text-blue-800">{fc(list.reduce((s,p)=>s+purchaseTotal(p),0),sym)}</span></div>
        </div>
      )}
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500">+ Add Purchase</p>
        <div className="grid grid-cols-3 gap-2">
          <input value={form.item} onChange={e=>setForm(p=>({...p,item:e.target.value}))} placeholder="Item / Description *" className={inp}/>
          <select value={form.vendor} onChange={e=>setForm(p=>({...p,vendor:e.target.value}))} className={inp}>
            <option value="">Vendor / Supplier</option>{vendors.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}
          </select>
          <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} className={inp}>{PURCHASE_CATS.map(c=><option key={c}>{c}</option>)}</select>
          <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className={inp}/>
          <input type="number" min="0" value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} placeholder="Quantity *" className={inp}/>
          <div className="flex gap-1">
            <input type="number" min="0" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))} placeholder="Unit Price *" className={inp+" flex-1 min-w-0"}/>
            <button onClick={add} className="bg-blue-600 text-white px-3 rounded-xl font-bold hover:bg-blue-700">+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QUOTE MODAL (creates event inline) ──────────────────────────────────────
function QuoteModal({quote, quotes = [], clients, events, onSave, onClose, sym, onAddClient}) {
  const isEdit = !!quote?.id;
  const initialDate = quote?.generatedDate || quote?.date || ymd();
  const [f,setF] = useState(quote||{
    number:quoteSequencePreview(initialDate, quotes, null),client:"",date:initialDate,generatedDate:initialDate,status:"Pending",description:"",discount:0,
    items:[{desc:"",note:"",qty:1,price:0}],
    // new event fields
    createEvent:true, eventTitle:"",eventType:"Wedding",eventDate:"",eventVenue:"",eventNotes:"",
    eventId:null, eventTitle2:"", attachments:[]
  });
  const [showAI,setShowAI] = useState(false);
  const [numberTouched,setNumberTouched] = useState(false);
  const [quickClient,setQuickClient] = useState({name:"",phone:"",email:"",type:"Wedding"});
  const set = (k,v)=>setF(p=>({...p,[k]:v}));
  const addQuickClient = () => {
    const name = quickClient.name.trim();
    if(!name) return;
    const client = {id:Date.now(), name, phone:quickClient.phone, email:quickClient.email, address:"", type:quickClient.type, events:0};
    onAddClient?.(client);
    set("client", client.name);
    setQuickClient({name:"",phone:"",email:"",type:"Wedding"});
  };
  const addItem = ()=>setF(p=>({...p,items:[...p.items,{desc:"",note:"",qty:1,price:0}]}));
  const removeItem = (i)=>setF(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}));
  const upd = (i,k,v)=>{ const items=[...f.items]; items[i]={...items[i],[k]:v}; setF(p=>({...p,items})); };
  const addAttachment = ()=>setF(p=>({...p,attachments:[...(p.attachments||[]),{title:"",content:"",fileName:"",type:"",dataUrl:""}]}));
  const updAttachment = (i,k,v)=>setF(p=>{ const attachments=[...(p.attachments||[])]; attachments[i]={...attachments[i],[k]:v}; return {...p,attachments}; });
  const removeAttachment = (i)=>setF(p=>({...p,attachments:(p.attachments||[]).filter((_,idx)=>idx!==i)}));
  const subtotal = f.items.reduce((s,it)=>s+(Number(it.qty)*Number(it.price)),0);
  const discount = Math.max(0, Number(f.discount||0));
  const total = Math.max(0, subtotal-discount);
  const setGeneratedDate = (date) => setF(p => ({
    ...p,
    generatedDate: date,
    date,
    number: numberTouched ? p.number : quoteSequencePreview(date, quotes, p.id || null),
  }));
  const save = ()=>{
    if(!f.client) return;
    if(!f.createEvent && isEventLocked(events.find(e=>e.id===Number(f.eventId)))) return;
    let eventId = f.eventId;
    let eventTitle = f.eventTitle2;
    onSave({quote:{...f,id:f.id||Date.now(),date:f.generatedDate||f.date,total,subtotal,discount,eventId,eventTitle},
      newEvent: f.createEvent&&(f.eventTitle||f.eventDate) ? {id:Date.now()+1,title:f.eventTitle||f.description||`${f.client} Event`,client:f.client,type:f.eventType,date:f.eventDate||f.date,venue:f.eventVenue,notes:f.eventNotes,status:"Planning"} : null});
  };
  return (
    <>
    <Modal title={isEdit?"Edit Quotation":"New Quotation"} onClose={onClose} maxW="max-w-2xl">
      <div className="space-y-5">
        {/* Header info */}
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Quote #</label><input aria-label="Quote #" value={f.number} onChange={e=>{setNumberTouched(true);set("number",e.target.value);}} className={inp}/></div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Client *</label>
            <select aria-label="Client *" value={f.client} onChange={e=>set("client",e.target.value)} className={inp}><option value="">Select</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Generated Date</label><input aria-label="Generated Date" type="date" value={f.generatedDate||f.date} onChange={e=>setGeneratedDate(e.target.value)} className={inp}/></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Quotation Description</label><textarea aria-label="Quotation Description" rows={2} value={f.description||""} onChange={e=>set("description",e.target.value)} className={inp+" resize-none"}/></div>
          <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Quote Discount</label><input aria-label="Quote Discount" type="text" inputMode="numeric" value={formatMoneyInput(f.discount||0)} onChange={e=>set("discount",parseMoneyInput(e.target.value))} className={inp}/></div>
        </div>

        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-red-700">👤 Quick Add Client</p>
            <p className="text-xs text-red-500">Tambah client tanpa pindah menu Clients</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input value={quickClient.name} onChange={e=>setQuickClient(p=>({...p,name:e.target.value}))} placeholder="Client name *" className={inp}/>
            <input value={quickClient.phone} onChange={e=>setQuickClient(p=>({...p,phone:e.target.value}))} placeholder="Phone" className={inp}/>
            <input value={quickClient.email} onChange={e=>setQuickClient(p=>({...p,email:e.target.value}))} placeholder="Email" className={inp}/>
            <div className="flex gap-2">
              <select value={quickClient.type} onChange={e=>setQuickClient(p=>({...p,type:e.target.value}))} className={inp+" min-w-0"}>{EVENT_TYPES.map(t=><option key={t}>{t}</option>)}</select>
              <button onClick={addQuickClient} className="bg-red-600 text-white px-3 rounded-xl font-bold hover:bg-red-700 whitespace-nowrap">Add</button>
            </div>
          </div>
        </div>

        {/* Event section */}
        {!isEdit&&(
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-sm font-bold text-amber-700 mb-3">📅 Link to Event</p>
            <div className="flex gap-3 mb-3">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={f.createEvent} onChange={()=>setF(p=>({...p,createEvent:true,eventId:null}))} className="accent-red-600"/><span className="text-sm font-medium text-gray-700">Create New Event</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!f.createEvent} onChange={()=>setF(p=>({...p,createEvent:false}))} className="accent-red-600"/><span className="text-sm font-medium text-gray-700">Add quotation to existing event</span></label>
            </div>
            {f.createEvent ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1">Event Title *</label><input value={f.eventTitle} onChange={e=>set("eventTitle",e.target.value)} placeholder="e.g. Santos Wedding" className={inp}/></div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1">Event Type</label>
                    <select value={f.eventType} onChange={e=>set("eventType",e.target.value)} className={inp}>{EVENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1">Event Date</label><input aria-label="Event Date" type="date" value={f.eventDate} onChange={e=>set("eventDate",e.target.value)} className={inp}/></div>
                  <div><label className="text-xs font-semibold text-gray-500 block mb-1">Venue</label><input value={f.eventVenue} onChange={e=>set("eventVenue",e.target.value)} placeholder="Venue" className={inp}/></div>
                </div>
                <div><label className="text-xs font-semibold text-gray-500 block mb-1">Notes</label><input value={f.eventNotes} onChange={e=>set("eventNotes",e.target.value)} className={inp}/></div>
              </div>
            ):(
              <div><label className="text-xs font-semibold text-gray-500 block mb-1">Select Event</label>
                <select value={f.eventId||""} onChange={e=>{const ev=events.find(x=>x.id===Number(e.target.value)); setF(p=>({...p,eventId:Number(e.target.value),eventTitle2:ev?.title||""}));}} className={inp}>
                  <option value="">No event</option>{events.filter(e=>!isEventLocked(e)).map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
            )}
          </div>
        )}

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Items</label>
            <div className="flex gap-2">
              <button onClick={()=>setShowAI(true)} className="bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-violet-200">✨ AI Generate</button>
              <button onClick={addItem} className="text-xs text-red-600 font-semibold hover:underline">+ Add Item</button>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2 text-gray-500 font-medium">Description</th><th className="text-center px-3 py-2 text-gray-500 font-medium w-16">Qty</th><th className="text-right px-3 py-2 text-gray-500 font-medium w-28">Price</th><th className="text-right px-3 py-2 text-gray-500 font-medium w-28">Total</th><th className="w-8"></th></tr></thead>
              <tbody>{f.items.map((it,i)=>(
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2"><input value={it.desc} onChange={e=>upd(i,"desc",e.target.value)} placeholder="Service" className="w-full focus:outline-none text-sm"/><textarea aria-label={`Line Item ${i+1} Description`} value={it.note||it.description||""} onChange={e=>upd(i,"note",e.target.value)} placeholder="Item description / deliverable notes" className="mt-1 w-full resize-none text-xs text-gray-500 focus:outline-none" rows={2}/></td>
                  <td className="px-3 py-2"><input type="number" value={it.qty} onChange={e=>upd(i,"qty",e.target.value)} className="w-full text-center focus:outline-none text-sm"/></td>
                  <td className="px-3 py-2"><input type="text" inputMode="numeric" value={formatMoneyInput(it.price)} onChange={e=>upd(i,"price",parseMoneyInput(e.target.value))} className="w-full text-right focus:outline-none text-sm"/></td>
                  <td className="px-3 py-2 text-right font-medium">{fc(it.qty*it.price,sym)}</td>
                  <td className="px-3 py-2"><button onClick={()=>removeItem(i)} className="text-red-300 hover:text-red-500 text-lg">×</button></td>
                </tr>
              ))}</tbody>
              <tfoot className="bg-red-50 border-t-2 border-red-200"><tr><td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-700">Subtotal</td><td className="px-3 py-2 text-right font-bold text-gray-700">{fc(subtotal,sym)}</td><td></td></tr><tr><td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-700">Discount</td><td className="px-3 py-2 text-right font-bold text-red-600">-{fc(discount,sym)}</td><td></td></tr><tr><td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-700">TOTAL</td><td className="px-3 py-2 text-right font-bold text-red-700 text-base">{fc(total,sym)}</td><td></td></tr></tfoot>
            </table>
          </div>
        </div>
        <AttachmentFields attachments={f.attachments||[]} onAdd={addAttachment} onUpdate={updAttachment} onRemove={removeAttachment} placeholder="Terms, package details, customer-specific notes, scope, inclusions, etc."/>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">Save Quotation{f.createEvent&&f.eventTitle?" & Create Event":""}</button>
        </div>
      </div>
    </Modal>
    {showAI&&<AIQuoteGen onClose={()=>setShowAI(false)} onApply={items=>{setF(p=>({...p,items}));setShowAI(false);}} sym={sym}/>}
    </>
  );
}

// ─── AI QUOTE GENERATOR ───────────────────────────────────────────────────────
function AIQuoteGen({onClose, onApply, sym}) {
  const [form,setForm] = useState({eventType:"Wedding",guestCount:100,budget:"",notes:""});
  const [loading,setLoading] = useState(false);
  const [result,setResult] = useState(null);
  const generate = async () => {
    setLoading(true); setResult(null);
    try {
      const data = await fetch(apiUrl("/api/ai-quote"), {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...form,currency:"IDR",locale:"Indonesia"})
      }).then(safeJson);
      setResult(data);
    } catch { setResult({error:"Could not generate. Please try again."}); }
    setLoading(false);
  };
  return <Modal title="✨ AI Quote Generator" onClose={onClose} maxW="max-w-xl" zIndex={70}>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <p className="text-xs text-gray-500">Indonesia · IDR · Powered by GPT quote assistant when configured</p><div><label className="text-sm font-medium text-gray-600 block mb-1">Event Type</label>
          <select value={form.eventType} onChange={e=>setForm(p=>({...p,eventType:e.target.value}))} className={inp}>{EVENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label className="text-sm font-medium text-gray-600 block mb-1">Guest Count</label>
          <input type="number" value={form.guestCount} onChange={e=>setForm(p=>({...p,guestCount:e.target.value}))} className={inp}/></div>
      </div>
      <div><label className="text-sm font-medium text-gray-600 block mb-1">Target Budget</label>
        <input type="number" placeholder="e.g. 200000" value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))} className={inp}/></div>
      <div><label className="text-sm font-medium text-gray-600 block mb-1">Notes</label>
        <textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className={inp+" resize-none"}/></div>
      <button onClick={generate} disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
        {loading?<><span className="animate-spin">⟳</span>Generating...</>:"✨ Generate"}</button>
      {result&&!result.error&&(
        <div className="border border-violet-200 rounded-xl overflow-hidden">
          <div className="bg-violet-50 px-4 py-3 flex justify-between"><span className="font-semibold text-violet-700 text-sm">Generated</span><span className="font-bold text-violet-800">{fc(result.total,sym)}</span></div>
          <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left px-4 py-2">Item</th><th className="text-center px-4 py-2 w-16">Qty</th><th className="text-right px-4 py-2 w-28">Price</th><th className="text-right px-4 py-2 w-28">Total</th></tr></thead>
            <tbody>{result.items.map((it,i)=><tr key={i} className="border-t"><td className="px-4 py-2">{it.desc}</td><td className="px-4 py-2 text-center">{it.qty}</td><td className="px-4 py-2 text-right">{fc(it.price,sym)}</td><td className="px-4 py-2 text-right font-medium">{fc(it.qty*it.price,sym)}</td></tr>)}</tbody>
          </table>
          {result.suggestions?.length>0&&<div className="px-4 py-3 border-t bg-violet-50">{result.suggestions.map((s,i)=><p key={i} className="text-xs text-violet-700">• {s}</p>)}</div>}
          <div className="px-4 py-3 border-t"><button onClick={()=>onApply(result.items)} className="w-full bg-emerald-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-emerald-600">✓ Use This Quote</button></div>
        </div>
      )}
      {result?.error&&<p className="text-red-500 text-sm text-center">{result.error}</p>}
    </div>
  </Modal>;
}

// ─── INVOICE MODAL ────────────────────────────────────────────────────────────
function InvoiceModal({invoice, invoices = [], clients, events, onSave, onClose, sym}) {
  const initialDate = invoice?.date || ymd();
  const [numberTouched,setNumberTouched] = useState(false);
  const blankLine = () => ({id:Date.now()+Math.random(),desc:"",note:"",qty:1,price:""});
  const [f,setF] = useState(invoice ? {...invoice,items:invoice.items||[]} : {number:docNo("invoice", initialDate, invoices),client:"",eventId:null,eventTitle:"",date:initialDate,due:"",total:"",paid:0,payments:[],attachments:[],items:[]});
  const set = (k,v)=>setF(p=>({...p,[k]:v}));
  const addAttachment = ()=>setF(p=>({...p,attachments:[...(p.attachments||[]),{title:"",content:"",fileName:"",type:"",dataUrl:""}]}));
  const updAttachment = (i,k,v)=>setF(p=>{ const attachments=[...(p.attachments||[])]; attachments[i]={...attachments[i],[k]:v}; return {...p,attachments}; });
  const removeAttachment = (i)=>setF(p=>({...p,attachments:(p.attachments||[]).filter((_,idx)=>idx!==i)}));
  const addItem = ()=>setF(p=>({...p,items:[...(p.items||[]),blankLine()]}));
  const updItem = (i,k,v)=>setF(p=>{ const items=[...(p.items||[])]; items[i]={...items[i],[k]:v}; return {...p,items}; });
  const removeItem = (i)=>setF(p=>({...p,items:(p.items||[]).filter((_,idx)=>idx!==i)}));
  const itemTotal = (f.items||[]).reduce((s,it)=>s+Number(it.qty||0)*Number(it.price??it.unitPrice??0),0);
  const hasItems = (f.items||[]).some(it=>(it.desc||it.item||"").trim() || Number(it.price||it.unitPrice||0)>0);
  const totalValue = hasItems ? itemTotal : Number(f.total||0);
  const paidSum = (f.payments||[]).reduce((s,p)=>s+Number(p.amount||0), Number(f.paid&&!f.payments?.length?f.paid:0));
  const balance = totalValue-paidSum;
  const setInvoiceDate = (date) => setF(p => ({ ...p, date, number: numberTouched ? p.number : docNo("invoice", date, invoices.filter(inv => inv.id !== p.id)) }));
  const save = ()=>{
    if(isEventLocked(events.find(e=>e.id===Number(f.eventId)))) return;
    const status = paidSum>=totalValue?"Paid":paidSum>0?"Partial":"Unpaid";
    onSave({...f,id:f.id||Date.now(),status,total:totalValue,paid:paidSum,payments:f.payments||[],items:(f.items||[]).map(it=>({...it,desc:it.desc||it.item||"",note:it.note||it.description||"",qty:Number(it.qty||0),price:Number(it.price??it.unitPrice??0)}))});
  };
  return <Modal title={invoice?"Edit Invoice":"New Invoice"} onClose={onClose} maxW="max-w-2xl">
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Invoice #</label><input value={f.number} onChange={e=>{setNumberTouched(true);set("number",e.target.value);}} className={inp}/></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Client</label>
          <select aria-label="Client" value={f.client} onChange={e=>set("client",e.target.value)} className={inp}><option value="">Select</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></div>
        <div className="md:col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Link to Event</label>
          <select value={f.eventId||""} onChange={e=>{const ev=events.find(x=>x.id===Number(e.target.value)); set("eventId",Number(e.target.value)||null); set("eventTitle",ev?.title||"");}} className={inp}><option value="">No event</option>{events.filter(e=>!isEventLocked(e) || e.id===Number(f.eventId)).map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Invoice Date</label><input type="date" value={f.date} onChange={e=>setInvoiceDate(e.target.value)} className={inp}/></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Due Date</label><input type="date" value={f.due} onChange={e=>set("due",e.target.value)} className={inp}/></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Total</label><input aria-label="Total" type="text" inputMode="numeric" value={formatMoneyInput(f.total)} onChange={e=>set("total",parseMoneyInput(e.target.value))} className={inp}/></div>
        <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Amount Paid</label><input type="text" inputMode="numeric" value={formatMoneyInput(f.paid)} onChange={e=>set("paid",parseMoneyInput(e.target.value))} className={inp}/></div>
      </div>
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
        <div className="flex items-center justify-between gap-3 mb-2"><p className="text-sm font-bold text-gray-700">Invoice Line Items</p><button onClick={addItem} className="text-xs text-red-600 font-bold hover:underline">+ Add Invoice Item</button></div>
        {(f.items||[]).length===0?<p className="text-xs text-gray-400">Optional. If filled, invoice total follows line item total and item descriptions print on invoice.</p>:<div className="space-y-2">{(f.items||[]).map((it,i)=><div key={it.id||i} className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-white border border-gray-100 rounded-xl p-3"><input aria-label={`Invoice Item ${i+1}`} value={it.desc||it.item||""} onChange={e=>updItem(i,"desc",e.target.value)} placeholder={`Invoice item ${i+1}`} className={"md:col-span-5 "+inp}/><input aria-label={`Invoice Qty ${i+1}`} type="number" value={it.qty} onChange={e=>updItem(i,"qty",e.target.value)} className={"md:col-span-2 "+inp}/><input aria-label={`Invoice Price ${i+1}`} type="text" inputMode="numeric" value={formatMoneyInput(it.price??it.unitPrice??"")} onChange={e=>updItem(i,"price",parseMoneyInput(e.target.value))} className={"md:col-span-3 "+inp}/><button onClick={()=>removeItem(i)} className="md:col-span-2 text-red-500 font-black">×</button><textarea aria-label={`Invoice Item Description ${i+1}`} value={it.note||it.description||""} onChange={e=>updItem(i,"note",e.target.value)} placeholder="Item description / deliverable notes" className={"md:col-span-12 "+inp+" resize-none"} rows={2}/></div>)}</div>}
        {hasItems&&<p className="text-sm font-bold text-gray-700 mt-3">Line item total: {fc(itemTotal,sym)}</p>}
      </div>
      <div className="bg-gray-50 rounded-xl p-3 flex justify-between text-sm"><span>Balance Due</span><span className={`font-bold ${balance>0?"text-red-600":"text-emerald-600"}`}>{fc(balance,sym)}</span></div>
      <AttachmentFields attachments={f.attachments||[]} onAdd={addAttachment} onUpdate={updAttachment} onRemove={removeAttachment} placeholder="Payment terms, package deliverables, customer-specific invoice notes, etc."/>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50">Cancel</button>
        <button onClick={save} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">Save</button>
      </div>
    </div>
  </Modal>;
}


function InvoicePaymentModal({invoice,onSave,onClose,sym}) {
  const [amount,setAmount]=useState("");
  return <Modal title={`Add Payment ${invoice.number}`} onClose={onClose}>
    <div className="space-y-4"><div className="bg-gray-50 rounded-xl p-3 text-sm"><p>Total: <b>{fc(invoice.total,sym)}</b></p></div>
    <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Invoice Payment Amount</label><input aria-label="Invoice Payment Amount" type="text" inputMode="numeric" value={formatMoneyInput(amount)} onChange={e=>setAmount(parseMoneyInput(e.target.value))} className={inp}/></div>
    <div className="flex gap-3"><button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50">Cancel</button><button onClick={()=>onSave(amount)} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">Save Payment</button></div></div>
  </Modal>;
}

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

// ─── FINANCE TAB ──────────────────────────────────────────────────────────────

// ─── WORKERS TAB ──────────────────────────────────────────────────────────────
function WorkersTab({workers, setWorkers, events, eventWorkers, workerPayments=[], setWorkerPayments, sym}) {
  const [editWorker,setEditWorker] = useState(null);
  const [viewWorker,setViewWorker] = useState(null);
  const [search,setSearch] = useState("");
  const [sort,setSort] = useState("name");
  const [payWorker,setPayWorker] = useState(null);
  const [workerPayAmount,setWorkerPayAmount] = useState("");
  const [workerPayDate,setWorkerPayDate] = useState(ymd());
  const workerRows = (wId) => eventWorkers.filter(ew=>ew.workerId===wId).map(ew=>({...ew,event:events.find(e=>e.id===ew.eventId)})).filter(ew=>ew.event);
  const workerPaid = (wId)=>workerPayments.filter(p=>p.workerId===wId&&p.status!=="Voided").reduce((s,p)=>s+Number(p.amount||0),0);
  const workerPaidForRow = (ew)=>workerPayments.filter(p=>p.eventWorkerId===ew.id&&p.status!=="Voided").reduce((s,p)=>s+Number(p.amount||0),0);
  const workerTotal = (wId)=>workerRows(wId).reduce((s,ew)=>s+Number(ew.fee||0),0);
  const workerDue = (wId)=>Math.max(0, workerTotal(wId)-workerPaid(wId));
  const workerPayableDue = (wId)=>workerRows(wId).filter(ew=>!isEventLocked(ew.event)).reduce((s,ew)=>s+Math.max(0,Number(ew.fee||0)-workerPaidForRow(ew)),0);
  const totalWorkerPayroll = workers.reduce((s,w)=>s+workerTotal(w.id),0);
  const totalPaidWorkers = workers.reduce((s,w)=>s+workerPaid(w.id),0);
  const totalPendingWorkers = Math.max(0,totalWorkerPayroll-totalPaidWorkers);
  const visibleWorkers = workers.filter(w=>!search||[w.name,w.jobDesc,w.phone,w.email].join(" ").toLowerCase().includes(search.toLowerCase())).sort((a,b)=>{
    if(sort==="pending") return workerDue(b.id)-workerDue(a.id);
    if(sort==="paid") return workerPaid(b.id)-workerPaid(a.id);
    if(sort==="assignments") return workerRows(b.id).length-workerRows(a.id).length;
    return String(a.name||"").localeCompare(String(b.name||""));
  });
  const sel = viewWorker ? workers.find(w=>w.id===viewWorker) : null;
  const selAssignments = sel ? workerRows(sel.id) : [];
  const payRows = payWorker ? workerRows(payWorker.id) : [];
  const latestPaymentText = (wId)=>workerPayments.filter(p=>p.workerId===wId).map(p=>`${p.label}: ${fc(p.amount,sym)}`).join(" · ");
  const saveWorkerPayment = () => {
    if(!payWorker) return;
    const due = workerPayableDue(payWorker.id);
    const amt = Math.min(Number(workerPayAmount||0), due);
    if(amt<=0) return;
    const n = workerPayments.filter(p=>p.workerId===payWorker.id).length+1;
    const firstOpen = payRows.find(ew=>!isEventLocked(ew.event)&&Number(ew.fee||0)>workerPaidForRow(ew));
    if(!firstOpen) return;
    setWorkerPayments([...(workerPayments||[]),{id:Date.now(),workerId:payWorker.id,eventId:firstOpen?.eventId||null,eventWorkerId:firstOpen?.id||null,amount:amt,label:`Worker Payment ${n}`,date:workerPayDate,status:"Active"}]);
    setWorkerPayAmount(""); setWorkerPayDate(ymd()); setPayWorker(null);
  };
  const payableDue = payWorker ? workerPayableDue(payWorker.id) : 0;
  return (
    <div className="p-4 md:p-8 overflow-x-hidden">
      {payWorker&&<Modal title={`Pay Worker ${payWorker.name}`} onClose={()=>setPayWorker(null)}><div className="space-y-4"><div className="bg-orange-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-sm"><p>Total Fee<br/><b>{fc(workerTotal(payWorker.id),sym)}</b></p><p>Paid<br/><b className="text-emerald-600">{fc(workerPaid(payWorker.id),sym)}</b></p><p>Pending<br/><b className="text-red-600">{fc(workerDue(payWorker.id),sym)}</b></p></div>{payableDue<=0&&<div className="bg-amber-50 border border-amber-100 text-amber-700 rounded-xl p-3 text-sm font-semibold">Only Done/Closed event assignments remain. Worker payment is locked.</div>}<div className="space-y-2"><p className="text-xs font-bold text-gray-500 uppercase">Assignments</p>{payRows.map(ew=><div key={ew.id} className="flex justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2 text-sm"><span>{ew.event?.title} · {ew.jobDesc}{isEventLocked(ew.event)&&<b className="ml-2 text-[10px] text-amber-600">Locked</b>}</span><b>{fc(ew.fee,sym)}</b></div>)}</div><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Worker Payment Amount</label><input aria-label="Worker Payment Amount" type="number" max={payableDue} disabled={payableDue<=0} value={workerPayAmount} onChange={e=>setWorkerPayAmount(e.target.value)} className={inp}/></div><div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Payment Date</label><input type="date" value={workerPayDate} onChange={e=>setWorkerPayDate(e.target.value)} className={inp}/></div><div className="flex gap-3"><button onClick={()=>setPayWorker(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50">Cancel</button><button onClick={saveWorkerPayment} disabled={payableDue<=0} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50">Save Worker Payment</button></div></div></Modal>}
      {editWorker!==null&&<WorkerModal worker={editWorker} onSave={w=>{setWorkers(w.id&&workers.find(x=>x.id===w.id)?workers.map(x=>x.id===w.id?w:x):[...workers,w]);setEditWorker(null);}} onClose={()=>setEditWorker(null)}/>}      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6"><div><h1 className="text-2xl font-bold text-gray-800">Workers</h1><p className="text-gray-500 text-sm mt-0.5">{workers.length} workers · compact payable cards</p></div><div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2"><input placeholder="Search workers" value={search} onChange={e=>setSearch(e.target.value)} className={inp}/><select aria-label="Worker sort" value={sort} onChange={e=>setSort(e.target.value)} className={inp}><option value="name">Sort: Name</option><option value="pending">Sort: Pending</option><option value="paid">Sort: Paid</option><option value="assignments">Sort: Assignments</option></select><button onClick={()=>setEditWorker({})} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">+ Add Worker</button></div></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"><div className="bg-white rounded-2xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500 uppercase">Total Worker Fee</p><p className="text-2xl font-bold text-orange-600">{fc(totalWorkerPayroll,sym)}</p></div><div className="bg-white rounded-2xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500 uppercase">PAID</p><p className="text-2xl font-bold text-emerald-600">{fc(totalPaidWorkers,sym)}</p></div><div className="bg-white rounded-2xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500 uppercase">PENDING</p><p className="text-2xl font-bold text-red-600">{fc(totalPendingWorkers,sym)}</p></div></div>
      <div className="space-y-3 mb-6"><h2 className="font-bold text-gray-700">Worker Payables</h2>{visibleWorkers.map(w=>{const total=workerTotal(w.id), paid=workerPaid(w.id), due=workerDue(w.id), asgn=workerRows(w.id); return <div key={w.id} className="bg-white rounded-2xl border border-gray-100 p-4"><div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_auto] gap-3"><div className="flex items-center gap-3"><Avatar name={w.name} size="sm" color="from-orange-400 to-red-500"/><div><p className="font-bold text-gray-800">{w.name}</p><p className="text-xs text-gray-500">{w.jobDesc}</p><p className="text-xs text-gray-400">{w.phone||w.email||"—"}</p></div></div><div><p className="text-xs text-gray-500">{asgn.length} event{asgn.length!==1?"s":""}</p><div className="text-[11px] text-gray-500 break-words">{latestPaymentText(w.id)}</div></div><div className="grid grid-cols-3 gap-2 text-xs lg:text-right"><p>STANDARD<br/><b>{fc(w.fee,sym)}</b></p><p>PAID<br/><b className="text-emerald-600">{fc(paid,sym)}</b></p><p>PENDING<br/><b className="text-red-600">{fc(due,sym)}</b></p></div></div><div className="flex flex-wrap gap-2 mt-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${sc(w.status)}`}>{w.status}</span><button onClick={()=>{setPayWorker(w);setWorkerPayAmount(workerPayableDue(w.id));}} disabled={workerPayableDue(w.id)<=0} className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-50">Pay Worker</button><button onClick={()=>setViewWorker(viewWorker===w.id?null:w.id)} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-sm font-bold">Details</button><button onClick={()=>setEditWorker(w)} className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm font-bold">Edit</button><button onClick={()=>setWorkers(workers.filter(x=>x.id!==w.id))} className="bg-gray-100 text-gray-500 px-3 py-2 rounded-xl text-sm font-bold">Remove</button></div></div>})}{visibleWorkers.length===0&&<p className="text-sm text-gray-400 bg-white rounded-2xl p-4 border border-gray-100">No results</p>}</div>
      {sel&&<div className="bg-white rounded-2xl border border-gray-100 p-5"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"><div><h3 className="font-bold text-gray-800">{sel.name} — Payment & Income Details</h3><p className="text-sm text-gray-500">Paid {fc(workerPaid(sel.id),sym)} · Pending {fc(workerDue(sel.id),sym)}</p></div><button onClick={()=>{setPayWorker(sel);setWorkerPayAmount(workerPayableDue(sel.id));}} disabled={workerPayableDue(sel.id)<=0} className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-50">Pay Worker</button></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div><h4 className="text-sm font-bold text-gray-600 mb-3">Income by Event</h4>{selAssignments.length===0?<p className="text-sm text-gray-400 italic">No assignments yet.</p>:<div className="space-y-2">{selAssignments.map(ew=><div key={ew.id} className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3"><div><p className="text-sm font-semibold text-gray-800">{ew.event?.title}</p><p className="text-xs text-gray-500">{ew.jobDesc} · {fd(ew.event?.date)}</p></div><span className="font-bold text-orange-700">{fc(ew.fee,sym)}</span></div>)}</div>}</div><div><h4 className="text-sm font-bold text-gray-600 mb-3">Payment Ledger</h4>{workerPayments.filter(p=>p.workerId===sel.id).length===0?<p className="text-sm text-gray-400 italic">No payments yet.</p>:<div className="space-y-2">{workerPayments.filter(p=>p.workerId===sel.id).map(p=><div key={p.id} className="flex justify-between bg-gray-50 rounded-xl px-4 py-2 text-sm"><span>{p.label} · {fd(p.date)}</span><b>{fc(p.amount,sym)}</b></div>)}</div>}</div></div></div>}
    </div>
  );
}


// ─── EVENTS TAB ───────────────────────────────────────────────────────────────
function EventsTab({events, setEvents, clients, workers, eventWorkers, setEventWorkers, workerPayments=[], purchases, setPurchases, vendors, quotes, invoices, sym, onCreatePO}) {
  const [expanded,setExpanded] = useState(null);
  const [expandSection,setExpandSection] = useState("quotations");
  const [poQuoteByEvent,setPoQuoteByEvent] = useState({});
  const [cancelEvent,setCancelEvent] = useState(null);
  const [cancelReason,setCancelReason] = useState("");
  const [eventSearch,setEventSearch] = useState("");
  const [dateFrom,setDateFrom] = useState("");
  const [dateTo,setDateTo] = useState("");
  const [dateSort,setDateSort] = useState("asc");
  const [statusFilter,setStatusFilter] = useState("all");
  const typeIcon = (t)=>({Wedding:"💍",Corporate:"🏢",Birthday:"🎂",Concert:"🎵","Equipment Rental":"🎪"}[t]||"🎉");
  const linked = (evId) => ({quotes:quotes.filter(q=>q.eventId===evId), invoices:invoices.filter(i=>i.eventId===evId), workers:eventWorkers.filter(x=>x.eventId===evId), purchases:purchases.filter(x=>x.eventId===evId)});
  const workerPaidForEventRow = (ew)=>workerPayments.filter(p=>(p.eventWorkerId===ew.id || (!p.eventWorkerId && p.eventId===ew.eventId && p.workerId===ew.workerId)) && p.status!=="Voided").reduce((s,p)=>s+Number(p.amount||0),0);
  const itemNote = (it)=>it.description||it.note||it.details||"";
  const createPOFromQuote = (ev, q) => {
    if(!q) { alert("Pilih quotation dulu sebelum Create PO."); return; }
    if(isEventLocked(ev)) { alert("Event sudah closed. PO baru tidak bisa dibuat."); return; }
    onCreatePO?.({eventId:ev.id,quotationId:q.id,items:(q.items||[]).map((it,i)=>({id:Date.now()+i,quoteItemId:it.id||i,item:it.desc||it.item,description:itemNote(it),category:"Materials",qty:it.qty||1,unitPrice:it.price||it.unitPrice||0,vendor:""})),notes:`From quotation ${q.number}`});
  };
  const closeBlockers = (evId) => {
    const invDebt = invoices.filter(i=>i.eventId===evId).reduce((s,i)=>s+Math.max(0, Number(i.total||0)-Number(i.paid||0)),0);
    const poDebt = purchases.filter(p=>p.eventId===evId).reduce((s,p)=>s+purchaseDebt(p),0);
    const workerDebt = eventWorkers.filter(w=>w.eventId===evId).reduce((s,w)=>s+Math.max(0, Number(w.fee||0)-workerPaidForEventRow(w)),0);
    return { invDebt, poDebt, workerDebt, total: invDebt+poDebt+workerDebt };
  };
  const markDone = (ev) => { const b=closeBlockers(ev.id); if(b.total>0){ alert(`Event belum bisa ditutup. Invoice unpaid: ${fc(b.invDebt,sym)}, PO/vendor debt: ${fc(b.poDebt,sym)}, worker debt: ${fc(b.workerDebt,sym)}`); return; } setEvents(p=>p.map(x=>x.id===ev.id?{...x,status:"Done"}:x)); };
  const confirmCancel = () => { if(!cancelEvent || !cancelReason.trim()) return; setEvents(p=>p.map(x=>x.id===cancelEvent.id?{...x,status:"Cancelled",cancelledAt:new Date().toISOString(),cancelReason:cancelReason.trim(),cancelledBy:"Owner"}:x)); setCancelEvent(null); setCancelReason(""); };
  const cardEvents = [...events].filter(ev=>{
    const hay=[ev.title,ev.client,ev.venue,ev.type,ev.status].join(" ").toLowerCase();
    return (!eventSearch || hay.includes(eventSearch.toLowerCase())) && (statusFilter==="all" || ev.status===statusFilter) && (!dateFrom || String(ev.date||"")>=dateFrom) && (!dateTo || String(ev.date||"")<=dateTo);
  }).sort((a,b)=>dateSort==="asc"?new Date(a.date||0)-new Date(b.date||0):new Date(b.date||0)-new Date(a.date||0));
  const nextEvents = cardEvents.filter(e=>new Date(e.date||0)>=new Date(new Date().toDateString())).slice(0,8);
  return <div className="p-4 md:p-8 overflow-x-hidden">
    {cancelEvent&&<Modal title="Cancel Event" onClose={()=>{setCancelEvent(null);setCancelReason("");}} maxW="max-w-lg"><div className="space-y-4"><div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="font-bold text-red-700">{cancelEvent.title}</p><p className="text-sm text-red-600 mt-1">Cancellation keeps quotations, invoices, purchases, and worker fees for audit and finance reports.</p></div><textarea rows={4} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Reason for cancellation" className={inp+" resize-none"}/><div className="flex gap-3"><button onClick={()=>{setCancelEvent(null);setCancelReason("");}} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50">Close</button><button onClick={confirmCancel} disabled={!cancelReason.trim()} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50">Confirm Cancel</button></div></div></Modal>}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6"><div><h1 className="text-2xl font-bold text-gray-800">Events</h1><p className="text-gray-500 text-sm mt-0.5">{cardEvents.length} shown · no schedule table, cards expand into quotation/PO/worker detail</p></div></div>
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5"><input value={eventSearch} onChange={e=>setEventSearch(e.target.value)} placeholder="Search events" className={inp}/><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className={inp} aria-label="Event status filter"><option value="all">All Status</option>{["Planning","Confirmed","Approved","Done","Cancelled"].map(s=><option key={s}>{s}</option>)}</select><input aria-label="From Date" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className={inp}/><input aria-label="To Date" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className={inp}/><select aria-label="Sort by Date" value={dateSort} onChange={e=>setDateSort(e.target.value)} className={inp}><option value="asc">Sort by Date ↑</option><option value="desc">Sort by Date ↓</option></select></div>
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-gray-800">Event Filters Summary</h2>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600"><span>{cardEvents.length} events</span><span>{cardEvents.reduce((s,e)=>s+linked(e.id).quotes.length,0)} quotes</span><span>{cardEvents.reduce((s,e)=>s+linked(e.id).purchases.length,0)} PO</span><span>{cardEvents.reduce((s,e)=>s+linked(e.id).workers.length,0)} workers</span></div>
      </div>
    </div>
    <div className="space-y-4">{cardEvents.map(ev=>{ const l=linked(ev.id), ew=l.workers, ep=l.purchases, eq=l.quotes; const isOpen=expanded===ev.id; const quoteTotal=eq.reduce((s,q)=>s+Number(q.total||0),0); const blocked=closeBlockers(ev.id); const selectedQuote=eq.find(q=>q.id===poQuoteByEvent[ev.id])||eq[0]; const locked=isEventLocked(ev); return <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 hover:shadow-sm transition overflow-hidden"><div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-2xl flex-shrink-0">{typeIcon(ev.type)}</div><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2 mb-0.5"><h3 className="font-bold text-gray-800">{ev.title}</h3><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc(ev.status)}`}>{ev.status}</span>{locked&&<span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">Locked</span>}</div><p className="text-sm text-gray-500">{ev.client||"No client"}{ev.venue?` · ${ev.venue}`:""}</p><p className="text-xs text-gray-400 mt-0.5">{fd(ev.date)} · 📋 {eq.length} quotation{eq.length!==1?"s":""} ({fc(quoteTotal,sym)}) · 👷 {ew.length} worker{ew.length!==1?"s":""} · 🛒 {ep.length} purchase{ep.length!==1?"s":""}</p>{blocked.total>0&&<p className="text-xs text-red-600 mt-1">Unpaid before close: invoice {fc(blocked.invDebt,sym)} · PO {fc(blocked.poDebt,sym)} · worker {fc(blocked.workerDebt,sym)}</p>}{ev.cancelReason&&<p className="text-xs text-red-600 mt-1">Cancelled: {ev.cancelReason}</p>}</div><div className="flex flex-wrap items-center gap-2 flex-shrink-0"><button onClick={()=>{setExpanded(isOpen&&expandSection==="quotations"?null:ev.id);setExpandSection("quotations");}} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700">Quotation</button><button onClick={()=>{setExpanded(isOpen&&expandSection==="purchases"?null:ev.id);setExpandSection("purchases");}} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700">Purchase</button>{!locked&&ev.status!=="Cancelled"&&<button onClick={()=>markDone(ev)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Mark Done</button>}{ev.status!=="Cancelled"&&!locked&&<button onClick={()=>setCancelEvent(ev)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">Cancel</button>}</div></div>{isOpen&&<div className="border-t border-gray-100 p-4 md:p-5 bg-gray-50"><div className="flex flex-wrap gap-2 mb-4">{["quotations","purchases","workers"].map(x=><button key={x} onClick={()=>setExpandSection(x)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${expandSection===x?"bg-gray-900 text-white":"bg-white text-gray-600"}`}>{x}</button>)}</div>{expandSection==="quotations"&&<div className="space-y-3"><h4 className="font-bold text-gray-700">Rincian Quotation</h4>{eq.length?eq.map(q=><div key={q.id} className="bg-white rounded-xl p-3 border border-gray-100"><div className="flex flex-wrap justify-between gap-3"><div><b>{q.number}</b><p className="text-sm text-gray-600">{q.description||q.eventTitle||ev.title}</p></div><span className="font-bold text-blue-700">{fc(q.total,sym)}</span></div><div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">{(q.items||[]).map((it,i)=><div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs"><div className="flex justify-between gap-2"><b>{it.desc||it.item}</b><span>{it.qty} × {fc(it.price||it.unitPrice,sym)}</span></div>{itemNote(it)&&<p className="text-gray-500 mt-1">{itemNote(it)}</p>}<p className="text-right font-bold text-gray-700 mt-1">{fc(Number(it.qty||0)*Number(it.price||it.unitPrice||0),sym)}</p></div>)}</div>{!locked&&<button onClick={()=>createPOFromQuote(ev,q)} className="mt-3 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl">Create PO from this Quotation</button>}</div>):<p className="text-sm text-gray-400">No quotations</p>}</div>}{expandSection==="purchases"&&<div className="space-y-3"><h4 className="font-bold text-gray-700">Rincian Purchase</h4><div className="bg-white rounded-xl p-3 border border-gray-100 flex flex-col md:flex-row gap-2 md:items-end"><label className="text-xs font-semibold text-gray-500 uppercase flex-1">Quotation untuk PO<select value={selectedQuote?.id||""} onChange={e=>setPoQuoteByEvent(p=>({...p,[ev.id]:Number(e.target.value)}))} className={inp+" mt-1"}><option value="">Pilih quotation event</option>{eq.map(q=><option key={q.id} value={q.id}>{q.number} — {fc(q.total,sym)}</option>)}</select></label><button disabled={!selectedQuote||locked} onClick={()=>createPOFromQuote(ev,selectedQuote)} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">Create PO</button></div>{ep.length?ep.map(po=><div key={po.id} className="bg-white rounded-xl p-3 border border-gray-100"><div className="flex flex-wrap justify-between gap-3"><div><b>{po.poNumber}</b><p className="text-sm text-gray-600">{po.vendor} · {purchaseStatus(po)}</p></div><div className="text-right"><p className="font-bold text-emerald-700">{fc(purchaseTotal(po),sym)}</p><p className="text-xs text-gray-500">Paid {fc(purchasePaid(po),sym)} · Balance {fc(purchaseDebt(po),sym)}</p></div></div>{poItems(po).map((it,i)=><div key={i} className="text-xs text-gray-500 mt-1"><b>{it.item}</b> · {it.qty} x {fc(it.unitPrice,sym)}{(it.description||it.note)&&<p>{it.description||it.note}</p>}</div>)}{purchasePayments(po).length>0&&<p className="text-[11px] text-gray-500 mt-2">{purchasePayments(po).map(x=>`${x.label}: ${fc(x.amount,sym)}${x.status==="Voided"?" (Voided)":""}`).join(" · ")}</p>}</div>):<p className="text-sm text-gray-400">No purchase orders</p>}</div>}{expandSection==="workers"&&<div className="space-y-2"><h4 className="font-bold text-gray-700">Rincian Worker</h4>{ew.length?ew.map(row=>{const worker=workers.find(x=>x.id===row.workerId); const paid=workerPaidForEventRow(row); const pending=Math.max(0,Number(row.fee||0)-paid); return <div key={row.id} className="bg-white rounded-xl p-3 border border-gray-100 flex justify-between gap-3"><div><b>{worker?.name||'Worker'}</b><p className="text-sm text-gray-600">{row.jobDesc}</p></div><div className="text-right"><p className="font-bold text-orange-700">{fc(row.fee,sym)}</p><p className="text-xs text-gray-500">Paid {fc(paid,sym)} · Pending {fc(pending,sym)}</p></div></div>}):<p className="text-sm text-gray-400">No workers</p>} {!locked&&<EventWorkerRow eventId={ev.id} workers={workers} eventWorkers={eventWorkers} setEventWorkers={setEventWorkers}/>}</div>}</div>}</div>})}</div>
    {cardEvents.length===0&&<p className="text-center text-gray-400 py-8 bg-white rounded-2xl border border-gray-100">No events found.</p>}
  </div>;
}


// ─── REPORTS TAB ───────────────────────────────────────────────────────────────

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const routeToTab = () => {
    const last = window.location.pathname.split("/").filter(Boolean).pop();
    return ["events","quotes","invoices","purchases","finance","reports","clients","vendors","workers","settings"].includes(last||"") ? last : "dashboard";
  };
  const [tab,setTabState] = useState(routeToTab);
  const setTab = (next) => {
    setTabState(next);
    const path = next === "dashboard" ? `${BASE_PATH}/` : `${BASE_PATH}/${next}`;
    window.history.pushState({tab: next}, "", path);
  };
  const [clients,setClients] = useState(DEFAULT_STATE.clients);
  const [vendors,setVendors] = useState(DEFAULT_STATE.vendors);
  const [workers,setWorkers] = useState(DEFAULT_STATE.workers);
  const [events,setEvents] = useState(DEFAULT_STATE.events);
  const [quotes,setQuotes] = useState(DEFAULT_STATE.quotes);
  const [invoices,setInvoices] = useState(DEFAULT_STATE.invoices);
  const [eventWorkers,setEventWorkers] = useState(DEFAULT_STATE.eventWorkers);
  const [purchases,setPurchases] = useState(DEFAULT_STATE.purchases);
  const [company,setCompany] = useState(DEFAULT_STATE.company);
  const [currency,setCurrency] = useState(DEFAULT_STATE.currency);
  const [auditLog,setAuditLog] = useState(DEFAULT_STATE.auditLog);
  const [items,setItems] = useState(DEFAULT_STATE.items || []);
  const [workerPayments,setWorkerPayments] = useState(DEFAULT_STATE.workerPayments || []);
  const [pendingPO,setPendingPO] = useState(null);
  const [clientSearch,setClientSearch] = useState("");
  const [clientSort,setClientSort] = useState("name");
  const [vendorSearch,setVendorSearch] = useState("");
  const [vendorSort,setVendorSort] = useState("name");
  const [mobileMoreOpen,setMobileMoreOpen] = useState(false);
  const [syncStatus,setSyncStatus] = useState("loading");
  const [hydrated,setHydrated] = useState(false);
  const sym = CURRENCIES.find(c=>c.code===currency)?.symbol||"₱";

  useEffect(() => {
    const onPop = () => setTabState(routeToTab());
    window.addEventListener("popstate", onPop);
    fetch(apiUrl("/api/state"))
      .then(safeJson)
      .then(data => {
        const state = normalizeDashboardState({...DEFAULT_STATE, ...(data.state || {})});
        setClients(state.clients || DEFAULT_STATE.clients);
        setVendors(state.vendors || DEFAULT_STATE.vendors);
        setWorkers(state.workers || DEFAULT_STATE.workers);
        setEvents(state.events || DEFAULT_STATE.events);
        setQuotes(state.quotes || DEFAULT_STATE.quotes);
        setInvoices(state.invoices || DEFAULT_STATE.invoices);
        setEventWorkers(state.eventWorkers || DEFAULT_STATE.eventWorkers);
        setPurchases(state.purchases || DEFAULT_STATE.purchases);
        setCompany(state.company || DEFAULT_STATE.company);
        setCurrency(state.currency || DEFAULT_STATE.currency);
        setAuditLog(state.auditLog || DEFAULT_STATE.auditLog);
        setItems(state.items || []);
        setWorkerPayments(state.workerPayments || []);
        setSyncStatus("saved");
      })
      .catch(() => setSyncStatus("offline"))
      .finally(() => setHydrated(true));
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSyncStatus("saving");
    const payload = normalizeDashboardState({clients,vendors,workers,events,quotes,invoices,eventWorkers,purchases,company,currency,auditLog,items,workerPayments});
    const t = window.setTimeout(() => {
      fetch(apiUrl("/api/state"), {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({state:payload})})
        .then(safeJson)
        .then(() => setSyncStatus("saved"))
        .catch(() => setSyncStatus("offline"));
    }, 350);
    return () => window.clearTimeout(t);
  }, [hydrated, clients, vendors, workers, events, quotes, invoices, eventWorkers, purchases, company, currency, auditLog, items, workerPayments]);

  // modals
  const [showQuoteModal,setShowQuoteModal] = useState(false);
  const [showInvoiceModal,setShowInvoiceModal] = useState(false);
  const [editingQuote,setEditingQuote] = useState(null);
  const [editingInvoice,setEditingInvoice] = useState(null);
  const [payInvoice,setPayInvoice] = useState(null);
  const [expandedInvoice,setExpandedInvoice] = useState(null);
  const [printQuote,setPrintQuote] = useState(null);
  const [printInvoice,setPrintInvoice] = useState(null);
  const [printReport,setPrintReport] = useState(null);
  const [printPO,setPrintPO] = useState(null);
  const [editClient,setEditClient] = useState(null);
  const [editVendor,setEditVendor] = useState(null);

  // stats
  const invoicePaid = (i)=>(i.payments||[]).reduce((s,p)=>s+Number(p.amount||0), Number(i.paid||0));
  const totalPaid = invoices.reduce((s,i)=>s+invoicePaid(i),0);
  const totalOutstanding = invoices.reduce((s,i)=>s+(Number(i.total||0)-invoicePaid(i)),0);
  const totalCosts = purchases.reduce((s,p)=>s+purchaseTotal(p),0) + eventWorkers.reduce((s,ew)=>s+ew.fee,0);
  const profit = totalPaid - totalCosts;
  const typeIcon = (t)=>({Wedding:"💍",Corporate:"🏢",Birthday:"🎂",Concert:"🎵","Equipment Rental":"🎪"}[t]||"🎉");

  const nav = [
    {id:"dashboard",icon:"⬛",label:"Dashboard"},
    {id:"events",icon:"📅",label:"Events"},
    {id:"quotes",icon:"📋",label:"Quotations"},
    {id:"invoices",icon:"🧾",label:"Invoices"},
    {id:"purchases",icon:"🛒",label:"Purchases"},
    {id:"finance",icon:"📊",label:"Finance"},
    {id:"reports",icon:"📑",label:"Reports"},
    {id:"clients",icon:"👥",label:"Clients"},
    {id:"vendors",icon:"🏪",label:"Vendors"},
    {id:"workers",icon:"👷",label:"Workers"},
    {id:"settings",icon:"⚙️",label:"Settings"},
  ];

  const mobilePrimaryNav = nav.filter(n=>["dashboard","events","quotes","purchases","finance"].includes(n.id));
  const mobileMoreNav = nav.filter(n=>!["dashboard","events","quotes","purchases","finance"].includes(n.id));

  const addAudit = (action, entityType, entityLabel, note="") => setAuditLog(p=>[{id:Date.now()+Math.random(),at:new Date().toISOString(),actor:"Owner",action,entityType,entityLabel,note},...(p||[])]);

  const saveQuote = ({quote,newEvent})=>{
    setQuotes(p=>renumberQuotesByMonth(quote.id&&p.find(x=>x.id===quote.id)?p.map(x=>x.id===quote.id?quote:x):[quote,...p]));
    setItems(prev=>{ const rows=[...(prev||[])]; (quote.items||[]).forEach(it=>{ const name=(it.desc||it.item||"").trim(); if(name&&!rows.some(x=>(x.name||"").toLowerCase()===name.toLowerCase())) rows.push({id:Date.now()+Math.random(),name,type:"Sales",price:Number(it.price||0)}); }); return rows; });
    if(newEvent) { setEvents(p=>[...p,newEvent]); const q2={...quote,eventId:newEvent.id,eventTitle:newEvent.title,eventDate:newEvent.date}; setQuotes(p=>p.map(x=>x.id===q2.id?q2:x)); }
    setShowQuoteModal(false); setEditingQuote(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 md:flex overflow-x-hidden" style={{fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 bg-gray-900 flex-col min-h-screen sticky top-0 shrink-0">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3 min-w-0">
            {company.logo?<img src={company.logo} alt="logo" className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5"/>
              :<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black">{company.name?.charAt(0)}</div>}
            <div><p className="font-bold text-white text-sm leading-tight">{company.name}</p><p className="text-xs text-gray-400 truncate max-w-[120px]">{company.tagline}</p></div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${tab===n.id?"bg-red-600 text-white":"text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
              <span className="text-base">{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-700 space-y-2">
          <p className="text-xs text-gray-500 text-center italic">"Your Event, Our Passion"</p>
          <div className={`text-[11px] text-center rounded-lg px-2 py-1 ${syncStatus==="saved"?"bg-emerald-900/40 text-emerald-200":syncStatus==="saving"?"bg-amber-900/40 text-amber-200":"bg-red-900/40 text-red-200"}`}>Backend: {syncStatus}</div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-gray-900 text-white border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {company.logo?<img src={company.logo} alt="logo" className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5"/>
            :<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black shrink-0">{company.name?.charAt(0)}</div>}
          <div className="min-w-0"><p className="font-bold text-sm leading-tight truncate">{company.name}</p><p className="text-[11px] text-gray-400 truncate">{nav.find(n=>n.id===tab)?.label || "Dashboard"}</p></div>
        </div>
        <div className={`text-[10px] rounded-lg px-2 py-1 shrink-0 ${syncStatus==="saved"?"bg-emerald-900/40 text-emerald-200":syncStatus==="saving"?"bg-amber-900/40 text-amber-200":"bg-red-900/40 text-red-200"}`}>{syncStatus}</div>
      </div>

      {/* Main */}
      <main className="min-w-0 flex-1 overflow-x-hidden pb-24 md:pb-0">

        {/* Dashboard */}
        {tab==="dashboard"&&(
          <div className="p-3 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
              <div><h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-gray-500 text-sm">Control center · click any row to open detail.</p></div>
              <div className="text-xs text-gray-400">Backend: {syncStatus}</div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
              {[
                {label:"Revenue",value:totalPaid,money:true,tab:"finance",tone:"text-emerald-700"},
                {label:"Outstanding",value:totalOutstanding,money:true,tab:"invoices",tone:"text-amber-700"},
                {label:"Profit",value:profit,money:true,tab:"finance",tone:profit>=0?"text-blue-700":"text-red-700"},
                {label:"Events",value:events.length,money:false,tab:"events",tone:"text-red-700"},
                {label:"PO",value:purchases.length,money:false,tab:"purchases",tone:"text-indigo-700"},
              ].map((s,i)=>(
                <button key={i} onClick={()=>setTab(s.tab)} className="rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-red-200 hover:bg-red-50/40 transition min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{s.label}</p>
                  <p className={`text-base md:text-xl font-black truncate ${s.tone}`}>{s.money?fc(s.value,sym):formatCount(s.value)}</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"><h2 className="font-bold text-gray-800">Next Actions</h2><button onClick={()=>setTab("events")} className="text-xs font-bold text-red-600">Open Events</button></div>
                <div className="divide-y divide-gray-100">
                  {events.filter(e=>new Date(e.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,6).map(e=>(
                    <button key={e.id} onClick={()=>setTab("events")} className="w-full grid grid-cols-[74px_1fr_auto] gap-3 items-center text-left px-4 py-3 hover:bg-gray-50 min-w-0">
                      <span className="text-xs font-bold text-gray-500">{fd(e.date)}</span>
                      <span className="min-w-0"><span className="block text-sm font-bold text-gray-800 truncate">{e.title}</span><span className="block text-xs text-gray-500 truncate">{e.client||"No client"}</span></span>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${sc(e.status)}`}>{e.status}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"><h2 className="font-bold text-gray-800">Invoices</h2><button onClick={()=>setTab("invoices")} className="text-xs font-bold text-red-600">Open</button></div>
                <div className="divide-y divide-gray-100">
                  {invoices.slice(0,6).map(inv=>(
                    <button key={inv.id} onClick={()=>setTab("invoices")} className="w-full grid grid-cols-[1fr_auto] gap-3 text-left px-4 py-3 hover:bg-gray-50 min-w-0">
                      <span className="min-w-0"><span className="block text-sm font-bold text-gray-800 truncate">{inv.number} · {inv.client}</span><span className="block text-xs text-gray-500 truncate">Due {fd(inv.due)} · {inv.status}</span></span>
                      <span className="text-sm font-black text-gray-800">{fc(inv.total,sym)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==="events"&&<EventsTab events={events} setEvents={setEvents} clients={clients} workers={workers} eventWorkers={eventWorkers} setEventWorkers={setEventWorkers} workerPayments={workerPayments} purchases={purchases} setPurchases={setPurchases} vendors={vendors} quotes={quotes} invoices={invoices} sym={sym} onCreatePO={(po)=>{setPendingPO(po);setTab("purchases");}}/>}

        {/* Quotes */}
        {tab==="quotes"&&(
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div><h1 className="text-2xl font-bold text-gray-800">Quotations</h1><p className="text-gray-500 text-sm mt-0.5">{quotes.length} quotes · New quote creates a new event</p></div>
              <button onClick={()=>{setEditingQuote(null);setShowQuoteModal(true);}} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">✨ New Quote</button>
            </div>
            <div className="space-y-3">
              {quotes.map(q=>{ const qEvent=events.find(e=>e.id===Number(q.eventId)); const qLocked=isEventLocked(qEvent); return (
                <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-wrap items-center gap-3"><span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded-lg">{q.number}</span><span className={`text-xs px-2 py-1 rounded-full font-medium ${sc(q.status)}`}>{q.status}</span>{qLocked&&<span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">Locked event</span>}</div>
                    <span className="font-bold text-gray-800 text-lg">{fc(q.total,sym)}</span>
                  </div>
                  <p className="font-semibold text-gray-700">{q.client}</p>
                  <p className="text-sm text-gray-500">{q.eventTitle||qEvent?.title||"No event"} · Generated {fd(q.generatedDate||q.date)}{q.eventDate?` · Event ${fd(q.eventDate)}`:""}</p>{q.description&&<p className="text-sm text-gray-600 mt-1">{q.description}</p>}<div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">{(q.items||[]).slice(0,4).map((it,i)=><div key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-xs"><b>{it.desc||it.item}</b>{(it.note||it.description)&&<p className="text-gray-500 mt-0.5">{it.note||it.description}</p>}</div>)}</div>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <button onClick={()=>setPrintQuote(q)} className="text-sm text-indigo-600 hover:underline font-medium">🖨️ Print</button>
                    {!qLocked&&<button onClick={()=>{setEditingQuote(q);setShowQuoteModal(true);}} className="text-sm text-red-600 hover:underline font-medium">Edit</button>}
                    {!qLocked&&<button onClick={()=>setQuotes(quotes.filter(x=>x.id!==q.id))} className="text-sm text-gray-400 hover:underline font-medium">Delete</button>}
                    {!qLocked&&<button onClick={()=>{
                      setInvoices(p=>{ const date=ymd(); return [...p,{id:Date.now(),number:docNo("invoice",date,p),client:q.client,eventId:q.eventId,eventTitle:q.eventTitle||"",date,due:"",total:q.total,paid:0,status:"Unpaid",attachments:q.attachments||[],items:(q.items||[]).map((it,i)=>({id:it.id||i,desc:it.desc||it.item,note:it.note||it.description||"",qty:it.qty||1,price:it.price??it.unitPrice??0}))}]; });
                      setQuotes(p=>p.map(x=>x.id===q.id?{...x,status:"Approved"}:x));
                      if(q.eventId) setEvents(p=>p.map(ev=>ev.id===q.eventId?{...ev,status:"Approved"}:ev));
                      setTab("invoices");
                    }} className="text-sm text-blue-600 hover:underline font-medium">→ Convert to Invoice</button>}
                    {!qLocked&&<button onClick={()=>{setPendingPO({eventId:q.eventId||"", items:(q.items||[]).map((it,i)=>({id:Date.now()+i,item:it.desc||it.item,description:it.note||it.description||"",category:"Materials",qty:it.qty,unitPrice:it.price??it.unitPrice})), notes:`From quotation ${q.number}`}); setTab("purchases");}} className="text-sm text-emerald-600 hover:underline font-medium">Create PO</button>}
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}

        {/* Invoices */}
        {tab==="invoices"&&(
          <div className="p-4 md:p-8 overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <div><h1 className="text-2xl font-bold text-gray-800">Invoices</h1><p className="text-gray-500 text-sm mt-0.5">{invoices.length} invoices · expandable cards</p></div>
              <button onClick={()=>{setEditingInvoice(null);setShowInvoiceModal(true);}} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">+ New Invoice</button>
            </div>
            <div className="space-y-3">
              {invoices.map(inv=>{
                const paid=invoicePaid(inv);
                const balance=Number(inv.total||0)-paid;
                const pct=inv.total>0?Math.min(100,(paid/Number(inv.total||0))*100):0;
                const open=expandedInvoice===inv.id;
                const invEvent=events.find(e=>e.id===Number(inv.eventId));
                const invLocked=isEventLocked(invEvent);
                return (
                  <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-2">
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded-lg">{inv.number}</span><span className={`text-xs px-2 py-1 rounded-full font-medium ${sc(inv.status)}`}>{inv.status}</span>{invLocked&&<span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">Locked event</span>}</div><p className="font-semibold text-gray-700 mt-2">{inv.client}{(inv.eventTitle||invEvent?.title)?` — ${inv.eventTitle||invEvent?.title}`:""}</p><p className="text-sm text-gray-500">Issued: {fd(inv.date)}{inv.due?` · Due: ${fd(inv.due)}`:""}</p></div>
                      <span className="font-bold text-gray-800 text-lg">{fc(inv.total,sym)}</span>
                    </div>
                    <div className="mt-3"><div className="flex justify-between text-xs text-gray-500 mb-1"><span>Paid: {fc(paid,sym)}</span><span>Balance: {fc(balance,sym)}</span></div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{width:`${pct}%`}}/></div></div>
                    {(inv.payments||[]).length>0&&<div className="mt-2 text-[11px] text-gray-500">{(inv.payments||[]).map(x=>`${x.label}: ${fc(x.amount,sym)}`).join(" · ")}</div>}
                    {(inv.items||[]).length>0&&<div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">{(inv.items||[]).slice(0,4).map((it,i)=><div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs"><b>{it.desc||it.item}</b>{(it.note||it.description)&&<p className="text-gray-500 mt-0.5">{it.note||it.description}</p>}</div>)}</div>}
                    <div className="flex flex-wrap gap-3 mt-3">
                      <button onClick={()=>setExpandedInvoice(open?null:inv.id)} className="text-sm text-blue-600 hover:underline font-bold">{open?"Hide Details":"Details"}</button>
                      <button onClick={()=>setPrintInvoice(inv)} className="text-sm text-indigo-600 hover:underline font-medium">🖨️ Print</button>
                      {!invLocked&&<button onClick={()=>{setEditingInvoice(inv);setShowInvoiceModal(true);}} className="text-sm text-red-600 hover:underline font-medium">Edit</button>}
                      {!invLocked&&<button onClick={()=>setPayInvoice(inv)} className="text-sm text-emerald-600 hover:underline font-bold">Add Payment</button>}
                      {!invLocked&&<button onClick={()=>{setInvoices(invoices.filter(x=>x.id!==inv.id)); addAudit("invoice.delete", "invoice", inv.number, "deleted");}} className="text-sm text-gray-400 hover:underline font-medium">Delete</button>}
                    </div>
                    {open&&<div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4"><div><p className="text-xs font-bold text-gray-500 uppercase mb-2">Invoice Items</p>{(inv.items||[]).length?(inv.items||[]).map((it,i)=><div key={i} className="bg-gray-50 rounded-xl p-3 text-sm mb-2"><div className="flex justify-between gap-2"><b>{it.desc||it.item}</b><span>{it.qty} × {fc(it.price??it.unitPrice,sym)}</span></div>{(it.note||it.description)&&<p className="text-xs text-gray-500 mt-1">{it.note||it.description}</p>}</div>):<p className="text-sm text-gray-400">No line items. Total entered manually.</p>}</div><div><p className="text-xs font-bold text-gray-500 uppercase mb-2">Payment Ledger</p>{(inv.payments||[]).length?(inv.payments||[]).map(x=><div key={x.id} className="bg-gray-50 rounded-xl p-3 text-sm mb-2 flex justify-between"><span>{x.label} · {fd(x.date)}</span><b>{fc(x.amount,sym)}</b></div>):<p className="text-sm text-gray-400">No payments yet.</p>}</div></div>}
                  </div>
                );
              })}
            </div>
            <div className="mt-6"><AuditLogPanel auditLog={auditLog}/></div>
          </div>
        )}

        {tab==="purchases"&&<PurchasesTab events={events} vendors={vendors} purchases={purchases} setPurchases={setPurchases} addAudit={addAudit} auditLog={auditLog} sym={sym} initialPO={pendingPO} onInitialPOUsed={()=>setPendingPO(null)} onPrintPO={(po)=>setPrintPO(po)} onItemsAdded={(rows)=>setItems(prev=>{const list=[...(prev||[])]; rows.forEach(it=>{const name=(it.item||it.name||"").trim(); if(name&&!list.some(x=>(x.name||"").toLowerCase()===name.toLowerCase())) list.push({id:Date.now()+Math.random(),name,type:"Purchase",price:Number(it.unitPrice||it.price||0)});}); return list;})}/>}
        {tab==="finance"&&<FinanceTab events={events} invoices={invoices} purchases={purchases} eventWorkers={eventWorkers} vendors={vendors} auditLog={auditLog} sym={sym}/>}
        {tab==="reports"&&<ReportsTab events={events} quotes={quotes} invoices={invoices} purchases={purchases} eventWorkers={eventWorkers} clients={clients} vendors={vendors} workers={workers} company={company} auditLog={auditLog} sym={sym} onPrint={(category)=>setPrintReport(category)}/>}
        {tab==="workers"&&<WorkersTab workers={workers} setWorkers={setWorkers} events={events} eventWorkers={eventWorkers} workerPayments={workerPayments} setWorkerPayments={setWorkerPayments} sym={sym}/>}

        {/* Clients */}
        {tab==="clients"&&(
          <div className="p-4 md:p-8 overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <div><h1 className="text-2xl font-bold text-gray-800">Clients</h1><p className="text-gray-500 text-sm mt-0.5">{clients.length} clients · compact cards</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2"><input placeholder="Search clients" value={clientSearch} onChange={e=>setClientSearch(e.target.value)} className={inp}/><select aria-label="Client sort" value={clientSort} onChange={e=>setClientSort(e.target.value)} className={inp}><option value="name">Sort: Name</option><option value="events">Sort: Events</option><option value="repeat">Sort: Repeat</option><option value="latest">Sort: Latest Event</option></select><button onClick={()=>setEditClient({})} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">+ Add Client</button></div>
            </div>
            <div className="space-y-3">
              {clients.filter(c=>!clientSearch||[c.name,c.email,c.phone,c.type].join(" ").toLowerCase().includes(clientSearch.toLowerCase())).sort((a,b)=>{ const ae=events.filter(e=>e.client===a.name), be=events.filter(e=>e.client===b.name); if(clientSort==="events") return be.length-ae.length; if(clientSort==="repeat") return Math.max(0,be.length-1)-Math.max(0,ae.length-1); if(clientSort==="latest") return String(be.map(e=>e.date).sort().pop()||"").localeCompare(String(ae.map(e=>e.date).sort().pop()||"")); return String(a.name).localeCompare(String(b.name)); }).map(c=>{ const clientEvents=events.filter(e=>e.client===c.name); const clientQuotes=quotes.filter(q=>q.client===c.name); const clientInvoices=invoices.filter(i=>i.client===c.name); const repeatOrders=Math.max(0,clientEvents.length-1); const lastEvent=clientEvents.map(e=>e.date).filter(Boolean).sort().pop(); return <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4"><div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_auto] gap-3"><div className="flex items-center gap-3"><Avatar name={c.name} size="sm" color="from-red-500 to-red-700"/><div><p className="font-bold text-gray-800">{c.name}</p><p className="text-xs text-gray-500">{c.address||"—"}</p><p className="text-xs text-gray-400">{c.phone||c.email||"—"}{c.phone&&c.email?` · ${c.email}`:""}</p></div></div><div className="grid grid-cols-3 gap-2 text-xs"><p>EVENTS<br/><b>{clientEvents.length}</b></p><p>QUOTES<br/><b>{clientQuotes.length}</b></p><p>INVOICES<br/><b>{clientInvoices.length}</b></p></div><div className="lg:text-right"><span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">{c.type}</span><p className="text-xs text-gray-500 mt-2">Repeat {repeatOrders}{lastEvent?` · Last ${fd(lastEvent)}`:""}</p></div></div><div className="flex flex-wrap gap-2 mt-3"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ACTIONS</span><button onClick={()=>setEditClient(c)} className="text-xs text-red-600 font-bold">Edit</button><button onClick={()=>{setClients(clients.filter(x=>x.id!==c.id)); addAudit("client.remove", "client", c.name, "removed");}} className="text-xs text-gray-400 font-bold">Remove</button></div></div>})}
              {clients.filter(c=>!clientSearch||[c.name,c.email,c.phone,c.type].join(" ").toLowerCase().includes(clientSearch.toLowerCase())).length===0&&<p className="text-sm text-gray-400 bg-white rounded-2xl p-4 border border-gray-100">No results</p>}
            </div>
          </div>
        )}

        {/* Vendors */}
        {tab==="vendors"&&(
          <div className="p-4 md:p-8 overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <div><h1 className="text-2xl font-bold text-gray-800">Vendors & Suppliers</h1><p className="text-gray-500 text-sm mt-0.5">{vendors.length} vendors · compact cards</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2"><input placeholder="Search vendors" value={vendorSearch} onChange={e=>setVendorSearch(e.target.value)} className={inp}/><select aria-label="Vendor sort" value={vendorSort} onChange={e=>setVendorSort(e.target.value)} className={inp}><option value="name">Sort: Name</option><option value="category">Sort: Category</option><option value="rate">Sort: Rate</option><option value="status">Sort: Status</option></select><button onClick={()=>setEditVendor({})} className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700">+ Add Vendor</button></div>
            </div>
            <div className="space-y-3">
              {vendors.filter(v=>!vendorSearch||[v.name,v.email,v.phone,v.category].join(" ").toLowerCase().includes(vendorSearch.toLowerCase())).sort((a,b)=>{ if(vendorSort==="rate") return Number(b.rate||0)-Number(a.rate||0); if(vendorSort==="category") return String(a.category||"").localeCompare(String(b.category||"")); if(vendorSort==="status") return String(a.status||"").localeCompare(String(b.status||"")); return String(a.name||"").localeCompare(String(b.name||"")); }).map(v=><div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4"><div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_auto] gap-3"><div className="flex items-center gap-3"><Avatar name={v.name} size="sm" color="from-indigo-500 to-violet-600"/><div><p className="font-bold text-gray-800">{v.name}</p><p className="text-xs text-gray-500">{v.address||"—"}</p><p className="text-xs text-gray-400">{v.phone||v.email||"—"}{v.phone&&v.email?` · ${v.email}`:""}</p></div></div><div><span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{v.category}</span><p className="text-sm text-gray-500 mt-2">Base Rate <b>{fc(v.rate,sym)}</b></p></div><div className="lg:text-right"><span className={`text-xs px-2 py-1 rounded-full font-medium ${sc(v.status)}`}>{v.status}</span></div></div><div className="flex flex-wrap gap-2 mt-3"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ACTIONS</span><button onClick={()=>setEditVendor(v)} className="text-xs text-red-600 font-bold">Edit</button><button onClick={()=>{setVendors(vendors.filter(x=>x.id!==v.id)); addAudit("vendor.remove", "vendor", v.name, "removed");}} className="text-xs text-gray-400 font-bold">Remove</button></div></div>)}
              {vendors.filter(v=>!vendorSearch||[v.name,v.email,v.phone,v.category].join(" ").toLowerCase().includes(vendorSearch.toLowerCase())).length===0&&<p className="text-sm text-gray-400 bg-white rounded-2xl p-4 border border-gray-100">No results</p>}
            </div>
          </div>
        )}


        {tab==="settings"&&<SettingsTab company={company} setCompany={setCompany} currency={currency} setCurrency={setCurrency}/>}
      </main>

      {/* Mobile Bottom Navigation */}
      {mobileMoreOpen&&(
        <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={()=>setMobileMoreOpen(false)}>
          <div className="absolute bottom-20 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3" onClick={e=>e.stopPropagation()}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 pb-2">More Menu</p>
            <div className="grid grid-cols-2 gap-2">
              {mobileMoreNav.map(n=>(
                <button key={n.id} onClick={()=>{setTab(n.id);setMobileMoreOpen(false);}} aria-label={n.label}
                  className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-bold ${tab===n.id?"bg-red-600 text-white":"bg-gray-50 text-gray-700"}`}>
                  <span>{n.icon}</span><span>{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur border-t border-gray-800 px-2 py-2 grid grid-cols-6 gap-1">
        {mobilePrimaryNav.map(n=>(
          <button key={n.id} onClick={()=>{setTab(n.id);setMobileMoreOpen(false);}} aria-label={n.label}
            className={`min-w-0 rounded-xl px-1 py-2 text-[10px] font-semibold flex flex-col items-center gap-0.5 ${tab===n.id?"bg-red-600 text-white":"text-gray-300"}`}>
            <span className="text-base leading-none">{n.icon}</span><span className="whitespace-nowrap">{n.label}</span>
          </button>
        ))}
        <button onClick={()=>setMobileMoreOpen(v=>!v)} aria-label="More"
          className={`min-w-0 rounded-xl px-1 py-2 text-[10px] font-semibold flex flex-col items-center gap-0.5 ${mobileMoreNav.some(n=>n.id===tab)||mobileMoreOpen?"bg-red-600 text-white":"text-gray-300"}`}>
          <span className="text-base leading-none">☰</span><span className="whitespace-nowrap">More</span>
        </button>
      </nav>

      {/* Modals */}
      {showQuoteModal&&<QuoteModal quote={editingQuote} quotes={quotes} clients={clients} events={events} onAddClient={client=>setClients(p=>[...p,client])} onSave={saveQuote} onClose={()=>{setShowQuoteModal(false);setEditingQuote(null);}} sym={sym}/>}
      {showInvoiceModal&&<InvoiceModal invoice={editingInvoice} invoices={invoices} clients={clients} events={events} onSave={inv=>{setInvoices(p=>editingInvoice?p.map(x=>x.id===inv.id?inv:x):[...p,inv]);setShowInvoiceModal(false);setEditingInvoice(null);}} onClose={()=>{setShowInvoiceModal(false);setEditingInvoice(null);}} sym={sym}/>}
      {editClient!==null&&<ClientModal client={editClient} onSave={c=>{setClients(p=>c.id&&p.find(x=>x.id===c.id)?p.map(x=>x.id===c.id?c:x):[...p,c]);addAudit(c.id?"client.save":"client.create", "client", c.name, "saved");setEditClient(null);}} onClose={()=>setEditClient(null)}/>}
      {editVendor!==null&&<VendorModal vendor={editVendor} onSave={v=>{setVendors(p=>v.id&&p.find(x=>x.id===v.id)?p.map(x=>x.id===v.id?v:x):[...p,v]);addAudit(v.id?"vendor.save":"vendor.create", "vendor", v.name, "saved");setEditVendor(null);}} onClose={()=>setEditVendor(null)}/>}

      {payInvoice&&<InvoicePaymentModal invoice={payInvoice} onClose={()=>setPayInvoice(null)} sym={sym} onSave={(amount)=>{if(isEventLocked(events.find(e=>e.id===Number(payInvoice.eventId)))){setPayInvoice(null);return;}setInvoices(list=>list.map(inv=>{if(inv.id!==payInvoice.id)return inv; const curPaid=invoicePaid(inv); const amt=Math.min(Number(amount||0), Math.max(0, Number(inv.total||0)-curPaid)); const n=(inv.payments||[]).length+1; const label=amt>=Math.max(0, Number(inv.total||0)-curPaid)?"Final Invoice Payment":`Invoice Payment ${n}`; const payments=[...(inv.payments||[]),{id:Date.now(),label,amount:amt,date:ymd()}]; const paid=payments.reduce((s,p)=>s+Number(p.amount||0),0)+Number(inv.paid&&!inv.payments?.length?inv.paid:0); return {...inv,payments,paid,status:paid>=Number(inv.total||0)?"Paid":"Partial"};}));setPayInvoice(null);}}/>}

      {printQuote&&(
        <PrintModal title={`Quotation ${printQuote.number}`} onClose={()=>setPrintQuote(null)}>
          <QuotePrintContent quote={printQuote} company={company} sym={sym}/>
        </PrintModal>
      )}
      {printInvoice&&(
        <PrintModal title={`Invoice ${printInvoice.number}`} onClose={()=>setPrintInvoice(null)}>
          <InvoicePrintContent invoice={printInvoice} company={company} sym={sym}/>
        </PrintModal>
      )}
      {printPO&&(
        <PrintModal title={`PO ${printPO.poNumber || printPO.number || ""}`} onClose={()=>setPrintPO(null)}>
          <PurchaseOrderPrintContent po={printPO} events={events} company={company} sym={sym}/>
        </PrintModal>
      )}
      {printReport&&(
        <PrintModal title={`DashboardEO ${REPORT_CATEGORIES.find(c=>c.id===printReport)?.label||"Report"}`} onClose={()=>setPrintReport(null)}>
          <ReportPrintContent events={events} quotes={quotes} invoices={invoices} purchases={purchases} eventWorkers={eventWorkers} clients={clients} vendors={vendors} workers={workers} company={company} sym={sym} category={printReport}/>
        </PrintModal>
      )}
    </div>
  );
}
