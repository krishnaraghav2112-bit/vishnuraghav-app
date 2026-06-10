import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => (params.get("token") || "").trim(), [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("idle"); // idle | success | error
  const [error, setError] = useState("");

  // Derive invalid state from token presence (no setState-in-effect needed)
  const noToken = !token;

  const score = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s; // 0..4
  }, [password]);

  const strengthLabel = ["Too weak", "Weak", "Okay", "Strong", "Excellent"][score];
  const strengthColor = ["bg-red-500/70", "bg-red-500/70", "bg-amber-500/70", "bg-emerald-500/70", "bg-emerald-400"][score];

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    if (!token) return;
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setState("success");
      toast.success("Password updated. You can sign in now.");
      setTimeout(() => navigate("/", { replace: true }), 2500);
    } catch (err) {
      const msg = formatApiError(err);
      setError(msg);
      setState("error");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="reset-password-page"
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 relative overflow-hidden"
    >
      {/* Atmospheric backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] rounded-full bg-brand-gold/[0.07] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-up">
        <div className="bg-ink-900/80 backdrop-blur-xl border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-7 pt-7 pb-5 border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gold-gradient flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-ink-950" strokeWidth={2.4} />
              </div>
              <div>
                <h1 className="font-serif text-xl font-extrabold leading-tight">Reset your password</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Choose a new password to regain access.</p>
              </div>
            </div>
          </div>

          {state === "success" ? (
            <div data-testid="reset-success" className="p-7 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="font-serif text-lg font-extrabold mt-4">Password updated</h2>
              <p className="text-sm text-muted-foreground mt-2">
                You can now sign in with your new password.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-3">Redirecting to home…</p>
              <Link
                to="/"
                data-testid="reset-go-home"
                className="inline-block mt-5 px-5 py-2.5 bg-gold-gradient text-ink-950 rounded-full font-bold text-sm hover:-translate-y-0.5 transition-transform"
              >
                Go to homepage
              </Link>
            </div>
          ) : noToken ? (
            <div data-testid="reset-invalid" className="p-7 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-400/30 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="font-serif text-lg font-extrabold mt-4">Invalid link</h2>
              <p className="text-sm text-muted-foreground mt-2">This reset link is missing its security token. Please request a new one.</p>
              <Link
                to="/"
                className="inline-block mt-5 px-5 py-2.5 border border-brand-gold/40 text-brand-gold rounded-full font-bold text-sm hover:bg-brand-gold/10 transition-colors"
              >
                Back to homepage
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="p-7 space-y-4">
              {state === "error" && (
                <div data-testid="reset-error" className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-400/25 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-red-200/90">{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">New password</label>
                <div className="relative">
                  <input
                    data-testid="reset-password-input"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoFocus
                    className="w-full bg-ink-800 border border-white/[0.07] rounded-lg pl-3.5 pr-10 py-2.5 text-sm focus:border-brand-gold outline-none transition-colors"
                  />
                  <button
                    type="button"
                    data-testid="reset-toggle-visibility"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-brand-gold transition-colors"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${i < score ? strengthColor : "bg-white/[0.06]"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{strengthLabel}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Confirm new password</label>
                <input
                  data-testid="reset-confirm-input"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Type it again"
                  className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm focus:border-brand-gold outline-none transition-colors"
                />
                {confirm && confirm !== password && (
                  <p className="mt-1.5 text-[11px] text-red-300/80">Passwords don&apos;t match</p>
                )}
              </div>

              <button
                data-testid="reset-submit"
                type="submit"
                disabled={busy || !password || !confirm || password !== confirm}
                className="w-full mt-2 py-3 bg-gold-gradient text-ink-950 rounded-lg font-extrabold text-sm hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>Update password →</>
                )}
              </button>

              <p className="text-center text-xs text-muted-foreground pt-1">
                Remembered it?{" "}
                <Link to="/" data-testid="reset-back-home" className="text-brand-gold font-semibold">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-4 px-4">
          For your security, reset links expire 30 minutes after they&apos;re requested.
        </p>
      </div>
    </div>
  );
}
