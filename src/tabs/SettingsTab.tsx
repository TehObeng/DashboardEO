import { useRef, useState } from "react";
import { CURRENCIES, inp } from "../dashboardeo-core";
import { CompanyHeader } from "../documents";

export function SettingsTab({company, setCompany, currency, setCurrency}) {
  const [f,setF] = useState({...company});
  const [saved,setSaved] = useState(false);
  const fileRef = useRef();
  const handleLogo = (e)=>{ const file=e.target.files[0]; if(!file)return; const r=new FileReader(); r.onload=ev=>setF(p=>({...p,logo:ev.target.result})); r.readAsDataURL(file); };
  const save = ()=>{ setCompany({...f}); setSaved(true); setTimeout(()=>setSaved(false),2500); };
  const sym = CURRENCIES.find(c=>c.code===currency)?.symbol||"₱";
  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Settings</h1><p className="text-gray-500 text-sm mt-0.5">Configure your company profile and preferences.</p></div>

      {/* Currency */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-bold text-gray-700 mb-4">💱 Currency</h2>
        <select value={currency} onChange={e=>setCurrency(e.target.value)} className={inp}>
          {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} — {c.name}</option>)}
        </select>
        <p className="text-xs text-gray-400 mt-2">Currently: <strong>{sym}</strong> ({currency}). All amounts will display with this symbol.</p>
      </div>

      {/* Company */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-bold text-gray-700 mb-4">🏢 Company Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Company Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-red-400 transition" onClick={()=>fileRef.current.click()}>
                {f.logo?<img src={f.logo} alt="logo" className="w-full h-full object-contain"/>:<span className="text-3xl text-gray-300">🖼</span>}
              </div>
              <div>
                <button onClick={()=>fileRef.current.click()} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 block mb-1">Upload Logo</button>
                {f.logo&&<button onClick={()=>setF(p=>({...p,logo:null}))} className="text-xs text-red-400 hover:underline">Remove</button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Company Name</label><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} className={inp}/></div>
            <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Tagline</label><input value={f.tagline} onChange={e=>setF(p=>({...p,tagline:e.target.value}))} className={inp}/></div>
            <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Address</label><input value={f.address} onChange={e=>setF(p=>({...p,address:e.target.value}))} className={inp}/></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Phone</label><input value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} className={inp}/></div>
            <div><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Email</label><input type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} className={inp}/></div>
          </div>
          <button onClick={save} className={`w-full py-3 rounded-xl font-bold text-sm transition ${saved?"bg-emerald-500 text-white":"bg-red-600 text-white hover:bg-red-700"}`}>
            {saved?"✓ Saved!":"Save Settings"}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-bold text-gray-700 mb-4">Header Preview</h2>
        <CompanyHeader company={f}/>
        <div className="space-y-2 mt-4"><div className="h-2 bg-gray-100 rounded w-full"/><div className="h-2 bg-gray-100 rounded w-3/4"/></div>
      </div>
    </div>
  );
}
