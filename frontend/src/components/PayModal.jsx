import React, { useEffect, useState } from "react";
import { X, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "./GoogleSignInButton";
import { track } from "../lib/pixel";
import { getAttribution } from "../lib/attribution";

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

const inputCls = "w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm focus:border-brand-gold outline-none";

// Sign-up / login fields shown inside checkout for visitors who are not logged in
function AccountFields({ mode, setMode, acct, setAcct, onForgot }) {
  const set = (k) => (e) => setAcct({ ...acct, [k]: e.target.value });
  const isLogin = mode === "login";
  return (
    <div data-testid="pay-account-section" className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">{isLogin ? "Log in" : "Step 1 · Your details"}</span>
        <button type="button" data-testid="pay-account-toggle" onClick={() => setMode(isLogin ? "register" : "login")} className="text-xs text-brand-gold underline">
          {isLogin ? "Create a new account" : "Already have an account? Log in"}
        </button>
      </div>
      <div className="space-y-2.5">
        {!isLogin && <input data-testid="pay-name-input" value={acct.name} onChange={set("name")} placeholder="Full name" autoComplete="name" className={inputCls} />}
        <input data-testid="pay-email-input" type="email" value={acct.email} onChange={set("email")} placeholder="Email address" autoComplete="email" className={inputCls} />
        {!isLogin && <input data-testid="pay-phone-input" type="tel" inputMode="numeric" value={acct.phone} onChange={set("phone")} placeholder="Mobile number (10 digits)" autoComplete="tel" className={inputCls} />}
        <input data-testid="pay-password-input" type="password" value={acct.password} onChange={set("password")} placeholder={isLogin ? "Password" : "Create a password (min 8 characters)"} autoComplete={isLogin ? "current-password" : "new-password"} className={inputCls} />
      </div>
      {isLogin && (
        <button type="button" data-testid="pay-forgot-password" onClick={onForgot} className="mt-2 text-xs text-muted-foreground underline hover:text-foreground">Forgot password?</button>
      )}
      {process.env.REACT_APP_GOOGLE_CLIENT_ID && (
        <div className="mt-3">
          <div className="text-center text-[11px] text-muted-foreground mb-2">or</div>
          <GoogleSignInButton onSuccess={() => toast.success("Logged in. You can now complete payment.")} />
        </div>
      )}
    </div>
  );
}

function validateAccount(mode, acct) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acct.email.trim())) return "Please enter a valid email address";
  if (mode === "login") return acct.password ? null : "Please enter your password";
  if (!acct.name.trim()) return "Please enter your name";
  if (acct.phone.replace(/\D/g, "").length < 10) return "Please enter a 10-digit mobile number";
  if (acct.password.length < 8) return "Password must be at least 8 characters";
  return null;
}

export default function PayModal({ open, course, onClose, onOpenAuth }) {
  const { user, login, register } = useAuth();
  const [busy, setBusy] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null); // {code, discount, final_amount, original_amount}
  const [couponBusy, setCouponBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState(course?.checkoutMode || "register");
  const [acct, setAcct] = useState({ name: "", email: "", phone: "", password: "" });
  const nav = useNavigate();

  const slug = course?.slug;
  useEffect(() => {
    if (!open || !course) return;
    track("InitiateCheckout", {
      value: course.price, currency: "INR", content_ids: [course.slug], content_name: course.title, content_type: "product", num_items: 1,
    });
  }, [open, slug]);

  if (!open || !course) return null;

  const validateCoupon = async (code) => {
    try {
      const { data } = await api.post("/coupons/validate", { code, course_slug: course.slug });
      if (data.valid) {
        setCoupon(data);
        toast.success(`Coupon applied — you save ₹${data.discount.toLocaleString("en-IN")}`);
        return data;
      }
      setCoupon(null);
      toast.error(data.message || "Invalid coupon");
    } catch (e) {
      toast.error(formatApiError(e));
    }
    return null;
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    if (!user) { toast("Your coupon will be applied at payment", { description: "Fill in your details above first." }); return; }
    setCouponBusy(true);
    await validateCoupon(code);
    setCouponBusy(false);
  };

  const removeCoupon = () => { setCoupon(null); setCouponInput(""); };

  // Returns the logged-in user, creating the account / logging in first if needed
  const ensureUser = async () => {
    if (user) return user;
    const err = validateAccount(mode, acct);
    if (err) { toast.error(err); return null; }
    const r = mode === "login"
      ? await login(acct.email.trim(), acct.password)
      : await register({ name: acct.name.trim(), email: acct.email.trim(), phone: acct.phone.replace(/\D/g, ""), password: acct.password });
    if (r.ok) return r.user;
    if (mode === "register" && /already registered/i.test(r.error || "")) {
      setMode("login");
      toast.error("This email is already registered. Enter your password to log in.");
    } else {
      toast.error(r.error);
    }
    return null;
  };

  const finish = (txn, amount) => {
    sessionStorage.setItem("vr_purchase", JSON.stringify({ txn, amount, slug: course.slug, title: course.title }));
    onClose();
    nav("/thank-you");
  };

  const handlePay = async () => {
    setBusy(true);
    const u = await ensureUser();
    if (!u) { setBusy(false); return; }
    let code = coupon?.code;
    if (!coupon && couponInput.trim()) {
      const c = await validateCoupon(couponInput.trim());
      if (!c) { setBusy(false); return; }
      code = c.code;
    }
    try {
      const { data } = await api.post("/enrollments/checkout", {
        course_slug: course.slug,
        coupon_code: code || undefined,
        attribution: getAttribution(),
      });

      if (data.already_enrolled) {
        toast.success("You're already enrolled! Opening course...");
        onClose();
        nav(`/learn/${course.slug}`);
        return;
      }

      // ── Mock mode (no Razorpay keys configured) ──
      if (data.mode === "mock") {
        finish(data.transaction_id, data.amount);
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
            name: data.prefill?.name || u.name || "",
            email: data.prefill?.email || u.email || "",
            contact: data.prefill?.contact || u.phone || "",
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
            try {
              const verify = await api.post("/enrollments/verify", {
                enrollment_id: data.enrollment_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              });
              if (verify.data.status === "paid") {
                finish(resp.razorpay_payment_id, data.amount_paise / 100);
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

  const discount = Math.round((1 - course.price / course.original_price) * 100);
  const payLabel = user ? "Pay" : mode === "login" ? "Login & Pay" : "Continue & Pay";

  return (
    <div data-testid="pay-modal" className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-ink-900 border border-white/[0.07] rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[94vh] overflow-y-auto relative animate-scale-in">
        <button onClick={onClose} data-testid="pay-close" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ink-800 border border-white/10 flex items-center justify-center text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
        <div className="px-6 pt-6 pb-4 text-center border-b border-white/[0.07]">
          <h3 className="font-serif font-extrabold text-lg mb-1 pr-6">{course.title}</h3>
          <div data-testid="pay-price" className="text-3xl font-black text-gold-gradient">₹{course.price.toLocaleString("en-IN")}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="line-through opacity-70">₹{course.original_price.toLocaleString("en-IN")}</span>
            <span className="text-green-400 font-bold ml-2">{discount}% OFF</span>
            <span className="block mt-0.5">One-time payment · Lifetime access · Any device</span>
          </p>
        </div>
        <div className="p-6">
          {user ? (
            <div data-testid="pay-logged-in-as" className="bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2 mb-4 text-xs text-muted-foreground">
              Logged in as <span className="text-foreground font-bold">{user.email}</span>
            </div>
          ) : (
            <AccountFields mode={mode} setMode={setMode} acct={acct} setAcct={setAcct} onForgot={() => { onClose(); onOpenAuth("forgot"); }} />
          )}

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
                className="flex-1 bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2 text-xs uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:border-brand-gold outline-none"
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
            {busy ? "Processing..." : `${payLabel} ₹${(coupon ? coupon.final_amount : course.price).toLocaleString("en-IN")} →`}
          </button>
          <div className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" /> UPI · Cards · Net Banking · Secured by Razorpay
          </div>
        </div>
      </div>
    </div>
  );
}
