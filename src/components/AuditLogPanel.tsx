import { useMemo, useState } from "react";
import { fd, inp } from "../dashboardeo-core";

export function AuditLogPanel({auditLog, title="Audit Log"}) {
  const [q,setQ] = useState("");
  const [action,setAction] = useState("all");
  const [sort,setSort] = useState("newest");
  const actions = useMemo(() => Array.from(new Set((auditLog||[]).map(a=>a.action).filter(Boolean))).sort(), [auditLog]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...(auditLog||[])]
      .filter(a => action === "all" || a.action === action)
      .filter(a => !needle || [a.action,a.entity,a.entityType,a.title,a.entityLabel,a.note,a.actor].join(" ").toLowerCase().includes(needle))
      .sort((a,b) => sort === "oldest" ? new Date(a.at||0) - new Date(b.at||0) : new Date(b.at||0) - new Date(a.at||0))
      .slice(0,25);
  }, [auditLog,q,action,sort]);
  return <div className="bg-white rounded-2xl border border-gray-100 p-5">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
      <div><h3 className="font-bold text-gray-700">{title}</h3><p className="text-xs text-gray-400">{rows.length} shown · searchable, sortable audit trail</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:max-w-2xl w-full">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search audit log" className={inp}/>
        <select value={action} onChange={e=>setAction(e.target.value)} className={inp} aria-label="Audit action filter"><option value="all">All actions</option>{actions.map(a=><option key={a} value={a}>{a}</option>)}</select>
        <select value={sort} onChange={e=>setSort(e.target.value)} className={inp} aria-label="Audit sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      </div>
    </div>
    {rows.length===0 ? <p className="text-sm text-gray-400 italic">No actions recorded yet.</p> : <div className="space-y-2">{rows.map((a,i)=><div key={a.id||i} className="rounded-xl bg-gray-50 px-3 py-2 text-xs border border-gray-100">
      <div className="flex flex-wrap justify-between gap-3"><b className="text-gray-800">{a.action}</b><span className="text-gray-400">{fd(a.at)}</span></div>
      <p className="text-gray-500 mt-0.5 break-words">{a.entity||a.entityType||"record"}{a.title||a.entityLabel?` · ${a.title||a.entityLabel}`:""}{a.note?` · ${a.note}`:""}</p>
    </div>)}</div>}
  </div>;
}
