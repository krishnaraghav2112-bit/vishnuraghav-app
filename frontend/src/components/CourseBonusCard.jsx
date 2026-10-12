import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

const inputCls = "w-full bg-ink-900 border border-white/[0.1] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-gold/50";

export default function CourseBonusCard() {
  const nav = useNavigate();
  const [info, setInfo] = useState(null);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });

  const load = () => {
    api.get("/bonus/hardcopy").then(({ data }) => {
      setInfo(data);
      if (data.submitted) {
        const a = data.address || {};
        setForm({ name: data.name || "", phone: data.phone || "", line1: a.line1 || "", line2: a.line2 || "", city: a.city || "", state: a.state || "", pincode: a.pincode || "" });
      }
    }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  if (!info || !info.eligible) return null;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    try {
      await api.post("/bonus/hardcopy", {
        name: form.name, phone: form.phone,
        address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode },
      });
      toast.success("Address saved! Your 5 books will be shipped to you.");
      setEdit(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    }
    setBusy(false);
  };

  const showForm = !info.submitted || edit;

  return (
    <div className="bg-brand-gold/5 border border-brand-gold/30 rounded-xl p-4 mb-5" data-testid="course-bonus-card">
      <h3 className="font-serif font-extrabold text-base mb-1">🎁 Your Course Bonuses</h3>
      <p className="text-xs text-muted-foreground mb-3">
        With Overcoming Overthinking you get the author's 5 books in hard copy (delivered free to your home) and the eBook in soft copy.
      </p>

      <button onClick={() => nav("/buy-ebook")}
        className="text-xs font-bold text-brand-gold border border-brand-gold/30 rounded-lg px-3 py-2 mb-3 hover:bg-brand-gold/10">
        📘 Open my free eBook →
      </button>

      {!showForm ? (
        <div className="bg-ink-900 rounded-lg p-3 text-xs leading-relaxed">
          <div className="text-green-400 font-bold mb-1">✅ Delivery address received</div>
          <div>{form.name} · {form.phone}</div>
          <div>{form.line1}{form.line2 ? ", " + form.line2 : ""}, {form.city}, {form.state} - {form.pincode}</div>
          {info.locked ? (
            <div className="mt-2 text-purple-400">🚚 Your books have been shipped.</div>
          ) : (
            <button onClick={() => setEdit(true)} className="mt-2 text-brand-gold hover:underline">Edit address</button>
          )}
        </div>
      ) : (
        <div className="bg-ink-900 rounded-lg p-3">
          <div className="text-xs font-bold mb-2">📦 Where should we send your 5 books?</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Full name" value={form.name} onChange={set("name")} />
            <input className={inputCls} placeholder="Phone number" value={form.phone} onChange={set("phone")} maxLength={15} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="House no., street, area" value={form.line1} onChange={set("line1")} />
            <input className={`${inputCls} sm:col-span-2`} placeholder="Landmark (optional)" value={form.line2} onChange={set("line2")} />
            <input className={inputCls} placeholder="City" value={form.city} onChange={set("city")} />
            <input className={inputCls} placeholder="State" value={form.state} onChange={set("state")} />
            <input className={inputCls} placeholder="Pincode (6 digits)" value={form.pincode} onChange={set("pincode")} maxLength={6} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={busy}
              className="bg-gold-gradient text-ink-950 font-extrabold text-sm px-4 py-2 rounded-lg disabled:opacity-60">
              {busy ? "Saving..." : "Save Address"}
            </button>
            {edit && <button onClick={() => { setEdit(false); load(); }} className="text-xs text-muted-foreground px-3">Cancel</button>}
          </div>
        </div>
      )}
    </div>
  );
}
