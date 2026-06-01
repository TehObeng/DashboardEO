export function PageShell({ children }) {
  return <div className="p-4 md:p-8 overflow-x-hidden">{children}</div>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function ActionButton({ children, tone = "gray", className = "", ...props }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <button
      {...props}
      className={`${tones[tone] || tones.gray} rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SummaryGrid({ children, className = "" }) {
  return <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 ${className}`}>{children}</div>;
}

export function SummaryCard({ label, value, tone = "text-gray-800", children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 min-w-0">
      <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
      <p className={`text-2xl font-bold truncate ${tone}`}>{value}</p>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function FilterBar({ children, columns = "md:grid-cols-4", className = "" }) {
  return <div className={`grid grid-cols-1 ${columns} gap-3 mb-4 ${className}`}>{children}</div>;
}

export function RecordCard({ children, className = "", ...props }) {
  return <div {...props} className={`bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition ${className}`}>{children}</div>;
}

export function EmptyState({ children }) {
  return <p className="text-center text-gray-400 py-8 bg-white rounded-2xl border border-gray-100">{children}</p>;
}
