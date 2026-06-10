import React, { useState, useEffect } from "react";
import { X, ArrowLeft, CheckCircle2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import api, { formatApiError } from "../lib/api";

export default function AuthModal({ open, mode = "login", onClose, onSwitch }) {
  const { login, register } = useAuth();
  // `mode` is the prop (initial intent); `tabOverride` is set when user clicks
  // a tab inside the modal. Resolved via getter to avoid setState-in-effect.
  const [tabOverride, setTabOverride] = useState(null);
  const [lastSeenMode, setLastSeenMode] = useState(mode);
  if (mode !== lastSeenMode) {
    // Prop changed → reset override and remember new mode (during render is fine)
    setTabOverride(null);
    setLastSeenMode(mode);
  }
  const tab = tabOverride ?? mode;
  const setTab = (t) => setTabOverride(t);

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = () => {
    setForgotSent(false);
    setForgotEmail("");
    onClose();
  };

  if (!open) return null;

  const submit = async () => {
    if (busy) return;
    if (tab === "login") {
      if (!form.email || !form.password) { toast.error("Please enter email and password"); return; }
      setBusy(true);
      const r = await login(form.email, form.password);
      setBusy(false);
      if (r.ok) { toast.success(`Welcome back, ${r.user.name.split(" ")[0]} 👋`); handleClose(); }
      else toast.error(r.error);
    } else if (tab === "register") {
      if (!form.name || !form.email || !form.password) { toast.error("Please fill all required fields"); return; }
      if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
      setBusy(true);
      const r = await register(form);
      setBusy(false);
      if (r.ok) { toast.success(`Welcome, ${r.user.name.split(" ")[0]}! Account created 🚀`); handleClose(); }
      else toast.error(r.error);
    }
  };

  const submitForgot = async () => {
    if (busy) return;
    const email = forgotEmail.trim();
    if (!email) { toast.error("Please enter your email"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Please enter a valid email"); return; }
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setForgotSent(true);
      toast.success("If that email exists, a reset link is on its way.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const goTab = (t) => {
    setTab(t);
    if (t !== "forgot") {
      setForgotSent(false);
      setForgotEmail("");
    }
  };

  return (
    <div
      data-testid="auth-modal"
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-up"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-md relative animate-scale-in">
        <button
          data-testid="auth-close"
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-ink-800 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="bg-ink-900 border border-white/[0.07] rounded-3xl overflow-hidden">
          {tab !== "forgot" && (
            <div className="flex border-b border-white/[0.07]">
              {["login", "register"].map((t) => (
                <button
                  key={t}
                  data-testid={`auth-tab-${t}`}
                  onClick={() => goTab(t)}
                  className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                    tab === t ? "text-brand-gold border-b-2 border-brand-gold" : "text-muted-foreground"
                  }`}
                >
                  {t === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>
          )}

          <div className="p-7">
            {/* ─────── FORGOT PASSWORD ─────── */}
            {tab === "forgot" ? (
              <div data-testid="auth-forgot-panel">
                <button
                  data-testid="auth-forgot-back"
                  onClick={() => goTab("login")}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-gold transition-colors mb-3"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </button>

                {forgotSent ? (
                  <div data-testid="auth-forgot-success" className="text-center py-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 mx-auto flex items-center justify-center">
                      <MailCheck className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h3 className="font-serif text-lg font-extrabold mt-4">Check your inbox</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      If an account exists for{" "}
                      <span className="text-brand-gold font-medium">{forgotEmail}</span>,
                      we&apos;ve sent a password reset link. It will expire in <strong className="text-foreground">30 minutes</strong>.
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-3">
                      Didn&apos;t get it? Check spam, or{" "}
                      <button
                        data-testid="auth-forgot-resend"
                        onClick={() => { setForgotSent(false); }}
                        className="text-brand-gold font-semibold"
                      >
                        try again
                      </button>
                      .
                    </p>
                    <button
                      data-testid="auth-forgot-done"
                      onClick={handleClose}
                      className="mt-5 px-5 py-2.5 bg-gold-gradient text-ink-950 rounded-full font-bold text-sm hover:-translate-y-0.5 transition-transform"
                    >
                      Got it
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-serif text-xl font-extrabold mb-1">Forgot your password?</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Enter your email and we&apos;ll send you a secure link to reset it.
                    </p>
                    <div className="mb-3">
                      <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                      <input
                        data-testid="auth-forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@email.com"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && submitForgot()}
                        className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm focus:border-brand-gold outline-none transition-colors"
                      />
                    </div>
                    <button
                      data-testid="auth-forgot-submit"
                      onClick={submitForgot}
                      disabled={busy}
                      className="w-full mt-2 py-3 bg-gold-gradient text-ink-950 rounded-lg font-extrabold text-sm hover:-translate-y-0.5 transition-transform disabled:opacity-60"
                    >
                      {busy ? "Sending..." : "Send reset link →"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                {tab === "login" ? (
                  <>
                    <h3 className="font-serif text-xl font-extrabold mb-1">Welcome back</h3>
                    <p className="text-sm text-muted-foreground mb-6">Sign in to access your courses and dashboard.</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-serif text-xl font-extrabold mb-1">Create your account</h3>
                    <p className="text-sm text-muted-foreground mb-6">Join readers transforming their lives.</p>
                  </>
                )}

                {tab === "register" && (
                  <div className="mb-3">
                    <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
                    <input
                      data-testid="auth-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your Name"
                      className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm focus:border-brand-gold outline-none transition-colors"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    data-testid="auth-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@email.com"
                    className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm focus:border-brand-gold outline-none transition-colors"
                  />
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-muted-foreground">Password</label>
                    {tab === "login" && (
                      <button
                        type="button"
                        data-testid="auth-forgot-link"
                        onClick={() => goTab("forgot")}
                        className="text-xs text-brand-gold hover:underline font-semibold"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    data-testid="auth-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={tab === "register" ? "Min 8 characters" : "••••••••"}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm focus:border-brand-gold outline-none transition-colors"
                  />
                </div>

                {tab === "register" && (
                  <div className="mb-3">
                    <label className="text-xs text-muted-foreground mb-1.5 block">Mobile (optional)</label>
                    <input
                      data-testid="auth-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm focus:border-brand-gold outline-none transition-colors"
                    />
                  </div>
                )}

                <button
                  data-testid="auth-submit"
                  onClick={submit}
                  disabled={busy}
                  className="w-full mt-2 py-3 bg-gold-gradient text-ink-950 rounded-lg font-extrabold text-sm hover:-translate-y-0.5 transition-transform disabled:opacity-60"
                >
                  {busy ? "Please wait..." : tab === "login" ? "Sign In →" : "Create Account →"}
                </button>

                <p className="text-center text-xs text-muted-foreground mt-5">
                  {tab === "login" ? "Don't have an account? " : "Already a member? "}
                  <button
                    data-testid="auth-switch-link"
                    onClick={() => goTab(tab === "login" ? "register" : "login")}
                    className="text-brand-gold font-semibold"
                  >
                    {tab === "login" ? "Register free" : "Sign in"}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
