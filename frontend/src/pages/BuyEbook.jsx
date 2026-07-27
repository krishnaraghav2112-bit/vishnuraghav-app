import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Download, CheckCircle, Shield, Clock, Award, Star,
  BookOpen, Sparkles, Heart, Brain, TrendingUp, Users, ChevronDown,
  Lock, Zap, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function BuyEbook({ onOpenAuth }) {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();

  const [product, setProduct] = useState({ price: 199, is_active: false, has_pdf: false, title: "Mind Health Workbook", description: "" });
  const [access, setAccess] = useState({ has_access: false, pdf_url: null });
  const [paying, setPaying] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    api.get("/assessment/product").then(({ data }) => setProduct(data)).catch(() => {});
    if (user) {
      api.get("/assessment/product/access").then(({ data }) => setAccess(data)).catch(() => {});
    }
  }, [user]);

  const buyNow = async () => {
    if (!user) {
      onOpenAuth("signup");
      toast.info("Sign up in 10 seconds to secure your eBook");
      return;
    }
    if (paying) return;
    setPaying(true);
    try {
      const { data } = await api.post("/assessment/product/checkout");
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error("Payment gateway failed to load. Please try again."); setPaying(false); return; }
      const rzp = new window.Razorpay({
        key: data.razorpay_key,
        amount: data.amount_paise,
        currency: "INR",
        name: "Vishnu Raghav",
        description: product.title || "Mind Health Workbook",
        order_id: data.razorpay_order_id,
        prefill: data.prefill,
        theme: { color: "#c9a84c" },
        handler: async (response) => {
          try {
            const { data: v } = await api.post("/assessment/product/verify", {
              order_id: data.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setAccess({ has_access: true, pdf_url: v.pdf_url });
            toast.success("Payment successful! Your eBook is ready 🎉");
            if (window.gtag) window.gtag("event", "purchase", { value: product.price, currency: "INR", items: [{ item_name: product.title }] });
            if (window.fbq) window.fbq("track", "Purchase", { value: product.price, currency: "INR", content_name: product.title });
          } catch (e) {
            toast.error("Payment verification failed. Please contact support.");
          } finally { setPaying(false); }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
      if (window.fbq) window.fbq("track", "InitiateCheckout", { value: product.price, currency: "INR" });
    } catch (e) {
      toast.error(formatApiError(e));
      setPaying(false);
    }
  };

  const downloadEbook = async () => {
    if (!access?.pdf_url) return;
    try {
      toast.success("Preparing your download...");
      const response = await fetch(access.pdf_url);
      if (!response.ok) throw new Error("Failed");
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const objUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = "Mind-Health-Workbook.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 1500);
    } catch {
      toast.error("Download failed. Please try again.");
    }
  };

  const benefits = [
    { icon: Brain, title: "Silence Overthinking", desc: "Practical daily exercises to stop the mental noise and reclaim mental peace." },
    { icon: Clock, title: "Master Your Time", desc: "Frameworks that helped 2K+ students accomplish more in 4 hours than 8." },
    { icon: Heart, title: "Emotional Clarity", desc: "Vishnu's honest, tested-in-real-life techniques to process buried feelings." },
    { icon: TrendingUp, title: "Daily Reset Rituals", desc: "5-minute morning & night routines to keep your mind sharp and calm." },
  ];

  const whatsInside = [
    "20+ practical exercises rooted in Vishnu's writing",
    "Daily reflection prompts (30-day guided journey)",
    "Overthinking reset framework — step by step",
    "Time-blocking templates you can use tomorrow",
    "Emotional check-in worksheets in Hinglish",
    "Vishnu's personal 'reset the day' script",
    "Printable PDF — read on phone, laptop or paper",
    "Lifetime access — download once, keep forever",
  ];

  const testimonials = [
    { name: "Riya Patel", role: "Reader · Mumbai", text: "This workbook felt like Vishnu wrote every page just for me. The overthinking exercises actually work — I sleep better now.", stars: 5 },
    { name: "Aditya Kumar", role: "Student · Lucknow", text: "The most honest self-help book I've read in Hindi. Cheap in price, priceless in value. Worth 10× the cost.", stars: 5 },
    { name: "Meera Verma", role: "MBA Student · Pune", text: "Downloaded, printed, and now it sits on my desk. Every morning 5 minutes with it changes my whole day.", stars: 5 },
  ];

  const faqs = [
    { q: "How do I get the eBook after paying?", a: "Instantly. As soon as your payment succeeds, a download button appears on this page. You'll also see it in your dashboard forever." },
    { q: "Is this a physical book or PDF?", a: "It's a beautifully-designed PDF eBook. Read it on your phone, laptop, tablet, or print it — it's yours forever." },
    { q: "In which language is the eBook?", a: "Simple Hinglish (Hindi written in English + Hindi where it matters). Easy to read for both Hindi and English readers." },
    { q: "Do I need to do the free assessment first?", a: "No! You can buy this eBook directly — no quiz, no waiting. Just click Buy Now, complete payment, and download." },
    { q: "Is the payment secure?", a: "100% secure. We use Razorpay (India's most trusted gateway) — the same used by Zomato, Swiggy, and CRED. Your card details never touch our server." },
    { q: "What if I don't like it?", a: "We offer a 7-day no-questions-asked refund. Just email vishnuraghav955@gmail.com — full refund, no drama." },
    { q: "Can I share it with friends?", a: "The eBook is for personal use. Please ask friends to buy their own copy — it supports Vishnu's work and keeps prices low for everyone." },
  ];

  const originalPrice = Math.round((product.price || 199) * 3);
  const discountPct = Math.round(((originalPrice - (product.price || 199)) / originalPrice) * 100);

  return (
    <div className="min-h-screen bg-ink-950 text-foreground">
      <Helmet>
        <title>{product.title || "Mind Health Workbook"} — Instant Download eBook | Vishnu Raghav</title>
        <meta name="description" content="Vishnu Raghav's Mind Health Workbook — practical exercises to silence overthinking, master time, and reclaim mental clarity. Instant PDF download." />
        <meta property="og:title" content={`${product.title || "Mind Health Workbook"} — Instant Download`} />
        <meta property="og:description" content="Silence overthinking. Master time. Emotional clarity. A practical eBook by Vishnu Raghav — instant PDF." />
      </Helmet>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-gold/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center relative">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-gold/30 bg-brand-gold/5 text-brand-gold text-xs font-bold uppercase tracking-widest mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Instant PDF Download
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-5">
              <span className="text-brand-gold italic">{product.title || "Mind Health Workbook"}</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed">
              {product.description || "Vishnu Raghav's practical, no-fluff eBook. Silence overthinking, master your time, and reclaim mental clarity — one page at a time."}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-brand-gold text-brand-gold" />)}
              </div>
              <div className="text-sm text-muted-foreground">4.9★ · 340+ readers</div>
            </div>

            <div className="flex items-baseline gap-3 mb-1">
              <div className="text-4xl md:text-5xl font-black text-brand-gold">₹{product.price || 199}</div>
              <div className="text-lg text-muted-foreground line-through">₹{originalPrice}</div>
              <div className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded">{discountPct}% OFF</div>
            </div>
            <div className="text-xs text-muted-foreground mb-6">One-time payment · Lifetime access</div>

            {access.has_access && access.pdf_url ? (
              <button onClick={downloadEbook} data-testid="download-ebook-hero"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-green-500 text-white font-bold text-base inline-flex items-center justify-center gap-2 hover:bg-green-600 transition-all">
                <Download className="w-5 h-5" /> Download Your eBook (PDF)
              </button>
            ) : product.is_active && product.has_pdf ? (
              <button onClick={buyNow} disabled={paying} data-testid="buy-ebook-hero"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gold-gradient text-ink-950 font-black text-base inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 shadow-lg shadow-brand-gold/20">
                {paying ? "Processing..." : `📥 Buy Now — ₹${product.price || 199}`} {!paying && <ArrowRight className="w-5 h-5" />}
              </button>
            ) : (
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-sm text-muted-foreground">Coming soon — launching this week ✨</div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-5 text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-brand-gold" /> Secure Razorpay</div>
              <div className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-brand-gold" /> Instant delivery</div>
              <div className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-brand-gold" /> 7-day refund</div>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto max-w-sm">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-amber-900/40"
                style={{ background: "linear-gradient(135deg, #7a4a1e 0%, #5c3416 50%, #3d2410 100%)" }}>
                <div className="h-full w-full flex flex-col items-center justify-between px-6 py-10 text-center relative">
                  <div className="absolute inset-0 opacity-[0.15]"
                    style={{ background: "repeating-linear-gradient(135deg, transparent 0, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 9px)" }} />
                  <div className="relative">
                    <div className="text-[10px] tracking-[0.3em] text-amber-100/70 uppercase mb-6">
                      विष्णु राघव प्रस्तुत करते हैं
                    </div>
                    <div className="font-serif text-4xl md:text-5xl font-black text-amber-50 mb-4 leading-tight" style={{ fontFamily: "Georgia, serif" }}>
                      उलझा जीवन
                    </div>
                    <div className="text-sm text-amber-100/90 font-medium mb-6">
                      21 दिनों का माइंड रीसेट सिस्टम
                    </div>
                    <div className="w-16 h-px bg-amber-200/40 mx-auto mb-4" />
                    <div className="text-xs italic text-amber-100/80 leading-relaxed max-w-[220px] mx-auto">
                      मन तब तक शोर करता है,<br/>जब तक उसे सुना नहीं जाता।
                    </div>
                    <div className="w-16 h-px bg-amber-200/40 mx-auto mt-4" />
                  </div>
                  <div className="relative text-center">
                    <div className="text-sm italic text-amber-100/70 mb-4">— विष्णु राघव</div>
                    <div className="text-[9px] text-amber-200/50 leading-relaxed max-w-[240px] mx-auto">
                      एक मनोवैज्ञानिक ट्रांसफ़ॉर्मेशन सिस्टम,<br/>प्रेरणादायक किताब नहीं।
                    </div>
                    <div className="text-[10px] text-amber-300/70 font-bold tracking-wider mt-2">
                      authorvishnuraghav.in
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg rotate-6">
                {discountPct}% OFF
              </div>
            </div>
          </div>
        </div>
       </section>

      {/* BENEFITS */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">What you'll unlock</div>
          <h2 className="font-serif text-3xl md:text-4xl font-black">Written for the <span className="text-brand-gold italic">silent mind.</span></h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {benefits.map((b, i) => (
            <div key={i} className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 hover:border-brand-gold/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand-gold/15 flex items-center justify-center mb-4">
                <b.icon className="w-6 h-6 text-brand-gold" />
              </div>
              <h3 className="font-serif text-xl font-black mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT'S INSIDE */}
      <section className="border-y border-white/5 bg-white/[0.015]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">Inside the eBook</div>
            <h2 className="font-serif text-3xl md:text-4xl font-black mb-6">Everything you get for <span className="text-brand-gold">₹{product.price || 199}</span></h2>
            <p className="text-muted-foreground mb-6">A carefully-crafted PDF workbook, not just theory. Every page is designed for action.</p>
            <ul className="space-y-3">
              {whatsInside.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-brand-gold/10 to-transparent border border-brand-gold/20 rounded-2xl p-8">
            <div className="text-6xl font-black text-brand-gold mb-2">30+</div>
            <div className="text-sm uppercase tracking-widest text-muted-foreground mb-6">Pages of practical wisdom</div>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
              <div><div className="text-3xl font-black">20+</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Exercises</div></div>
              <div><div className="text-3xl font-black">30</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Day Journey</div></div>
              <div><div className="text-3xl font-black">∞</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Lifetime Access</div></div>
              <div><div className="text-3xl font-black">7</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Day Refund</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* AUTHOR */}
      <section className="max-w-4xl mx-auto px-5 md:px-8 py-16 text-center">
        <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">About the Author</div>
        <h2 className="font-serif text-3xl md:text-4xl font-black mb-6">A voice for the <span className="text-brand-gold italic">silent mind</span></h2>
        <blockquote className="font-serif text-xl md:text-2xl italic text-foreground/90 mb-6 leading-relaxed">
          "I write what you feel but cannot say — because those words deserve to exist in the world."
        </blockquote>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
          Vishnu Raghav is a bestselling Hindi author, life coach, and educator. His books <em>Dagmagate Pair</em>, <em>Jo Mai Kah Na Saka</em>, and the upcoming <em>Uljha Jeevan</em> have reached thousands of readers across India. Published by BlueRose ONE (New Delhi · London).
        </p>
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-center">
          <div><div className="text-2xl md:text-3xl font-black text-brand-gold">3+</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Books Published</div></div>
          <div><div className="text-2xl md:text-3xl font-black text-brand-gold">2K+</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Students</div></div>
          <div><div className="text-2xl md:text-3xl font-black text-brand-gold">4.9★</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Avg Rating</div></div>
          <div><div className="text-2xl md:text-3xl font-black text-brand-gold">Pan India</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Readership</div></div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-y border-white/5 bg-white/[0.015]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">Reader Stories</div>
            <h2 className="font-serif text-3xl md:text-4xl font-black">Words that moved <span className="text-brand-gold italic">people.</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({length: t.stars}).map((_, j) => <Star key={j} className="w-4 h-4 fill-brand-gold text-brand-gold" />)}
                </div>
                <p className="text-sm text-foreground/90 mb-5 leading-relaxed italic">"{t.text}"</p>
                <div className="pt-4 border-t border-white/5">
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                  <div className="text-[10px] text-green-400 mt-1">✓ Verified Reader</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">Frequently Asked</div>
          <h2 className="font-serif text-3xl md:text-4xl font-black">Everything you want to <span className="text-brand-gold italic">know.</span></h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-ink-900 border border-white/[0.07] rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                data-testid={`faq-toggle-${i}`}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-bold text-sm md:text-base pr-4">{f.q}</span>
                <ChevronDown className={`w-5 h-5 text-brand-gold flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-white/5">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 text-center">
          <h2 className="font-serif text-3xl md:text-5xl font-black mb-5 leading-tight">
            Ready to reclaim your <span className="text-brand-gold italic">mental peace?</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Join hundreds of readers who now start every day with clarity. One-time payment. Lifetime access. Instant download.</p>

          <div className="inline-flex flex-col items-center">
            <div className="flex items-baseline gap-3 mb-4 justify-center">
              <div className="text-4xl md:text-5xl font-black text-brand-gold">₹{product.price || 199}</div>
              <div className="text-lg text-muted-foreground line-through">₹{originalPrice}</div>
            </div>
            {access.has_access && access.pdf_url ? (
              <button onClick={downloadEbook} data-testid="download-ebook-final"
                className="px-10 py-4 rounded-xl bg-green-500 text-white font-bold text-base inline-flex items-center gap-2 hover:bg-green-600">
                <Download className="w-5 h-5" /> Download Your eBook
              </button>
            ) : product.is_active && product.has_pdf ? (
              <button onClick={buyNow} disabled={paying} data-testid="buy-ebook-final"
                className="px-10 py-4 rounded-xl bg-gold-gradient text-ink-950 font-black text-base inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-60 shadow-xl shadow-brand-gold/20">
                {paying ? "Processing..." : `📥 Buy Now — ₹${product.price || 199}`} {!paying && <ArrowRight className="w-5 h-5" />}
              </button>
            ) : (
              <div className="text-sm text-muted-foreground">Launching this week ✨</div>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-5 text-xs text-muted-foreground justify-center">
              <div className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-brand-gold" /> Secure Razorpay</div>
              <div className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-brand-gold" /> Instant delivery</div>
              <div className="inline-flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-brand-gold" /> 7-day refund</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
