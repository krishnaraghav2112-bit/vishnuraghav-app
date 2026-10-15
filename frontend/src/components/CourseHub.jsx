import React, { useEffect, useState } from "react";
import { ArrowLeft, PlayCircle, Package, BookOpen, MessageCircle, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const inputCls = "w-full bg-ink-950 border border-white/[0.1] rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-gold/50";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-ink-900 border border-white/[0.1] rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-extrabold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CourseHub({ course, progressPct, onWatch, onBack }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(null); // "address" | "session" | null
  const [busy, setBusy] = useState(false);

  // ── hard copy address ──
  const [hc, setHc] = useState(null);
  const [addr, setAddr] = useState({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
  const loadHc = () => {
    api.get("/bonus/hardcopy").then(({ data }) => {
      setHc(data);
      if (data.submitted) {
        const a = data.address || {};
        setAddr({ name: data.name || "", phone: data.phone || "", line1: a.line1 || "", line2: a.line2 || "", city: a.city || "", state: a.state || "", pincode: a.pincode || "" });
      }
    }).catch(() => {});
  };

  // ── one-to-one session ──
  const [ss, setSs] = useState(null);
  const [sess, setSess] = useState({ phone: user?.phone || "", preferred_date: "", preferred_time: "", topic: "", message: "" });
  const loadSs = () => { api.get("/bonus/session").then(({ data }) => setSs(data)).catch(() => {}); };

  // ── ebook ──
  const [eb, setEb] = useState({ has_access: false, pdf_url: null });

  useEffect(() => {
    loadHc();
    loadSs();
    api.get("/assessment/product/access").then(({ data }) => setEb(data)).catch(() => {});
  }, []);

  const setA = (k) => (e) => setAddr({ ...addr, [k]: e.target.value });
  const setS = (k) => (e) => setSess({ ...sess, [k]: e.target.value });

  const saveAddress = async () => {
    setBusy(true);
    try {
      await api.post("/bonus/hardcopy", {
        name: addr.name, phone: addr.phone,
        address: { line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, pincode: addr.pincode },
      });
      toast.success("Address saved! Your 5 books will be shipped to you.");
      setOpen(null);
      loadHc();
    } catch (e) { toast.error(formatApiError(e)); }
    setBusy(false);
  };

  const sendSession = async () => {
    setBusy(true);
    try {
      await api.post("/bonus/session", sess);
      toast.success("Request sent! Vishnu will contact you on email or WhatsApp.");
      setOpen(null);
      loadSs();
    } catch (e) { toast.error(formatApiError(e)); }
    setBusy(false);
  };

  const downloadEbook = async () => {
    if (!eb?.has_access || !eb?.pdf_url) { toast.error("The eBook is not available yet. Please contact support."); return; }
    try {
      toast.success("Preparing your download...");
      const response = await fetch(eb.pdf_url);
      if (!response.ok) throw new Error("Failed");
      const blob = await response.blob();
      const objUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = "Mind-Health-Workbook.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 1500);
    } catch { toast.error("Download failed. Please try again."); }
  };

  const addrDone = hc?.submitted;
  const Card = ({ icon: Icon, title, desc, status, cta, onClick, testid }) => (
    <button onClick={onClick} data-testid={testid}
      className="text-left bg-ink-900 border border-white/[0.07] hover:border-brand-gold/40 rounded-2xl p-5 transition-colors flex flex-col">
      <div className="w-11 h-11 rounded-xl bg-brand-gold/10 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-brand-gold" />
      </div>
      <div className="font-serif font-extrabold text-lg mb-1">{title}</div>
      <div className="text-xs text-muted-foreground mb-3 leading-relaxed">{desc}</div>
      {status && <div className="text-xs text-green-400 font-bold mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {status}</div>}
      <div className="mt-auto text-sm font-bold text-brand-gold">{cta} →</div>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto px-5 py-8" data-testid="course-hub">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>
      <h1 className="font-serif text-3xl font-black mb-1">{course?.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">Everything included in your course, in one place.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card icon={PlayCircle} testid="hub-watch" title="Watch Videos"
          desc="Start or continue your daily video lessons."
          status={progressPct > 0 ? `${progressPct}% completed` : null}
          cta={progressPct > 0 ? "Continue watching" : "Start watching"} onClick={onWatch} />
        <Card icon={Package} testid="hub-address" title="Hard Copy Delivery"
          desc="Complete your address to receive the author's 5 books at home (worth ₹1,500+)."
          status={addrDone ? (hc?.locked ? "Shipped" : "Address received") : null}
          cta={addrDone ? (hc?.locked ? "View address" : "Edit address") : "Complete address"} onClick={() => setOpen("address")} />
        <Card icon={BookOpen} testid="hub-ebook" title="Download eBook"
          desc="Mind Health Workbook, eBook in soft copy (worth ₹649)."
          cta="Download eBook" onClick={downloadEbook} />
        <Card icon={MessageCircle} testid="hub-session" title="One-to-One Session"
          desc="Request a personal session with the author. He will contact you by email or WhatsApp."
          status={ss?.last ? "Request sent" : null}
          cta={ss?.last ? "Send another request" : "Request a session"} onClick={() => setOpen("session")} />
      </div>

      {open === "address" && (
        <Modal title="📦 Hard Copy Delivery" onClose={() => setOpen(null)}>
          {hc?.locked ? (
            <div className="text-sm leading-relaxed">
              <div className="text-purple-400 font-bold mb-2">🚚 Your books have been shipped.</div>
              <div>{addr.name} · {addr.phone}</div>
              <div>{addr.line1}{addr.line2 ? ", " + addr.line2 : ""}, {addr.city}, {addr.state} - {addr.pincode}</div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">Where should we send your 5 books?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Full name" value={addr.name} onChange={setA("name")} />
                <input className={inputCls} placeholder="Phone number" value={addr.phone} onChange={setA("phone")} maxLength={15} />
                <input className={`${inputCls} sm:col-span-2`} placeholder="House no., street, area" value={addr.line1} onChange={setA("line1")} />
                <input className={`${inputCls} sm:col-span-2`} placeholder="Landmark (optional)" value={addr.line2} onChange={setA("line2")} />
                <input className={inputCls} placeholder="City" value={addr.city} onChange={setA("city")} />
                <input className={inputCls} placeholder="State" value={addr.state} onChange={setA("state")} />
                <input className={inputCls} placeholder="Pincode (6 digits)" value={addr.pincode} onChange={setA("pincode")} maxLength={6} />
              </div>
              <button onClick={saveAddress} disabled={busy}
                className="mt-4 bg-gold-gradient text-ink-950 font-extrabold text-sm px-5 py-2.5 rounded-lg disabled:opacity-60">
                {busy ? "Saving..." : "Save Address"}
              </button>
            </>
          )}
        </Modal>
      )}

      {open === "session" && (
        <Modal title="🤝 One-to-One Session" onClose={() => setOpen(null)}>
          <p className="text-xs text-muted-foreground mb-3">Tell us when you are free. The author will reach you on your email or WhatsApp to confirm.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className={`${inputCls} sm:col-span-2`} placeholder="Phone / WhatsApp number" value={sess.phone} onChange={setS("phone")} maxLength={15} />
            <input type="date" className={inputCls} value={sess.preferred_date} onChange={setS("preferred_date")} />
            <select className={inputCls} value={sess.preferred_time} onChange={setS("preferred_time")}>
              <option value="">Preferred time</option>
              <option>Morning (9 AM - 12 PM)</option>
              <option>Afternoon (12 PM - 4 PM)</option>
              <option>Evening (4 PM - 8 PM)</option>
            </select>
            <input className={`${inputCls} sm:col-span-2`} placeholder="What do you want to discuss? (e.g. overthinking, anxiety)" value={sess.topic} onChange={setS("topic")} />
            <textarea className={`${inputCls} sm:col-span-2`} rows={3} placeholder="Anything else you want to share (optional)" value={sess.message} onChange={setS("message")} />
          </div>
          <button onClick={sendSession} disabled={busy}
            className="mt-4 bg-gold-gradient text-ink-950 font-extrabold text-sm px-5 py-2.5 rounded-lg disabled:opacity-60">
            {busy ? "Sending..." : "Send Request"}
          </button>
        </Modal>
      )}
    </div>
  );
}
