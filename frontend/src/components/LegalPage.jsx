import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Shared layout for legal pages (Privacy / Terms / Refund).
 * Mobile-responsive, dark theme, consistent with site's design language.
 *
 * Usage:
 *   <LegalPage title="Privacy Policy" lastUpdated="June 8, 2026">
 *     <Section title="1. Information We Collect">...</Section>
 *   </LegalPage>
 */
export default function LegalPage({ title, lastUpdated, children }) {
  const nav = useNavigate();
  return (
    <main className="min-h-screen bg-ink-950 text-foreground">
      <div className="border-b border-white/[0.07] bg-ink-900/40 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
          <button
            onClick={() => nav(-1)}
            data-testid="legal-back"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand-gold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <Link to="/" className="font-serif font-black text-base">
            Vishnu <span className="text-gold-gradient italic">Raghav</span>
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <h1 className="font-serif font-extrabold text-3xl sm:text-4xl mb-2 leading-tight">{title}</h1>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mb-8 sm:mb-10">
            Last updated: <span className="text-foreground">{lastUpdated}</span>
          </p>
        )}
        <div className="prose prose-invert max-w-none text-sm sm:text-[15px] leading-relaxed text-foreground/90 space-y-6">
          {children}
        </div>

        <div className="mt-14 pt-6 border-t border-white/[0.07] text-xs text-muted-foreground flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/privacy-policy" className="hover:text-brand-gold">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-brand-gold">Terms &amp; Conditions</Link>
          <Link to="/refund-policy" className="hover:text-brand-gold">Refund &amp; Cancellation Policy</Link>
          <Link to="/" className="hover:text-brand-gold ml-auto">← Back to Home</Link>
        </div>
      </article>
    </main>
  );
}

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-serif font-bold text-lg sm:text-xl text-brand-gold mb-2.5">{title}</h2>
      <div className="space-y-3 text-foreground/80">{children}</div>
    </section>
  );
}

export function Bullet({ children }) {
  return <li className="ml-5 list-disc marker:text-brand-gold/60">{children}</li>;
}
