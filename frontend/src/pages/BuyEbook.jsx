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
  useEffect(() => { window.scrollTo(0, 0); }, []);

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
    { icon: Brain, title: "Stop Overthinking", desc: "Break the endless mental noise. Understand WHY your mind loops and get proven tools to reset it — day by day." },
    { icon: Heart, title: "Master Your Emotions", desc: "Face fear, guilt, self-doubt, and rejection with structured daily exercises. Release what's held you back for years." },
    { icon: Sparkles, title: "Build Deep Self-Awareness", desc: "Identify the exact thought patterns keeping you stuck — and rewrite them using CBT worksheets and reflection prompts." },
    { icon: TrendingUp, title: "Lasting Change in 21 Days", desc: "Not motivation. Not theory. A step-by-step system with 30-day and 90-day extension plans for lifelong transformation." },
  ];
  
  const whatsInside = [
    "21 daily modules — one focused topic each day",
    "100+ deep journal questions",
    "50 emotional healing exercises",
    "25 guided breathing practices",
    "25 visualization exercises",
    "20+ printable worksheets (mood tracker, habit tracker, life vision, values, boundaries, and more)",
    "CBT Thought Records + Circles of Control worksheet",
    "Mind Reset Cards + Affirmation Cards",
    "Weekly Progress Dashboards (Week 1, 2, 3)",
    "30-Day Extension Plan + 90-Day Continuation Planner",
    "Life Operating System framework",
    "Morning & Evening Reset Routines",
    "Emergency Tools for overwhelm moments",
    "Printable PDF — read on phone, laptop, or paper",
    "Lifetime access — download once, keep forever",
  ];

  const faqs = [
    { q: "How do I get the eBook after paying?", a: "Instantly. As soon as your payment succeeds, a download button appears on this page. You'll also see it in your dashboard forever." },
    { q: "Is this a physical book or PDF?", a: "It's a beautifully-designed 141-page PDF eBook. Read it on your phone, laptop, tablet, or print it — it's yours forever." },
    { q: "In which language is the eBook?", a: "The book is written in simple, easy-to-read Hindi (Devanagari script). Perfect for readers who prefer Hindi self-help over English." },
    { q: "How much time do I need daily?", a: "Just 20-30 minutes a day for 21 days. Each module has a short read + a practical exercise + a reflection prompt. Simple and doable." },
    { q: "Do I need to do the free assessment first?", a: "No! You can buy this eBook directly — no quiz, no waiting. Just click Buy Now, complete payment, and download." },
    { q: "Is the payment secure?", a: "100% secure. We use Razorpay (India's most trusted gateway) — the same used by Zomato, Swiggy, and CRED. Your card details never touch our server." },
    { q: "Can I share it with friends?", a: "The eBook is for personal use. Please ask friends to buy their own copy — it supports Vishnu's work and keeps prices low for everyone." },
  ];

  const daysJourney = [
    { day: 1, title: "Overcoming Mind Wandering" },
    { day: 2, title: "Stop Personalizing Everything" },
    { day: 3, title: "Facing Fear" },
    { day: 4, title: "Releasing Past Memories" },
    { day: 5, title: "Managing Future Anxiety" },
    { day: 6, title: "Letting Go of Control" },
    { day: 7, title: "Mindfulness Review — Week 1" },
    { day: 8, title: "Breaking Comparison Habits" },
    { day: 9, title: "Stopping People-Pleasing" },
    { day: 10, title: "Beating Self-Doubt" },
    { day: 11, title: "Recovering from Perfectionism" },
    { day: 12, title: "Silencing Negative Self-Talk" },
    { day: 13, title: "Ending Emotional Dependency" },
    { day: 14, title: "Overcoming Fear of Rejection" },
    { day: 15, title: "Making Confident Decisions" },
    { day: 16, title: "Releasing Guilt" },
    { day: 17, title: "Breaking the Overthinking Loop" },
    { day: 18, title: "Healing Loneliness" },
    { day: 19, title: "Embracing Change" },
    { day: 20, title: "Self-Acceptance" },
    { day: 21, title: "New Identity — Mindful Living" },
  ];

  const whoIsThisFor = [
    "Your mind keeps looping on the same thoughts",
    "You overthink every decision, big or small",
    "Fear, self-doubt, or anxiety hold you back daily",
    "You want practical self-work, not motivational fluff",
    "You've tried other self-help books but nothing stuck",
    "You can commit 20-30 minutes a day for 21 days",
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
              <Sparkles className="w-3.5 h-3.5" /> Instant PDF Download · 141 Pages
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-5">
              {product.title || "Mind Health"} <span className="text-brand-gold italic">Workbook</span>
            </h1>
            <blockquote className="border-l-2 border-brand-gold pl-4 mb-5 italic text-foreground/80 text-base md:text-lg">
              "The mind keeps making noise, until you truly listen to it."
            </blockquote>

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

            <a href="/Uljha-Jeevan-FREE-Sample.pdf" target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-brand-gold hover:text-brand-gold/80 underline underline-offset-4">
              📖 Read Free Sample (12 pages, no signup needed)
            </a>

            <div className="flex flex-wrap items-center gap-4 mt-5 text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-brand-gold" /> Secure Razorpay</div>
              <div className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-brand-gold" /> Instant delivery</div>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto max-w-sm">
             <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-brand-gold/10 border border-brand-gold/30">
                <img src="/ebook-cover.jpg" alt={product.title || "Mind Health Workbook"} className="w-full h-full object-cover" />
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
            <p className="text-muted-foreground mb-6">A carefully-crafted 141-page PDF workbook. Not just theory — every page is designed for action.</p>
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
            <div className="text-6xl font-black text-brand-gold mb-2">140+</div>
            <div className="text-sm uppercase tracking-widest text-muted-foreground mb-6">Pages of practical wisdom</div>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
              <div><div className="text-3xl font-black">100+</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Journal Prompts</div></div>
              <div><div className="text-3xl font-black">21</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Day System</div></div>
              <div><div className="text-3xl font-black">∞</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Lifetime Access</div></div>
              <div><div className="text-3xl font-black">50</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Healing Exercises</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* AUTHOR */}
      {/* 21 DAYS JOURNEY */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">Your Journey</div>
          <h2 className="font-serif text-3xl md:text-4xl font-black">21 Days to a <span className="text-brand-gold italic">reset mind.</span></h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">One focused topic each day. One small win each day. In three weeks, a whole new relationship with your mind.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {daysJourney.map((d) => (
            <div key={d.day} className="bg-ink-900 border border-white/[0.07] rounded-xl p-4 hover:border-brand-gold/30 transition-all flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-gold/15 flex items-center justify-center flex-shrink-0">
                <div className="text-brand-gold font-black text-sm">{d.day}</div>
              </div>
              <div className="text-sm font-medium">{d.title}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHO IS THIS FOR */}
      <section className="border-y border-white/5 bg-white/[0.015]">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-16">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">Is this for you?</div>
            <h2 className="font-serif text-3xl md:text-4xl font-black">This book is <span className="text-brand-gold italic">for you if...</span></h2>
          </div>
          <ul className="space-y-3 max-w-2xl mx-auto mb-10">
            {whoIsThisFor.map((item, i) => (
              <li key={i} className="flex items-start gap-3 bg-ink-900 border border-white/[0.07] rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <div className="max-w-2xl mx-auto bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center">
            <div className="text-xs uppercase tracking-widest text-red-400 font-bold mb-2">Please Note</div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              This book is <strong>not</strong> a substitute for professional therapy. If you're dealing with severe depression, anxiety disorder, or suicidal thoughts, please consult a licensed mental health professional first.
            </div>
          </div>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-5 md:px-8 py-16 text-center">
        <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">About the Author</div>
        <h2 className="font-serif text-3xl md:text-4xl font-black mb-6">A voice for the <span className="text-brand-gold italic">silent mind</span></h2>
        <blockquote className="font-serif text-xl md:text-2xl italic text-foreground/90 mb-6 leading-relaxed">
          "I write what you feel but cannot say — because those words deserve to exist in the world."
        </blockquote>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
          Vishnu Raghav is a bestselling Hindi author, life coach, and educator. His books <em>Dagmagate Pair</em>, <em>Jo Mai Kah Na Saka</em>, and the upcoming <em>Uljha Jeevan</em> have reached thousands of readers across India.
        </p>
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-center">
          <div><div className="text-2xl md:text-3xl font-black text-brand-gold">3+</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Books Published</div></div>
          <div><div className="text-2xl md:text-3xl font-black text-brand-gold">2K+</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Students</div></div>
          <div><div className="text-2xl md:text-3xl font-black text-brand-gold">4.9★</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Avg Rating</div></div>
          <div><div className="text-2xl md:text-3xl font-black text-brand-gold">Pan India</div><div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Readership</div></div>
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
            <a href="/Uljha-Jeevan-FREE-Sample.pdf" target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-brand-gold hover:text-brand-gold/80 underline underline-offset-4">
              📖 Read Free Sample first
            </a>
            <div className="flex flex-wrap items-center gap-4 mt-5 text-xs text-muted-foreground justify-center">
              <div className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-brand-gold" /> Secure Razorpay</div>
              <div className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-brand-gold" /> Instant delivery</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
