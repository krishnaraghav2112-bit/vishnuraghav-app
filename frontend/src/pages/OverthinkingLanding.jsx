import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Star, ShieldCheck, PlayCircle, Clock, Smartphone, BookOpen, Youtube, ChevronDown, MessageCircle, Lock } from "lucide-react";
import api from "../lib/api";
import { track } from "../lib/pixel";
import LeadCapture from "../components/LeadCapture";
import { TITLE as PROGRAM_TITLE, SUBTITLE as PROGRAM_SUBTITLE, ITEMS as INCLUDED, CLOSING as PROGRAM_CLOSING } from "../components/CourseDetailsButton";

const SLUG = "overcoming-overthinking";
const WA_LINK = `https://wa.me/918439111502?text=${encodeURIComponent("Hi Vishnu, I have a question about the Overcoming Overthinking course.")}`;
const FALLBACK = { slug: SLUG, title: "Overcoming Overthinking", price: 2999, original_price: 6999, lessons: 21, modules: 3, duration: "3 Weeks" };

const FOR_YOU = [
  "You lie in bed at night but your mind won't stop racing",
  "You replay small moments for hours — \"why did they say that?\"",
  "You think through every decision a hundred times and still feel unsure",
  "Past mistakes or fears about the future take over your day",
  "Everything looks fine on the outside, but inside there's constant noise",
  "You want real peace of mind — without hours of meditation",
];

const WEEKS = [
  { n: "Week 1", t: "Understand", d: "Where does overthinking come from? Learn to recognise your thought patterns and triggers.", l: 7 },
  { n: "Week 2", t: "Interrupt", d: "Simple, practical tools to break the thought loop the moment it starts — built for everyday life.", l: 7 },
  { n: "Week 3", t: "Live Calm", d: "Build daily habits for a calm mind so overthinking doesn't pull you back in.", l: 7 },
];

const REVIEWS = [
  ["Jo Mai Kah Na Saka felt like Vishnu wrote every word just for me. I cried reading it.", "Riya Patel", "Reader · Mumbai"],
  ["Dagmagate Pair is the most honest Hindi book I've ever read. He writes what we all think but never dare to say.", "Aditya Kumar", "Student · Lucknow"],
  ["His YouTube content on mind control helped me through the hardest phase of my life. Truly life-changing.", "Meera Verma", "MBA Student · Pune"],
];

const FAQS = [
  ["When and how do I get access?", "The course unlocks instantly after payment. Log in with the same email and password to watch it from your Dashboard anytime. You'll also receive the course link by email."],
  ["How do I get the 5 books and my 1-to-1 session?", "After enrolling, open the course from your Dashboard. Enter your delivery address there and the 5 printed books are shipped to your home. You can book your 1-to-1 personal session from the same page."],
  ["How long is the course?", "21 video lessons over 3 weeks — one short lesson a day. You can also go at your own pace; there are no deadlines."],
  ["What language is the course in?", "Simple, easy-to-follow Hindi — the same way Vishnu speaks in his books and YouTube videos."],
  ["Can I watch on my phone?", "Yes. Watch on your phone, tablet or laptop in any browser. No app download needed."],
  ["How long do I keep access?", "Lifetime. Pay once and the course is yours forever."],
  ["Is there a refund?", "This is a digital course, so refunds are not offered once access is granted. If a payment fails but money is deducted, it is automatically returned within 5–7 business days. For any technical issue, email vishnuraghav955@gmail.com within 3 days and we'll fix it promptly."],
];

function PriceTag({ course, discount, big }) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <span data-testid={big ? "lp-price-main" : undefined} className={`${big ? "text-5xl" : "text-3xl"} font-black text-gold-gradient`}>₹{course.price.toLocaleString("en-IN")}</span>
      <span className="text-lg text-muted-foreground line-through">₹{course.original_price.toLocaleString("en-IN")}</span>
      <span className="text-xs font-extrabold bg-green-500/15 text-green-400 border border-green-500/30 rounded-full px-2.5 py-1">{discount}% OFF</span>
    </div>
  );
}

function BuyButton({ onClick, testId, className = "" }) {
  return (
    <button data-testid={testId} onClick={onClick}
      className={`bg-gold-gradient text-ink-950 rounded-xl font-extrabold px-7 py-4 text-base hover:-translate-y-0.5 active:translate-y-0 transition-transform shadow-[0_10px_40px_-10px_rgba(201,168,76,0.6)] ${className}`}>
      Enroll Now →
    </button>
  );
}

function ReviewCard({ testId, rating, text, name, sub }) {
  return (
    <div data-testid={testId} className="reveal bg-ink-900 border border-white/[0.07] rounded-2xl p-5">
      <div className="flex gap-0.5 mb-3">
        {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? "fill-brand-gold text-brand-gold" : "text-white/20"}`} />)}
      </div>
      <p className="text-sm italic text-muted-foreground leading-relaxed mb-4">"{text}"</p>
      <div className="text-xs font-bold">{name}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

// Adds up the "Worth ₹…" badges from the course details list
const BONUS_VALUE = INCLUDED.reduce((t, [, , worth]) => t + (Number((worth || "").replace(/[^0-9]/g, "")) || 0), 0);

function WhatYouGet() {
  return (
    <section data-testid="lp-what-you-get" className="max-w-5xl mx-auto px-5 py-16">
      <SectionTitle eyebrow="Everything you get">{PROGRAM_TITLE} — {PROGRAM_SUBTITLE}</SectionTitle>
      <div className="grid md:grid-cols-2 gap-3">
        {INCLUDED.map(([h, d, worth], i) => (
          <div key={h} data-testid={`lp-included-${i}`} className="reveal bg-ink-900 border border-white/[0.07] rounded-2xl p-5 hover:border-brand-gold/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div className="font-bold text-sm flex gap-2"><Check className="w-4 h-4 text-brand-gold flex-shrink-0 mt-0.5" />{h}</div>
              {worth && <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gold-gradient text-ink-950 whitespace-nowrap">{worth}</span>}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-6">{d}</p>
          </div>
        ))}
      </div>
      {BONUS_VALUE > 0 && (
        <p data-testid="lp-bonus-value" className="mt-5 text-sm text-center">
        </p>
      )}
      <p className="font-serif italic text-sm text-brand-gold mt-3 text-center">{PROGRAM_CLOSING}</p>
    </section>
  );
}

function SectionTitle({ eyebrow, children }) {
  return (
    <div className="mb-8">
      <div className="text-[11px] uppercase tracking-[0.2em] text-brand-gold font-bold mb-2">{eyebrow}</div>
      <h2 className="font-serif text-2xl sm:text-3xl font-extrabold leading-tight">{children}</h2>
    </div>
  );
}

function Faq() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="space-y-2.5">
      {FAQS.map(([q, a], i) => (
        <div key={q} className="border border-white/[0.07] rounded-xl bg-ink-900/60">
          <button data-testid={`lp-faq-${i}`} onClick={() => setOpenIdx(openIdx === i ? -1 : i)} className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 text-sm font-bold">
            {q}
            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-brand-gold transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
          </button>
          {openIdx === i && <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>}
        </div>
      ))}
    </div>
  );
}

export default function OverthinkingLanding({ onOpenPay }) {
  const [course, setCourse] = useState(FALLBACK);
  const [studentReviews, setStudentReviews] = useState([]);
  const [searchParams] = useSearchParams();
  const viewSent = useRef(false);
  const autoOpened = useRef(false);

  useEffect(() => {
    api.get(`/courses/${SLUG}`).then(({ data }) => {
      const c = data?.slug ? { ...FALLBACK, ...data } : FALLBACK;
      setCourse(c);
      // Reminder email link (?buy=1) opens checkout straight away, in login mode
      if (searchParams.get("buy") === "1" && !autoOpened.current) {
        autoOpened.current = true;
        onOpenPay({ ...c, checkoutMode: "login" });
      }
    }).catch(() => {});
    api.get("/reviews", { params: { course_slug: SLUG } }).then(({ data }) => setStudentReviews(data || [])).catch(() => {});
  }, []); // run once on page load

  useEffect(() => {
    if (viewSent.current) return;
    viewSent.current = true;
    track("ViewContent", { content_ids: [SLUG], content_name: FALLBACK.title, content_type: "product", value: FALLBACK.price, currency: "INR" });
  }, []);

  const buy = () => onOpenPay(course);
  const discount = Math.round((1 - course.price / course.original_price) * 100);

  return (
    <div data-testid="overthinking-landing" className="pb-28 md:pb-0 overflow-x-hidden">
      <Helmet>
        <title>Overcoming Overthinking — 21-Day Course | Vishnu Raghav</title>
        <meta name="description" content="Break free from overthinking with Vishnu Raghav's 21-lesson video course. Lifetime access on any device." />
      </Helmet>

      {/* Top bar — brand only, no links away */}
      <div className="max-w-5xl mx-auto px-5 pt-5 flex items-center justify-between">
        <div className="font-serif text-lg">Vishnu <span className="italic text-brand-gold">Raghav</span></div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Lock className="w-3 h-3" /> Secure checkout</div>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-10 pb-16 grid md:grid-cols-[1.15fr_1fr] gap-10 items-center">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-brand-gold bg-brand-goldSoft border border-brand-gold/25 rounded-full px-3 py-1.5 mb-5">
            21 days · Video course · Lifetime access
          </div>
          <h1 data-testid="lp-headline" className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] mb-5">
            Quiet the mental noise. <span className="text-gold-gradient italic">Get your peace back.</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-7 max-w-lg">
            Replaying every conversation, lying awake at night, getting stuck on small decisions — it can stop.
            Vishnu Raghav's <strong className="text-foreground">21 Days Uljha Jeevan Mastery</strong> course shows you, step by step,
            how to break out of thought loops and live with a calm, clear mind.
          </p>
          <PriceTag course={course} discount={discount} big />
          <p className="text-xs text-muted-foreground mt-2 mb-6">One-time payment · Lifetime access</p>
          <BuyButton onClick={buy} testId="lp-hero-buy" className="w-full sm:w-auto" />
           <a href="#free-sample" data-testid="lp-free-sample-link" className="block mt-3 text-sm text-brand-gold underline underline-offset-4">Not ready yet? Get a free sample →</a>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><PlayCircle className="w-4 h-4 text-brand-gold" /> {course.lessons} video lessons</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-brand-gold" /> 3 weeks</span>
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-brand-gold" /> 5 printed books delivered</span>
            <span className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-brand-gold" /> Watch on mobile</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 bg-brand-purple/20 blur-3xl rounded-full" aria-hidden />
          {course.thumbnail ? (
            <img src={course.thumbnail} alt="Overcoming Overthinking course by Vishnu Raghav" width="640" height="400" fetchpriority="high"
              className="relative w-full aspect-[16/10] object-cover rounded-3xl border border-white/10" />
          ) : (
            <div className="relative w-full aspect-[16/10] rounded-3xl border border-white/10 bg-ink-800" />
          )}
        </div>
      </section>

        <WhatYouGet />
      {/* Is this for you */}
      <section className="bg-ink-900/70 border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-5 py-16">
          <SectionTitle eyebrow="Is this course for you?">If even one of these sounds like you…</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            {FOR_YOU.map((t, i) => (
              <div key={i} data-testid={`lp-for-you-${i}`} className="reveal flex gap-3 items-start bg-ink-950/60 border border-white/[0.06] rounded-xl p-4">
                <span className="w-6 h-6 rounded-full bg-brand-goldSoft border border-brand-gold/30 flex items-center justify-center flex-shrink-0"><Check className="w-3.5 h-3.5 text-brand-gold" /></span>
                <span className="text-sm leading-relaxed">{t}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">…this course was made for you.</p>
        </div>
      </section>

      {/* What you'll learn */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <SectionTitle eyebrow="What you'll learn">{course.modules} modules · {course.lessons} lessons · 3 weeks</SectionTitle>
        <div className="grid md:grid-cols-3 gap-4">
          {WEEKS.map((w, i) => (
            <div key={w.n} data-testid={`lp-week-${i}`} className="reveal relative bg-ink-900 border border-white/[0.07] rounded-2xl p-6 hover:border-brand-gold/30 transition-colors">
              <div className="text-xs font-bold text-brand-gold mb-1">{w.n} · {w.l} lessons</div>
              <div className="font-serif text-2xl font-extrabold mb-2">{w.t}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="bg-ink-900/70 border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-5 py-16 grid md:grid-cols-[220px_1fr] gap-8 items-center">
          <img src="/vishnu-author.jpg" alt="Vishnu Raghav" loading="lazy" width="220" height="260" className="w-40 md:w-full aspect-[4/5] object-cover rounded-2xl border border-brand-gold/20" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-brand-gold font-bold mb-2">Your guide</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold mb-3">Vishnu Raghav</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              Hindi author, life coach and educator. Through his books and YouTube videos, Vishnu helps people deal with
              overthinking, time management and relationship struggles. This course brings those ideas together in a clear,
              step-by-step format.
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5 bg-ink-950/60 border border-white/[0.07] rounded-full px-3 py-1.5"><BookOpen className="w-3.5 h-3.5 text-brand-gold" /> Author of 4 books</span>
              <span className="flex items-center gap-1.5 bg-ink-950/60 border border-white/[0.07] rounded-full px-3 py-1.5"><Youtube className="w-3.5 h-3.5 text-red-400" /> YouTube creator</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        {studentReviews.length > 0 ? (
          <>
            <SectionTitle eyebrow="Student reviews">What students say about the course</SectionTitle>
            <div className="grid md:grid-cols-3 gap-4">
              {studentReviews.slice(0, 6).map((r, i) => (
                <ReviewCard key={r.id} testId={`lp-student-review-${i}`} rating={r.rating} text={r.text} name={r.name}
                  sub={r.city ? `${r.city} · Verified student` : "Verified student"} />
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionTitle eyebrow="Testimonials">What readers and viewers say</SectionTitle>
            <div className="grid md:grid-cols-3 gap-4">
              {REVIEWS.map(([text, name, loc], i) => (
                <ReviewCard key={name} testId={`lp-review-${i}`} rating={5} text={text} name={name} sub={loc} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Price block */}
      <section className="max-w-3xl mx-auto px-5 pb-16">
        <div data-testid="lp-price-block" className="relative bg-ink-900 border border-brand-gold/30 rounded-3xl p-7 sm:p-10 text-center overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 bg-brand-gold/15 blur-3xl" aria-hidden />
          <div className="relative">
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold mb-2">Start today</h2>
            <p className="text-sm text-muted-foreground mb-6">Overcoming Overthinking — full course</p>
            <div className="flex justify-center mb-6"><PriceTag course={course} discount={discount} /></div>
            <ul className="text-sm text-left max-w-xs mx-auto space-y-2 mb-7">
                {[`${course.lessons} video lessons · 3-week plan`, "5 printed books delivered home", "Practical workbook (PDF)", "1-to-1 personal session", "Lifetime access on any device"].map((f) => (
                <li key={f} className="flex gap-2 items-center"><Check className="w-4 h-4 text-green-400 flex-shrink-0" /> {f}</li>
              ))}
            </ul>
            <BuyButton onClick={buy} testId="lp-price-buy" className="w-full sm:w-auto" />
            <p className="text-[11px] text-muted-foreground mt-3">UPI · Cards · Net Banking — secured by Razorpay</p>
          </div>
        </div>
      </section>

      <LeadCapture />
      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 pb-16">
        <SectionTitle eyebrow="FAQ">Frequently asked questions</SectionTitle>
        <Faq />
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer" data-testid="lp-whatsapp-question"
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#25D366] border border-[#25D366]/40 rounded-full px-5 py-2.5 hover:bg-[#25D366]/10 transition-colors">
          <MessageCircle className="w-4 h-4" /> Have a question? Chat on WhatsApp
        </a>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-5 py-16 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold mb-3">You don't need to stop thinking — just stop <span className="italic text-gold-gradient">overthinking</span>.</h2>
          <p className="text-sm text-muted-foreground mb-7">21 days, one small step a day. Start today.</p>
          <BuyButton onClick={buy} testId="lp-final-buy" />
        </div>
      </section>

      <footer className="text-center text-[11px] text-muted-foreground pb-8 px-5 space-x-3">
        <Link to="/privacy-policy" className="underline">Privacy</Link>
        <Link to="/terms" className="underline">Terms</Link>
        <Link to="/refund-policy" className="underline">Refund</Link>
        <span>© Vishnu Raghav</span>
      </footer>

      {/* Sticky mobile buy bar (portal: page animation would break position:fixed) */}
      {createPortal(<div data-testid="lp-sticky-bar" className="md:hidden fixed bottom-0 inset-x-0 z-[80] bg-ink-950/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center gap-3">
        <div className="leading-tight">
          <div className="text-lg font-black text-gold-gradient">₹{course.price.toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-muted-foreground line-through">₹{course.original_price.toLocaleString("en-IN")}</div>
        </div>
        <button data-testid="lp-sticky-buy" onClick={buy} className="flex-1 bg-gold-gradient text-ink-950 rounded-xl font-extrabold py-3 text-sm active:scale-[0.98] transition-transform">
          Enroll Now
        </button>
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer" aria-label="Ask a question on WhatsApp" data-testid="lp-sticky-whatsapp"
          className="w-11 h-11 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </a>
      </div>, document.body)}
    </div>
  );
}
