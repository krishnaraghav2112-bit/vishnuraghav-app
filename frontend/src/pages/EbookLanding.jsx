import React from "react";
import { useNavigate } from "react-router-dom";
import { Star, Check, Lock, Zap } from "lucide-react";

export default function EbookLanding() {
  const nav = useNavigate();
  const goBuy = () => nav("/buy-ebook");

  return (
    <main className="min-h-screen bg-ink-950 text-foreground pb-24 lg:pb-0">
  
     {/* 1 — Merged pain check */}
      <section className="px-5 lg:px-10 pt-14 pb-10 max-w-3xl mx-auto text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[11px] font-bold uppercase tracking-widest mb-6">
          उलझा जीवन — 21 दिनों का माइंड रीसेट
        </div>
        <h1 className="font-serif font-black text-3xl lg:text-5xl leading-tight mb-4">
          क्या आपका मन भी…
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground mb-8">
          पिछले 30 दिनों में — क्या आपने ये अनुभव किया है?
        </p>
        <ul className="text-left space-y-4 text-base lg:text-lg text-foreground/85 max-w-xl mx-auto">
          {[
            "एक ही बात बार-बार सोचता रहता है",
            "छोटी-सी बात कई दिनों तक परेशान करती है",
            "रात को शरीर थक जाता है… लेकिन मन नहीं रुकता",
            "भविष्य की चिंता आपको थका देती है",
            "आपको लगता है कि आपका मन आपके नियंत्रण में नहीं है",
            "आपकी सबसे बड़ी लड़ाई… दुनिया से नहीं, अपने ही मन से है",
            "आपने बहुत Motivational Videos देखीं… लेकिन भीतर कुछ नहीं बदला",
          ].map((line, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1.5 w-4 h-4 border-2 border-brand-gold/60 rounded-sm flex-shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3 — Verdict */}
      <section className="px-5 lg:px-10 py-10 max-w-3xl mx-auto text-center">
        <p className="font-serif text-xl lg:text-2xl leading-relaxed text-foreground/90">
          अगर इनमें से <span className="text-brand-gold font-bold">3 या उससे ज़्यादा</span> सवालों का जवाब <span className="text-brand-gold font-bold">"हाँ"</span> है…
        </p>
        <p className="font-serif text-xl lg:text-2xl leading-relaxed text-foreground mt-4 font-bold">
          तो शायद यह किताब आपके लिए लिखी गई है।
        </p>
      </section>

      {/* CTA 1 */}
      <section className="px-5 lg:px-10 pb-12 text-center">
        <button
          onClick={goBuy}
          className="inline-flex items-center gap-2 bg-gold-gradient text-ink-950 px-7 py-4 rounded-xl font-extrabold text-base hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-brand-gold/40 transition-all animate-gold-pulse btn-shimmer"
        >
          🟢 हाँ, मैं अपने मन को समझना चाहता हूँ →
        </button>
        <p className="text-xs text-white/50 mt-3">Secure Razorpay · Instant PDF Download</p>
      </section>


      {/* 8 — Day 2 preview */}
      <section className="px-5 lg:px-10 py-14 bg-ink-900 border-y border-white/[0.05]">
        <div className="max-w-3xl mx-auto">
          <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2 text-center">Day 2 — Preview</div>
          <h2 className="font-serif font-black text-2xl lg:text-3xl text-center mb-8">आज की मनोवैज्ञानिक सच्चाई</h2>
          <div className="bg-ink-800 border border-white/[0.07] rounded-2xl p-6 lg:p-10">
            <p className="font-serif text-lg lg:text-xl leading-relaxed text-foreground/90 mb-4">
              हर घटना का मतलब हम खुद निकालते हैं।<br />
              घटना खुद कुछ नहीं बताती।
            </p>
            <p className="font-serif text-lg lg:text-xl leading-relaxed text-foreground/90">
              दर्द बात से नहीं…<br />
              उस बात के बारे में हमारी कहानी से आता है।
            </p>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/Uljha-Jeevan-FREE-Sample.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-ink-800 border border-brand-gold/40 text-brand-gold px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-gold/10 transition-colors"
            >
              📖 पूरा Free Sample पढ़ें (12 pages)
            </a>
            <p className="text-[11px] text-white/40 mt-2">Opens in a new tab · No email required</p>
          </div>
        </div>
      </section>

      {/* Sticky mobile buy bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-ink-900/95 backdrop-blur border-t border-brand-gold/30 px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-brand-gold">₹199</span>
            <span className="text-xs text-muted-foreground line-through">₹597</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Instant Download</div>
        </div>
        <button onClick={goBuy} className="bg-gold-gradient text-ink-950 px-5 py-2.5 rounded-lg font-extrabold text-sm">
          Buy Now →
        </button>
      </div>

    </main>
  );
}
