import React, { useState, useEffect } from "react";

export default function WaitlistModal({ open, course, defaultEmail = "", onClose, onSubmit }) {
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setEmail(defaultEmail || "");
  }, [open, defaultEmail]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setBusy(true);
    await onSubmit?.(email);
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-ink-800 border border-brand-gold/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-brand-gold/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-xl">
            🔔
          </div>
          <div className="flex-1">
            <h3 className="font-serif font-extrabold text-lg text-foreground leading-tight">
              Join the Waitlist
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {course?.title ? `Get notified when "${course.title}" launches.` : "We'll email you at launch."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-white/70 mb-1.5">
            Your email
          </label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm focus:border-brand-gold outline-none text-foreground"
          />

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-white/[0.04] border border-white/[0.08] text-foreground hover:border-white/[0.2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !email.includes("@")}
              className="flex-1 py-2.5 rounded-lg text-sm font-extrabold bg-gold-gradient text-ink-950 hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "..." : "Notify Me"}
            </button>
          </div>

          <p className="text-[10px] text-white/40 mt-3 text-center">
            No spam. One email at launch. Unsubscribe anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
