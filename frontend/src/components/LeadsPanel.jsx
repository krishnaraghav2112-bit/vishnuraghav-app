import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Download } from "lucide-react";
import api, { formatApiError } from "../lib/api";

const waLink = (l) => `https://wa.me/91${l.phone}?text=${encodeURIComponent(`Hi ${l.name}, this is Vishnu Raghav's team. Did you get a chance to read the free sample of Uljha Jeevan? Happy to help if you have any questions.`)}`;

export default function LeadsPanel() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("todo"); // todo | all
  const [q, setQ] = useState("");

  const load = () => api.get("/admin/leads").then((r) => setItems(r.data)).catch((e) => toast.error(formatApiError(e)));
  useEffect(() => { load(); }, []);

  const toggle = async (l) => {
    const status = l.status === "contacted" ? "new" : "contacted";
    try {
      await api.patch(`/admin/leads/${l.id}`, { status });
      setItems((prev) => prev.map((x) => (x.id === l.id ? { ...x, status } : x)));
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const shown = useMemo(() => items.filter((l) => {
    if (filter === "todo" && (l.bought || l.status === "contacted")) return false;
    const hay = `${l.name} ${l.phone} ${l.source} ${l.attribution?.utm_campaign || ""}`.toLowerCase();
    return !q || hay.includes(q.toLowerCase());
  }), [items, filter, q]);

  const exportCsv = () => {
    const rows = [["Name", "Phone", "Source", "Campaign", "Status", "Bought", "Date"]].concat(
      items.map((l) => [l.name, l.phone, l.source, l.attribution?.utm_campaign || "", l.status, l.bought ? "yes" : "no", l.created_at || ""])
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "leads.csv";
    a.click();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-serif text-xl font-extrabold">Leads ({items.length})</h2>
        <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs font-bold text-brand-gold border border-brand-gold/30 rounded-lg px-3 py-2">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilter("todo")} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${filter === "todo" ? "border-brand-gold text-brand-gold" : "border-white/10 text-muted-foreground"}`}>To contact</button>
        <button onClick={() => setFilter("all")} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${filter === "all" ? "border-brand-gold text-brand-gold" : "border-white/10 text-muted-foreground"}`}>All</button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, campaign..." className="flex-1 min-w-[180px] bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-gold" />
      </div>
      <div className="space-y-2">
        {shown.map((l) => (
          <div key={l.id} data-testid={`lead-row-${l.id}`} className="bg-ink-800 border border-white/[0.07] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold">{l.name} <span className="text-muted-foreground font-normal">· {l.phone}</span></div>
              <div className="text-[11px] text-muted-foreground">
                {l.created_at ? new Date(l.created_at).toLocaleString() : ""} · {l.source}{l.attribution?.utm_campaign ? ` · ${l.attribution.utm_campaign}` : ""}
                {l.bought && <span className="ml-2 text-green-400 font-bold">Bought</span>}
                {l.status === "contacted" && <span className="ml-2 text-purple-400 font-bold">Contacted</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={waLink(l)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-[#25D366] border border-[#25D366]/40 rounded-lg px-3 py-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
              <button onClick={() => toggle(l)} className="text-xs text-muted-foreground border border-white/10 rounded-lg px-3 py-1.5">
                {l.status === "contacted" ? "Mark new" : "Mark contacted"}
              </button>
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="text-sm text-muted-foreground">No leads here yet.</p>}
      </div>
    </>
  );
}
