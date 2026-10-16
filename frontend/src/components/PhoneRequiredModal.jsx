import React, { useState } from "react";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function PhoneRequiredModal() {
  const { user, updateProfile, logout } = useAuth();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const hasPhone = (user?.phone || "").replace(/\D/g, "").length >= 10;
  if (!user || user.role === "admin" || hasPhone) return null;

  const save = async (e) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) { toast.error("Please enter your 10-digit mobile number"); return; }
    setBusy(true);
    const r = await updateProfile({ phone: digits });
    setBusy(false);
    if (r.ok) toast.success("Thank you! Mobile number saved ✅");
    else toast.error(r.error);
  };

  return (
    <div data-testid="phone-required-modal" className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <form onSubmit={save} className="w-full max-w-sm bg-ink-900 border border-brand-gold/30 rounded-3xl p-7">
        <div className="w-12 h-12 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center mb-4">
          <Phone className="w-5 h-5 text-brand-gold" />
        </div>
        <h3 className="font-serif text-xl font-extrabold mb-1">One last step</h3>
        <p className="text-sm text-muted-foreground mb-5">Please add your mobile number so our team can help you with your course and orders.</p>
        <input data-testid="phone-required-input" type="tel" inputMode="numeric" autoFocus value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" maxLength={15}
          className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-3 text-sm focus:border-brand-gold outline-none" />
        <button data-testid="phone-required-save" type="submit" disabled={busy}
          className="w-full mt-3 py-3 bg-gold-gradient text-ink-950 rounded-lg font-extrabold text-sm disabled:opacity-60">
          {busy ? "Saving..." : "Continue →"}
        </button>
        <button data-testid="phone-required-logout" type="button" onClick={logout} className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground">
          Not now — log out
        </button>
      </form>
    </div>
  );
}
