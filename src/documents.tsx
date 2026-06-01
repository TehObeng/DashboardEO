import { useRef } from "react";
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
  REPORT_CATEGORIES,
  purchaseTotal,
} from "./dashboardeo-core";

export const attachmentHasBody = (a) => Boolean(a?.title || a?.content || a?.dataUrl);
const attachmentIsImage = (a) => Boolean(a?.dataUrl) && (a?.type||"").startsWith("image/") || String(a?.dataUrl||"").startsWith("data:image/");
const attachmentIsPdf = (a) => Boolean(a?.dataUrl) && ((a?.type||"").includes("pdf") || String(a?.fileName||"").toLowerCase().endsWith(".pdf") || String(a?.dataUrl||"").startsWith("data:application/pdf"));
const itemNote = (it) => it?.description || it?.note || it?.details || "";
const invoicePaid = (i) => (i?.payments||[]).reduce((s,p)=>s+Number(p.amount||0), Number(i?.paid&&!i?.payments?.length?i.paid:0));
const invoiceBalance = (i) => Math.max(0, Number(i?.total||0) - invoicePaid(i));
const eventTitle = (events, id, fallback = "—") => events.find(e=>e.id===Number(id))?.title || fallback;
const normalizedPurchases = (purchases) => purchases.map((p,i)=>normalizePurchase(p, purchases.slice(0,i)));
const readAttachmentFile = (file, done) => {
  const r = new FileReader();
  r.onload = (ev) => done({fileName:file.name,type:file.type||"application/octet-stream",dataUrl:ev.target.result});
  r.readAsDataURL(file);
};

// ─── COMPANY HEADER (print) ───────────────────────────────────────────────────
export function CompanyHeader({company}) {
  return (
    <div className="header company-header flex items-start gap-4 pb-5 mb-5 border-b-2 border-red-600">
      {company.logo
        ? <img src={company.logo} alt="logo" className="w-16 h-16 object-contain rounded-xl"/>
        : <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-2xl font-black">{company.name?.charAt(0)}</div>}
      <div>
        <h2 className="company-name text-xl font-black text-gray-900">{company.name}</h2>
        {company.tagline && <p className="tagline text-sm text-red-600 font-medium">{company.tagline}</p>}
        <div className="meta mt-2 space-y-0.5 text-xs text-gray-500 leading-relaxed">
          {company.address && <div>📍 Alamat: {company.address}</div>}
          {company.phone && <div>📱 No HP: {company.phone}</div>}
          {company.email && <div>✉️ Email: {company.email}</div>}
        </div>
      </div>
    </div>
  );
}

const PRINT_CONTENT_STYLES = `
  .print-document,.print-document *{box-sizing:border-box}
  .print-document{max-width:190mm;margin:0 auto;background:#fff;color:#111;font-family:Arial,sans-serif;font-size:12px;line-height:1.35;overflow-wrap:anywhere}
  .print-document .logo{width:60px;height:60px;object-fit:contain}
  .print-document .header{display:flex;gap:16px;align-items:flex-start;padding-bottom:18px;margin-bottom:20px;border-bottom:3px solid #dc2626}
  .print-document .header>div:last-child{min-width:0}
  .print-document .company-name{font-size:20px;font-weight:900;color:#111;margin:0}
  .print-document .tagline{color:#dc2626;font-size:13px;font-weight:600;margin-top:2px}
  .print-document .meta{font-size:11px;color:#666;margin-top:5px;line-height:1.45}
  .print-document .meta div{display:block}
  .print-document .row2{display:flex;justify-content:space-between;gap:20px;margin-bottom:22px}
  .print-document .row2>div{min-width:0}
  .print-document .row2>div:last-child{text-align:right}
  .print-document .bill-label{font-size:10px;text-transform:uppercase;color:#777;letter-spacing:.05em;margin-bottom:4px;font-weight:700}
  .print-document .bill-name{font-weight:700;font-size:15px}
  .print-document .doc-num{font-size:21px;font-weight:900;color:#dc2626;text-align:right}
  .print-document table{width:100%;border-collapse:collapse;margin-bottom:16px;page-break-inside:auto}
  .print-document thead{display:table-header-group}
  .print-document tfoot{display:table-row-group}
  .print-document tr{page-break-inside:avoid;page-break-after:auto}
  .print-document thead tr{background:#111;color:#fff}
  .print-document th{padding:9px 10px;text-align:left;font-size:11px;vertical-align:top}
  .print-document td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:11px;vertical-align:top}
  .print-document .text-right{text-align:right}
  .print-document .text-center{text-align:center}
  .print-document tfoot tr{background:#fef2f2;border-top:2px solid #dc2626}
  .print-document tfoot td{font-weight:700;font-size:12px;color:#dc2626}
  .print-document .summary-box{background:#f9fafb;border-radius:8px;padding:14px;margin-bottom:14px;page-break-inside:avoid}
  .print-document .summary-row{display:flex;justify-content:space-between;gap:12px;padding:4px 0;font-size:12px}
  .print-document .summary-row.total{border-top:1px solid #ddd;margin-top:8px;padding-top:8px;font-weight:700;font-size:15px;color:#dc2626}
  .print-document .footer{text-align:center;font-size:10px;color:#777;margin-top:22px;padding-top:14px;border-top:1px solid #e5e7eb}
  .print-document .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#d1fae5;color:#065f46;margin-top:6px}
  .print-document .attachment{page-break-before:always;margin-top:28px;padding-top:18px;border-top:3px solid #dc2626}
  .print-document .attachment h3{font-size:18px;margin:0 0 10px;color:#111}
  .print-document .attachment-box{white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:10px;padding:14px;background:#fafafa;line-height:1.5;margin-bottom:10px}
  .print-document .attachment-image{max-width:100%;max-height:235mm;object-fit:contain;border:1px solid #e5e7eb;border-radius:10px}
  .print-document .attachment-pdf{width:100%;height:220mm;border:1px solid #e5e7eb;border-radius:10px}
  .print-document .attachment-file{border:1px dashed #cbd5e1;border-radius:10px;padding:12px;background:#f8fafc;margin-bottom:10px}
  .print-document .report-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
  .print-document .report-card{border:1px solid #e5e7eb;border-radius:8px;padding:10px;page-break-inside:avoid}
  .print-document .report-card b{display:block;font-size:16px;margin-top:4px}
  .print-document .report-section{margin-top:20px;page-break-inside:auto}
  .print-document .report-section h3{font-size:16px;margin:0 0 8px;color:#dc2626}
  .print-document .muted{color:#666}
  .print-document .nowrap{white-space:nowrap}
`;
const PRINT_PREVIEW_STYLES = `${PRINT_CONTENT_STYLES}
  .print-document{padding:24px;box-shadow:0 1px 4px rgba(15,23,42,.08)}
`;
const PRINT_WINDOW_STYLES = `
  @page{size:A4;margin:14mm}
  html,body{margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff;line-height:1.35}
  ${PRINT_CONTENT_STYLES}
  @media screen{body{padding:32px;background:#f3f4f6}.print-document{padding:24px;box-shadow:0 1px 4px rgba(15,23,42,.08)}}
  @media print{body{padding:0;background:#fff}.print-document{padding:0;box-shadow:none}}
`;

// ─── PRINT MODAL (quote or invoice) ──────────────────────────────────────────
export function PrintModal({children, title, onClose}) {
  const ref = useRef();
  const doPrint = () => {
    const w = window.open("","_blank");
    w.document.write(`<html><head><title>${title}</title><style>${PRINT_WINDOW_STYLES}</style></head><body>${ref.current.outerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <style>{PRINT_PREVIEW_STYLES}</style>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <h2 className="font-bold text-gray-700">{title}</h2>
          <div className="flex gap-3">
            <button onClick={doPrint} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 flex items-center gap-2">🖨️ Print / Save PDF</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4 md:p-8 bg-gray-100">
          <div ref={ref} className="print-document">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AttachmentPrint({attachment, index}) {
  if(!attachmentHasBody(attachment)) return null;
  const isImage = attachmentIsImage(attachment);
  const isPdf = attachmentIsPdf(attachment);
  return <div className="attachment">
    <h3>{attachment.title||`Attachment ${index+1}`}</h3>
    {attachment.content&&<div className="attachment-box">{attachment.content}</div>}
    {isImage&&<img src={attachment.dataUrl} alt={attachment.fileName||attachment.title||`Attachment ${index+1}`} className="attachment-image"/>}
    {isPdf&&<div className="attachment-file"><strong>PDF:</strong> {attachment.fileName||attachment.title||"Attached PDF"}{attachment.dataUrl&&<> · <a href={attachment.dataUrl} target="_blank" rel="noreferrer">Open PDF</a></>}</div>}
    {isPdf&&attachment.dataUrl&&<object data={attachment.dataUrl} type="application/pdf" className="attachment-pdf"><a href={attachment.dataUrl}>Open PDF</a></object>}
    {attachment.dataUrl&&!isImage&&!isPdf&&<div className="attachment-file"><strong>File:</strong> {attachment.fileName||"Attachment"}</div>}
  </div>;
}

export function AttachmentFields({attachments, onAdd, onUpdate, onRemove, placeholder}) {
  const handleFile = (idx, e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    readAttachmentFile(file, data => {
      onUpdate(idx,"fileName",data.fileName);
      onUpdate(idx,"type",data.type);
      onUpdate(idx,"dataUrl",data.dataUrl);
    });
  };
  return <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
    <div className="flex items-center justify-between mb-3"><p className="text-sm font-bold text-gray-700">📎 Custom PDF Attachments</p><button onClick={onAdd} className="text-xs text-red-600 font-semibold hover:underline">+ Add Attachment</button></div>
    <div className="space-y-3">{(attachments||[]).map((a,i)=><div key={i} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex gap-2"><input value={a.title||""} onChange={e=>onUpdate(i,"title",e.target.value)} placeholder="Attachment title" className={inp}/><button onClick={()=>onRemove(i)} className="text-gray-400 hover:text-red-600 px-2">×</button></div>
      <textarea rows={3} value={a.content||""} onChange={e=>onUpdate(i,"content",e.target.value)} placeholder={placeholder} className={inp+" resize-none"}/>
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-600">
          Upload Image/PDF
          <input type="file" accept="image/*,application/pdf,.pdf" className="hidden" onChange={e=>handleFile(i,e)}/>
        </label>
        {a.fileName&&<span className="text-xs text-gray-500 truncate max-w-[260px]">{a.fileName}</span>}
        {a.dataUrl&&<button onClick={()=>{onUpdate(i,"fileName","");onUpdate(i,"type","");onUpdate(i,"dataUrl","");}} className="text-xs text-red-500 hover:underline">Remove File</button>}
      </div>
      {attachmentIsImage(a)&&<img src={a.dataUrl} alt={a.fileName||"attachment"} className="max-h-32 rounded-lg border border-gray-200 object-contain"/>}
      {attachmentIsPdf(a)&&<div className="text-xs bg-red-50 text-red-700 rounded-lg px-3 py-2">PDF attached: {a.fileName||"file.pdf"}</div>}
    </div>)}</div>
    {(attachments||[]).length===0&&<p className="text-xs text-gray-400">Attachment akan muncul sebagai halaman tambahan saat Print / Save PDF. Mendukung teks, gambar, dan file PDF.</p>}
  </div>;
}

// ─── QUOTE PRINT CONTENT ──────────────────────────────────────────────────────
const lineItemNote = (it) => it?.description || it?.note || it?.details || "";

export function QuotePrintContent({quote, company, sym}) {
  return (
    <div>
      <div className="header">
        {company.logo ? <img src={company.logo} alt="logo" className="logo rounded-xl"/> : <div style={{width:60,height:60,background:"linear-gradient(135deg,#dc2626,#991b1b)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:24,fontWeight:900}}>{company.name?.charAt(0)}</div>}
        <div>
          <div className="company-name">{company.name}</div>{company.tagline&&<div className="tagline">{company.tagline}</div>}
          <div className="meta">
            {company.address&&<div>📍 Alamat: {company.address}</div>}
            {company.phone&&<div>📱 No HP: {company.phone}</div>}
            {company.email&&<div>✉️ Email: {company.email}</div>}
          </div>
        </div>
      </div>
      <div className="row2">
        <div><div className="bill-label">Bill To</div><div className="bill-name">{quote.client}</div>{quote.eventTitle&&<div style={{color:"#666",fontSize:12}}>{quote.eventTitle}</div>}</div>
        <div><div className="doc-num">{quote.number}</div><div style={{textAlign:"right",color:"#666",fontSize:12}}>Generated: {fd(quote.generatedDate||quote.date)}</div>{quote.eventDate&&<div style={{textAlign:"right",color:"#666",fontSize:12}}>Event: {fd(quote.eventDate)}</div>}<div className="badge">{quote.status}</div></div>
      </div>
      {quote.description&&<div className="summary-box"><b>Description:</b><br />{quote.description}</div>}
      <table>
        <thead><tr><th>Description</th><th className="text-center">Qty</th><th className="text-right">Unit Price</th><th className="text-right">Amount</th></tr></thead>
        <tbody>{(quote.items||[]).map((it,i)=><tr key={i} style={{background:i%2===0?"#f9fafb":"white"}}><td><b>{it.desc||it.item}</b>{lineItemNote(it)&&<div style={{fontSize:11,color:"#666",marginTop:3}}>{lineItemNote(it)}</div>}</td><td className="text-center">{it.qty}</td><td className="text-right">{fc(it.price??it.unitPrice,sym)}</td><td className="text-right">{fc(Number(it.qty||0)*Number(it.price??it.unitPrice??0),sym)}</td></tr>)}</tbody>
        <tfoot>{quote.subtotal&&<tr><td colSpan={3} className="text-right">Subtotal</td><td className="text-right">{fc(quote.subtotal,sym)}</td></tr>}{Number(quote.discount||0)>0&&<tr><td colSpan={3} className="text-right">Discount</td><td className="text-right">-{fc(quote.discount,sym)}</td></tr>}<tr><td colSpan={3} className="text-right">TOTAL</td><td className="text-right">{fc(quote.total,sym)}</td></tr></tfoot>
      </table>
      {(quote.attachments||[]).filter(attachmentHasBody).map((a,i)=><AttachmentPrint key={i} attachment={a} index={i}/>)}
      <div className="footer"><p>"Your Event, Our Passion" — Thank you for choosing {company.name}!</p></div>
    </div>
  );
}

// ─── INVOICE PRINT CONTENT ────────────────────────────────────────────────────
export function InvoicePrintContent({invoice, company, sym}) {
  const paid = invoicePaid(invoice);
  const balance = Number(invoice.total || 0) - paid;
  const items = invoice.items || [];
  return (
    <div>
      <div className="header">
        {company.logo ? <img src={company.logo} alt="logo" className="logo rounded-xl"/> : <div style={{width:60,height:60,background:"linear-gradient(135deg,#dc2626,#991b1b)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:24,fontWeight:900}}>{company.name?.charAt(0)}</div>}
        <div>
          <div className="company-name">{company.name}</div>{company.tagline&&<div className="tagline">{company.tagline}</div>}
          <div className="meta">
            {company.address&&<div>📍 Alamat: {company.address}</div>}
            {company.phone&&<div>📱 No HP: {company.phone}</div>}
            {company.email&&<div>✉️ Email: {company.email}</div>}
          </div>
        </div>
      </div>
      <div className="row2">
        <div><div className="bill-label">Bill To</div><div className="bill-name">{invoice.client}</div>{invoice.eventTitle&&<div style={{color:"#666",fontSize:12}}>{invoice.eventTitle}</div>}</div>
        <div><div className="doc-num">{invoice.number}</div><div style={{textAlign:"right",color:"#666",fontSize:12}}>Issued: {fd(invoice.date)}</div>{invoice.due&&<div style={{textAlign:"right",color:"#666",fontSize:12}}>Due: {fd(invoice.due)}</div>}<div className="badge">{invoice.status}</div></div>
      </div>
      <div className="summary-box">
        <div className="summary-row"><span>Total Amount</span><span>{fc(invoice.total,sym)}</span></div>
        <div className="summary-row"><span>Amount Paid</span><span style={{color:"#059669"}}>{fc(paid,sym)}</span></div>
        <div className="summary-row total"><span>Balance Due</span><span style={{color:balance>0?"#dc2626":"#059669"}}>{fc(balance,sym)}</span></div>
      </div>
      {items.length>0&&<table>
        <thead><tr><th>Description</th><th className="text-center">Qty</th><th className="text-right">Unit Price</th><th className="text-right">Amount</th></tr></thead>
        <tbody>{items.map((it,i)=><tr key={i} style={{background:i%2===0?"#f9fafb":"white"}}><td><b>{it.desc||it.item}</b>{lineItemNote(it)&&<div style={{fontSize:11,color:"#666",marginTop:3}}>{lineItemNote(it)}</div>}</td><td className="text-center">{it.qty}</td><td className="text-right">{fc(it.price??it.unitPrice,sym)}</td><td className="text-right">{fc(Number(it.qty||0)*Number(it.price??it.unitPrice??0),sym)}</td></tr>)}</tbody>
      </table>}
      {(invoice.attachments||[]).filter(attachmentHasBody).map((a,i)=><AttachmentPrint key={i} attachment={a} index={i}/>)}
      <div className="footer"><p>Please settle your balance on or before the due date.</p><p style={{marginTop:4}}>{company.name}</p>{company.phone&&<p>{company.phone}</p>}{company.email&&<p>{company.email}</p>}</div>
    </div>
  );
}

export function PurchaseOrderPrintContent({ po, events, company, sym }) {
  const cur = normalizePurchase(po);
  const ev = events.find((e) => e.id === Number(cur.eventId));
  return (
    <div>
      <div className="header">
        {company.logo ? (
          <img src={company.logo} alt="logo" className="logo rounded-xl" />
        ) : (
          <div style={{ width: 60, height: 60, background: "linear-gradient(135deg,#dc2626,#991b1b)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 24, fontWeight: 900 }}>
            {company.name?.charAt(0)}
          </div>
        )}
        <div>
          <div className="company-name">{company.name}</div>
          {company.tagline && <div className="tagline">{company.tagline}</div>}
          <div className="meta">
            {company.address && <div>Alamat: {company.address}</div>}
            {company.phone && <div>No HP: {company.phone}</div>}
            {company.email && <div>Email: {company.email}</div>}
          </div>
        </div>
      </div>
      <div className="row2">
        <div>
          <div className="bill-label">Vendor</div>
          <div className="bill-name">{cur.vendor || "—"}</div>
          {ev && <div className="muted" style={{ fontSize: 12 }}>Event: {ev.title}</div>}
        </div>
        <div>
          <div className="doc-num">PESANAN PEMBELIAN</div>
          <div style={{ fontWeight: 700 }}>{cur.poNumber}</div>
          <div className="muted" style={{ fontSize: 12 }}>Tanggal: {fd(cur.orderDate)}</div>
          <div className="badge">{purchaseStatus(cur)}</div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Deskripsi</th>
            <th>Kategori</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Harga Satuan</th>
            <th className="text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>{poItems(cur).map((it, i) => (
          <tr key={it.id || i}>
            <td><b>{it.item}</b>{itemNote(it) && <div className="muted" style={{fontSize:11,marginTop:3}}>{itemNote(it)}</div>}</td>
            <td>{it.category || "Materials"}</td>
            <td className="text-center">{it.qty}</td>
            <td className="text-right">{fc(it.unitPrice, sym)}</td>
            <td className="text-right">{fc(Number(it.qty || 0) * Number(it.unitPrice || 0), sym)}</td>
          </tr>
        ))}</tbody>
        <tfoot>
          <tr><td colSpan={4} className="text-right">Subtotal</td><td className="text-right">{fc(poSubtotal(cur), sym)}</td></tr>
          <tr><td colSpan={4} className="text-right">Diskon Vendor</td><td className="text-right">-{fc(poDiscount(cur), sym)}</td></tr>
          <tr><td colSpan={4} className="text-right">TOTAL PO</td><td className="text-right">{fc(purchaseTotal(cur), sym)}</td></tr>
        </tfoot>
      </table>
      <div className="summary-box">
        <div className="summary-row"><span>Total Dibayar</span><b>{fc(purchasePaid(cur), sym)}</b></div>
        <div className="summary-row total"><span>Sisa Hutang</span><b>{fc(purchaseDebt(cur), sym)}</b></div>
        {purchasePayments(cur).map((x) => (
          <div className="summary-row" key={x.id}>
            <span>{x.label} - {fd(x.date)}{x.status === "Voided" ? " (Voided)" : ""}</span>
            <b>{fc(x.amount, sym)}</b>
          </div>
        ))}
      </div>
      {cur.notes && <div className="summary-box"><b>Catatan:</b><br />{cur.notes}</div>}
      <div className="footer"><p>Purchase Order dibuat oleh DashboardEO. Harap konfirmasi ketersediaan barang/jasa sebelum pelaksanaan event.</p></div>
    </div>
  );
}

// ─── REPORT PRINT CONTENT ─────────────────────────────────────────────────────
export function ReportPrintContent({events, quotes, invoices, purchases, eventWorkers, clients, vendors, workers, company, sym, category="all"}) {
  const reportCategory = REPORT_CATEGORIES.find(c=>c.id===category)||REPORT_CATEGORIES[0];
  const show = (id) => category==="all" || category===id;
  const printPoRows = normalizedPurchases(purchases);
  const printQuoteTotal = quotes.reduce((s,q)=>s+Number(q.total||0),0);
  const printInvoiceTotal = invoices.reduce((s,i)=>s+Number(i.total||0),0);
  const printInvoicePaid = invoices.reduce((s,i)=>s+invoicePaid(i),0);
  const printInvoiceOutstanding = invoices.reduce((s,i)=>s+invoiceBalance(i),0);
  const printPurchaseTotal = printPoRows.reduce((s,p)=>s+purchaseTotal(p),0);
  const printPurchasePaid = printPoRows.reduce((s,p)=>s+purchasePaid(p),0);
  const printPurchaseDebt = printPoRows.reduce((s,p)=>s+purchaseDebt(p),0);
  const printWorkerFees = eventWorkers.reduce((s,w)=>s+Number(w.fee||0),0);
  const printEventRows = events.map(ev=>{
      const evQuotes = quotes.filter(q=>Number(q.eventId)===ev.id);
      const evInvoices = invoices.filter(i=>Number(i.eventId)===ev.id);
      const evPo = printPoRows.filter(p=>Number(p.eventId)===ev.id);
      const evWorkers = eventWorkers.filter(w=>Number(w.eventId)===ev.id);
      return {
        ...ev,
        quotes: evQuotes.length,
        invoices: evInvoices.length,
        po: evPo.length,
        workers: evWorkers.length,
        open: evInvoices.reduce((s,i)=>s+invoiceBalance(i),0) + evPo.reduce((s,p)=>s+purchaseDebt(p),0) + evWorkers.reduce((s,w)=>s+Number(w.fee||0),0),
      };
    });
  const printClientRows = clients.map(c=>{
      const cEvents=events.filter(e=>e.client===c.name);
      const cQuotes=quotes.filter(q=>q.client===c.name);
      const cInvoices=invoices.filter(i=>i.client===c.name);
      return { ...c, events:cEvents.length, quotes:cQuotes.length, invoices:cInvoices.length, repeat:Math.max(0,cEvents.length-1), quoted:cQuotes.reduce((s,q)=>s+Number(q.total||0),0), invoiced:cInvoices.reduce((s,i)=>s+Number(i.total||0),0), last:cEvents.map(e=>e.date).filter(Boolean).sort().pop()||"" };
    });
  const printVendorRows = vendors.map(v=>{ const rows=printPoRows.filter(p=>p.vendor===v.name); return { ...v, po:rows.length, spend:rows.reduce((s,p)=>s+purchaseTotal(p),0), debt:rows.reduce((s,p)=>s+purchaseDebt(p),0) }; });
  const printWorkerRows = workers.map(w=>{ const rows=eventWorkers.filter(ew=>ew.workerId===w.id); return { ...w, assignments:rows.length, total:rows.reduce((s,ew)=>s+Number(ew.fee||0),0) }; });
  return <div>
      <CompanyHeader company={company}/>
      <div className="row2"><div><div className="bill-label">Business Summary</div><div className="bill-name">DashboardEO Report — {reportCategory.label}</div></div><div><div className="doc-num">REPORT</div><div style={{textAlign:"right",color:"#666",fontSize:12}}>Printed: {fd(new Date().toISOString())}</div></div></div>
      <div className="report-grid">
        <div className="report-card">Events<b>{events.length}</b></div><div className="report-card">Quotations<b>{fc(printQuoteTotal,sym)}</b></div><div className="report-card">Invoice Outstanding<b>{fc(printInvoiceOutstanding,sym)}</b></div><div className="report-card">Purchase Debt<b>{fc(printPurchaseDebt,sym)}</b></div>
        <div className="report-card">Clients<b>{clients.length}</b></div><div className="report-card">Vendors<b>{vendors.length}</b></div><div className="report-card">Workers<b>{workers.length}</b></div><div className="report-card">Worker Fees<b>{fc(printWorkerFees,sym)}</b></div>
      </div>
      {show("events")&&<div className="report-section"><h3>Events Summary</h3><table><thead><tr><th>Event</th><th>Client</th><th>Date</th><th>Status</th><th className="text-right">Quotes</th><th className="text-right">Invoices</th><th className="text-right">PO</th><th className="text-right">Workers</th><th className="text-right">Open Money</th></tr></thead><tbody>{printEventRows.map(r=><tr key={r.id}><td>{r.title}</td><td>{r.client||"—"}</td><td>{fd(r.date)}</td><td>{r.status}</td><td className="text-right">{r.quotes}</td><td className="text-right">{r.invoices}</td><td className="text-right">{r.po}</td><td className="text-right">{r.workers}</td><td className="text-right">{fc(r.open,sym)}</td></tr>)}</tbody></table></div>}
      {show("quotes")&&<div className="report-section"><h3>Quotations Summary</h3><table><thead><tr><th>Quote</th><th>Client</th><th>Event</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead><tbody>{quotes.map(q=><tr key={q.id}><td>{q.number}</td><td>{q.client}</td><td>{q.eventTitle||eventTitle(events,q.eventId)}</td><td>{fd(q.generatedDate||q.date)}</td><td>{q.status}</td><td className="text-right">{fc(q.total,sym)}</td></tr>)}</tbody></table></div>}
      {show("invoices")&&<div className="report-section"><h3>Invoices Summary</h3><table><tbody><tr><td>Invoiced</td><td className="text-right">{fc(printInvoiceTotal,sym)}</td><td>Paid</td><td className="text-right">{fc(printInvoicePaid,sym)}</td><td>Outstanding</td><td className="text-right">{fc(printInvoiceOutstanding,sym)}</td></tr></tbody></table><table><thead><tr><th>Invoice</th><th>Client</th><th>Event</th><th>Due</th><th>Status</th><th className="text-right">Paid</th><th className="text-right">Balance</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td>{i.number}</td><td>{i.client}</td><td>{i.eventTitle||eventTitle(events,i.eventId)}</td><td>{fd(i.due||i.date)}</td><td>{i.status}</td><td className="text-right">{fc(invoicePaid(i),sym)}</td><td className="text-right">{fc(invoiceBalance(i),sym)}</td></tr>)}</tbody></table></div>}
      {show("purchases")&&<div className="report-section"><h3>Purchases Summary</h3><table><tbody><tr><td>PO Total</td><td className="text-right">{fc(printPurchaseTotal,sym)}</td><td>Paid</td><td className="text-right">{fc(printPurchasePaid,sym)}</td><td>Debt</td><td className="text-right">{fc(printPurchaseDebt,sym)}</td></tr></tbody></table><table><thead><tr><th>PO</th><th>Vendor</th><th>Event</th><th>Status</th><th>Items</th><th className="text-right">Paid</th><th className="text-right">Balance</th></tr></thead><tbody>{printPoRows.map(p=><tr key={p.id}><td>{p.poNumber}</td><td>{p.vendor||"—"}</td><td>{eventTitle(events,p.eventId)}</td><td>{purchaseStatus(p)}</td><td>{poItems(p).map(i=>i.item).join(", ")}</td><td className="text-right">{fc(purchasePaid(p),sym)}</td><td className="text-right">{fc(purchaseDebt(p),sym)}</td></tr>)}</tbody></table></div>}
      {show("clients")&&<div className="report-section"><h3>Clients Summary</h3><table><thead><tr><th>Client</th><th>Type</th><th className="text-right">Events</th><th className="text-right">Quotes</th><th className="text-right">Invoices</th><th className="text-right">Repeat</th><th className="text-right">Quoted</th><th className="text-right">Invoiced</th><th>Last Event</th></tr></thead><tbody>{printClientRows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.type}</td><td className="text-right">{r.events}</td><td className="text-right">{r.quotes}</td><td className="text-right">{r.invoices}</td><td className="text-right">{r.repeat}</td><td className="text-right">{fc(r.quoted,sym)}</td><td className="text-right">{fc(r.invoiced,sym)}</td><td>{fd(r.last)}</td></tr>)}</tbody></table></div>}
      {show("vendors")&&<div className="report-section"><h3>Vendors Summary</h3><table><thead><tr><th>Vendor</th><th>Category</th><th>Status</th><th className="text-right">PO</th><th className="text-right">Spend</th><th className="text-right">Debt</th><th className="text-right">Base Rate</th></tr></thead><tbody>{printVendorRows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.category}</td><td>{r.status}</td><td className="text-right">{r.po}</td><td className="text-right">{fc(r.spend,sym)}</td><td className="text-right">{fc(r.debt,sym)}</td><td className="text-right">{fc(r.rate,sym)}</td></tr>)}</tbody></table></div>}
      {show("workers")&&<div className="report-section"><h3>Workers Summary</h3><table><thead><tr><th>Worker</th><th>Role</th><th>Status</th><th className="text-right">Assignments</th><th className="text-right">Total Fee</th></tr></thead><tbody>{printWorkerRows.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.jobDesc}</td><td>{r.status}</td><td className="text-right">{r.assignments}</td><td className="text-right">{fc(r.total,sym)}</td></tr>)}</tbody></table></div>}
      <div className="footer"><p>Printable per-page operating report generated from DashboardEO.</p></div>
  </div>;
}
