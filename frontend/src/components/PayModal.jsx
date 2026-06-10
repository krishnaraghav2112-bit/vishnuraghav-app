import React, { useState } from "react";
import { X, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import SuccessLottie from "./SuccessLottie";

// Load Razorpay checkout.js exactly once and resolve when ready
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }
    if (window.Razorpay) { resolve(true); return; }
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PayModal({ open, course, onClose, onOpenAuth }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null); // {code, discount, final_amount, original_amount}
  const [couponBusy, setCouponBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const nav = useNavigate();

  if (!open || !course) return null;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    if (!user) { onClose(); onOpenAuth("login"); return; }
    setCouponBusy(true);
    try {
      const { data } = await api.post("/coupons/validate", { code, course_slug: course.slug });
      if (data.valid) {
        setCoupon(data);
        toast.success(`Coupon applied — you save ₹${data.discount.toLocaleString("en-IN")}`);
      } else {
        setCoupon(null);
        toast.error(data.message || "Invalid coupon");
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
    setCouponBusy(false);
  };

  const removeCoupon = () => { setCoupon(null); setCouponInput(""); };

  const handlePay = async () => {
    if (!user) { onClose(); onOpenAuth("login"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/enrollments/checkout", {
        course_slug: course.slug,
        coupon_code: coupon?.code || undefined,
      });

      if (data.already_enrolled) {
        toast.success("You're already enrolled! Opening course...");
        onClose();
        nav(`/learn/${course.slug}`);
        return;
      }

      // ── Mock mode (no Razorpay keys configured) ──
      if (data.mode === "mock") {
        setTimeout(() => {
          setSuccess({ txn: data.transaction_id, amount: data.amount, mode: "mock" });
          setBusy(false);
        }, 1000);
        return;
      }

      // ── Real Razorpay Standard Checkout ──
      if (data.mode === "razorpay") {
        const ok = await loadRazorpayScript();
        if (!ok || !window.Razorpay) {
          toast.error("Could not load Razorpay. Check your internet connection and try again.");
          setBusy(false);
          return;
        }

        const options = {
          key: data.razorpay_key,
          amount: data.amount_paise,
          currency: data.currency || "INR",
          name: "Vishnu Raghav",
          description: course.title,
          order_id: data.order_id,
          prefill: {
            name: data.prefill?.name || user.name || "",
            email: data.prefill?.email || user.email || "",
            contact: data.prefill?.contact || user.phone || "",
          },
          notes: { course_slug: course.slug },
          theme: { color: "#c9a84c" },
          modal: {
            ondismiss: () => {
              setBusy(false);
              toast("Payment cancelled.", { description: "You can retry whenever you're ready." });
            },
          },
          handler: async (resp) => {
            // resp: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
            try {
              const verify = await api.post("/enrollments/verify", {
                enrollment_id: data.enrollment_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              });
              if (verify.data.status === "paid") {
                setSuccess({ txn: resp.razorpay_payment_id, amount: data.amount_paise / 100, mode: "razorpay" });
              } else {
                toast.error("Payment verification failed. If amount was deducted it will be refunded within 5-7 days.");
              }
            } catch (e) {
              toast.error(formatApiError(e) || "Payment verification failed. Please contact support.");
            } finally {
              setBusy(false);
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (resp) => {
          const reason = resp?.error?.description || "Payment failed. Please try again.";
          toast.error(reason);
          setBusy(false);
        });
        rzp.open();
        return;
      }

      toast.error("Unexpected response from payment server.");
      setBusy(false);
    } catch (e) {
      toast.error(formatApiError(e));
      setBusy(false);
    }
  };

  if (success) {
    const isMock = success.mode === "mock";
    return (
      <div data-testid="pay-success" className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => { onClose(); setSuccess(null); }}>
        <div className="bg-ink-900 border border-green-500/30 rounded-3xl p-8 text-center max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto mb-3 flex items-center justify-center">
            <SuccessLottie size="lg" testId="pay-success-lottie" />
          </div>
          <h3 className="font-serif text-xl font-extrabold text-green-400 mb-1">Payment Successful!</h3>
          <p className="text-sm font-bold mt-3">{course.title}</p>
          <p className="text-xs text-muted-foreground">Course unlocked instantly.</p>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 my-5 text-xs text-muted-foreground">
            <div>Transaction ID: <span className="font-mono text-foreground">{success.txn}</span></div>
            <div>Amount: ₹{Number(success.amount).toLocaleString("en-IN")} · {isMock ? "Test Mode" : "Razorpay"}</div>
          </div>
          <button
            data-testid="pay-success-watch"
            onClick={() => { setSuccess(null); onClose(); nav(`/learn/${course.slug}`); }}
            className="w-full py-3 bg-gold-gradient text-ink-950 rounded-lg font-extrabold text-sm hover:-translate-y-0.5 transition-transform"
          >
            Start Watching →
          </button>
          <button
            onClick={() => { setSuccess(null); onClose(); nav("/dashboard"); }}
            className="w-full mt-2 py-2 text-muted-foreground text-xs"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const discount = Math.round((1 - course.price / course.original_price) * 100);

  return (
    <div data-testid="pay-modal" className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-ink-900 border border-white/[0.07] rounded-3xl w-full max-w-md overflow-hidden relative animate-scale-in">
        <button onClick={onClose} data-testid="pay-close" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ink-800 border border-white/10 flex items-center justify-center text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
        <div className="px-7 pt-7 pb-5 text-center border-b border-white/[0.07]">
          <div className="text-4xl mb-2">🎓</div>
          <h3 className="font-serif font-extrabold text-lg mb-1">{course.title}</h3>
          <div className="text-3xl font-black text-gold-gradient">₹{course.price.toLocaleString("en-IN")}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="line-through opacity-70">₹{course.original_price.toLocaleString("en-IN")}</span>
            <span className="text-green-400 font-bold ml-2">{discount}% OFF</span>
            <span className="block mt-0.5">One-time payment · Lifetime access</span>
          </p>
        </div>
        <div className="p-7">
          <div className="bg-ink-800 border border-white/[0.07] rounded-xl p-4 mb-5 space-y-1.5">
            {[
              "Lifetime access to all video lessons",
              "Downloadable resources & workbooks",
              "Certificate of completion",
              "Private student community access",
              "Access on any device, anytime",
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-green-400 font-bold">✓</span> {f}
              </div>
            ))}
          </div>

          <div className="mb-4 text-xs">
            <div className="bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2 text-muted-foreground">UPI • Cards • Net Banking • EMI (eligible cards only)</div>
          </div>

          {/* Coupon row */}
          {coupon ? (
            <div data-testid="pay-coupon-applied" className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 mb-3 text-xs">
              <div>
                <span className="font-bold text-green-400">{coupon.code}</span>{" "}
                <span className="text-muted-foreground">applied — saved ₹{coupon.discount.toLocaleString("en-IN")}</span>
              </div>
              <button onClick={removeCoupon} data-testid="pay-coupon-remove" className="text-red-400 hover:bg-red-500/10 rounded px-2 py-0.5">Remove</button>
            </div>
          ) : (
            <div className="flex gap-2 mb-3">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                placeholder="Have a coupon code?"
                data-testid="pay-coupon-input"
                className="flex-1 bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2 text-xs uppercase tracking-wider focus:border-brand-gold outline-none"
              />
              <button onClick={applyCoupon} disabled={couponBusy || !couponInput.trim()} data-testid="pay-coupon-apply"
                className="bg-ink-800 border border-brand-gold/30 text-brand-gold rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50">
                {couponBusy ? "..." : "Apply"}
              </button>
            </div>
          )}

          {/* Price breakdown */}
          {coupon && (
            <div data-testid="pay-price-breakdown" className="bg-ink-800 border border-white/[0.07] rounded-lg p-3 mb-4 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground"><span>Original price</span><span className="line-through">₹{coupon.original_amount.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-green-400"><span>Discount ({coupon.code})</span><span>− ₹{coupon.discount.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between font-extrabold pt-1 border-t border-white/[0.07]"><span>Total payable</span><span className="text-brand-gold">₹{coupon.final_amount.toLocaleString("en-IN")}</span></div>
            </div>
          )}

          {/* Legal consent — must be checked before Pay is enabled */}
          <label htmlFor="pay-agree" className="flex items-start gap-2.5 mb-4 cursor-pointer select-none group">
            <input
              id="pay-agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              data-testid="pay-agree-checkbox"
              className="mt-0.5 w-4 h-4 flex-shrink-0 rounded border border-white/20 bg-ink-800 accent-brand-gold cursor-pointer"
            />
            <span className="text-[11px] sm:text-xs text-muted-foreground leading-snug group-hover:text-foreground/80 transition-colors">
              I have read and agree to the{" "}
              <Link to="/terms" target="_blank" rel="noopener" className="text-brand-gold underline hover:text-brand-goldLight" data-testid="pay-agree-terms-link">Terms &amp; Conditions</Link>,{" "}
              <Link to="/privacy-policy" target="_blank" rel="noopener" className="text-brand-gold underline hover:text-brand-goldLight" data-testid="pay-agree-privacy-link">Privacy Policy</Link>{" "}
              and{" "}
              <Link to="/refund-policy" target="_blank" rel="noopener" className="text-brand-gold underline hover:text-brand-goldLight" data-testid="pay-agree-refund-link">Refund Policy</Link>.
            </span>
          </label>

          <button
            data-testid="pay-confirm"
            onClick={handlePay}
            disabled={busy || !agreed}
            title={!agreed ? "Please agree to the policies to continue" : ""}
            className="w-full py-3.5 bg-gold-gradient text-ink-950 rounded-xl font-extrabold text-base hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {busy ? "Processing... 🔄" : `Pay ₹${(coupon ? coupon.final_amount : course.price).toLocaleString("en-IN")} →`}
          </button>
          <div className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" /> SSL Encrypted · Powered by Razorpay
          </div>
        </div>
      </div>
    </div>
  );
}
