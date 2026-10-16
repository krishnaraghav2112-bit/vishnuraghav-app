import React, { useState } from "react";
import { toast } from "sonner";
import { Download, MessageCircle } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { track } from "../lib/pixel";
import { getAttribution } from "../lib/attribution";

const SAMPLE_URL = "/Uljha-Jeevan-FREE-Sample.pdf";
const inputCls = "w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-3 text-sm focus:border-brand-gold outline-none";

export default function LeadCapture({ source = "overthinking-landing" }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (phone.replace(/\D/g, "").length < 10) { toast.error("Please enter your 10-digit WhatsApp number"); return; }
    setBusy(true);
    try {
      await api.post("/leads", { name: name.trim(), phone, source, attribution: getAttribution() || undefined });
      track("Lead", { content_name: "Free sample", content_category: source });
      setDone(true);
    } catch (err) {
      toast.error(formatApiError(err));
    }
    setBusy(false);
  };

  return (
    <section id="free-sample" data-testid="lead-capture" className="max-w-3xl mx-auto px-5 pb-16 scroll-mt-6">
      <div className="bg-ink-900 border border-brand-gold/30 rounded-3xl p-6 sm:p-8 text-center">
        {done ? (
          <div data-testid="lead-success">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="font-serif text-2xl font-extrabold mb-2">Your free sample is ready</h2>
            <p className="text-sm text-muted-foreground mb-5">Read it now. We may also message you on WhatsApp with more help.</p>
            <a href={SAMPLE_URL} target="_blank" rel="noopener noreferrer" download data-testid="lead-download"
              className="inline-flex items-center gap-2 bg-gold-gradient text-ink-950 rounded-xl font-extrabold px-6 py-3.5 text-sm">
              <Download className="w-4 h-4" /> Download free sample (PDF)
            </a>
          </div>
        ) : (
          <>
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-brand-gold mb-2">Not ready to buy yet?</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold mb-2">Get a <span className="italic text-gold-gradient">free sample</span> of Uljha Jeevan</h2>
            <p className="text-sm text-muted-foreground mb-6">Read 12 free pages by Vishnu Raghav. Enter your name and WhatsApp number to get it.</p>
            <form onSubmit={submit} className="max-w-sm mx-auto space-y-2.5 text-left">
              <input data-testid="lead-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={80} className={inputCls} />
              <input data-testid="lead-phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number (10 digits)" autoComplete="tel" maxLength={15} className={inputCls} />
              <button type="submit" disabled={busy} data-testid="lead-submit"
                className="w-full bg-gold-gradient text-ink-950 rounded-xl font-extrabold py-3.5 text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" /> {busy ? "Please wait..." : "Get my free sample"}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">By submitting, you agree to receive the sample and updates on WhatsApp.</p>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
