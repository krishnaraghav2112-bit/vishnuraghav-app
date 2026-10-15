import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Mail, PlayCircle } from "lucide-react";
import SuccessLottie from "../components/SuccessLottie";
import { track } from "../lib/pixel";

// PayModal saves the purchase here only after the payment is confirmed
function readPurchase() {
  try { return JSON.parse(sessionStorage.getItem("vr_purchase") || "null"); } catch { return null; }
}

export default function ThankYou() {
  const nav = useNavigate();
  const [p] = useState(readPurchase);
  const sent = useRef(false);

  useEffect(() => {
    if (!p || p.tracked || sent.current) return;
    sent.current = true;
    track("Purchase", {
      value: Number(p.amount) || 0,
      currency: "INR",
      content_ids: [p.slug],
      content_name: p.title,
      content_type: "product",
    }, p.txn);
    sessionStorage.setItem("vr_purchase", JSON.stringify({ ...p, tracked: true }));
  }, [p]);

  const slug = p?.slug || "overcoming-overthinking";

  return (
    <div data-testid="thank-you-page" className="min-h-screen flex items-center justify-center px-5 py-16">
      <Helmet><title>Payment Successful — Vishnu Raghav</title><meta name="robots" content="noindex" /></Helmet>
      <div className="w-full max-w-md text-center bg-ink-900 border border-green-500/25 rounded-3xl p-8 animate-scale-in">
        <div className="mx-auto mb-3 flex items-center justify-center"><SuccessLottie size="lg" testId="thank-you-lottie" /></div>
        <h1 className="font-serif text-3xl font-extrabold text-green-400 mb-2">Payment Successful!</h1>
        <p className="text-sm text-muted-foreground mb-6">Thank you! Your course is unlocked. Start your first lesson today.</p>
        {p && (
          <div data-testid="thank-you-receipt" className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 text-xs text-left space-y-1.5">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Course</span><span className="font-bold text-right">{p.title}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Amount</span><span data-testid="thank-you-amount" className="font-bold">₹{Number(p.amount).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Payment ID</span><span data-testid="thank-you-txn" className="font-mono break-all text-right">{p.txn}</span></div>
          </div>
        )}
        <button
          data-testid="thank-you-start-course"
          onClick={() => nav(`/learn/${slug}`)}
          className="w-full py-4 bg-gold-gradient text-ink-950 rounded-xl font-extrabold text-base flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform"
        >
          <PlayCircle className="w-5 h-5" /> Start Course
        </button>
        <button data-testid="thank-you-dashboard" onClick={() => nav("/dashboard")} className="w-full mt-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Go to Dashboard
        </button>
        <p className="mt-6 text-[11px] text-muted-foreground flex items-start gap-2 text-left">
          <Mail className="w-4 h-4 flex-shrink-0 text-brand-gold" />
          Your receipt and course link have been sent to your email. If you don't see it, check your Spam or Promotions folder.
        </p>
      </div>
    </div>
  );
}
