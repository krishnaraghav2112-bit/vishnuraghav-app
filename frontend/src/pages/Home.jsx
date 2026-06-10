import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Clock, Brain, Sparkles, Heart, Youtube, Instagram, Facebook, Linkedin, Mail, Star, BookOpen, Zap, Flame, Briefcase, Globe, Shield, Award, Lock, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { makeBookCover, makeAuthorPortrait } from "../lib/bookCover";
import SuccessLottie from "../components/SuccessLottie";

const iconMap = { Clock, Brain, Sparkles, Heart, BookOpen, Zap, Flame, Briefcase };

const bookEmojis = { "jo-mai-kah-na-saka": "💬", "dagmagate-pair": "🚶", "uljha-jeevan": "🧠" };

// Extract video id from various YouTube URL formats: watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/
function extractYoutubeId(url = "") {
  if (!url) return null;
  const u = String(url).trim();
  if (!u) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/live\/([a-zA-Z0-9_-]{11})/,
    /\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) return m[1];
  }
  // Last-resort: if string looks like a raw 11-char video id
  if (/^[a-zA-Z0-9_-]{11}$/.test(u)) return u;
  return null;
}

export default function Home({ onOpenAuth, onOpenPay }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [books, setBooks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [assets, setAssets] = useState({ author_photo: "", youtube_videos: [], youtube_channel_url: "https://youtube.com/@vishnuraghav" });
  const [blogQ, setBlogQ] = useState("");
  const [blogCat, setBlogCat] = useState("all");
  const [nlEmail, setNlEmail] = useState("");
  const [nlBusy, setNlBusy] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", purpose: "Course Enquiry", message: "" });
  const [contactBusy, setContactBusy] = useState(false);
  const [nlSuccess, setNlSuccess] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const fallbackPortrait = makeAuthorPortrait();
  const authorPhoto = assets.author_photo || fallbackPortrait;

  useEffect(() => {
    api.get("/books").then((r) => setBooks(r.data)).catch(() => {});
    api.get("/courses").then((r) => setCourses(r.data)).catch(() => {});
    api.get("/site/assets").then((r) => setAssets(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    const params = new URLSearchParams();
    if (blogCat !== "all") params.set("category", blogCat);
    if (blogQ) params.set("q", blogQ);
    api.get(`/blog?${params}`).then((r) => setBlogs(r.data)).catch(() => {});
  }, [blogCat, blogQ]);

  const enrollClick = (course) => {
    if (!user) { onOpenAuth("login"); return; }
    onOpenPay(course);
  };

  const subscribeNl = async () => {
    if (!nlEmail.includes("@")) { toast.error("Please enter a valid email"); return; }
    setNlBusy(true);
    try {
      await api.post("/newsletter/subscribe", { email: nlEmail });
      setNlSuccess(true);
      setNlEmail("");
      setTimeout(() => setNlSuccess(false), 4500);
    } catch (e) { toast.error(formatApiError(e)); }
    setNlBusy(false);
  };

  const sendContact = async () => {
    if (!contact.name || !contact.email || !contact.message) { toast.error("Please fill name, email and message"); return; }
    setContactBusy(true);
    try {
      await api.post("/contact", contact);
      setContactSuccess(true);
      setContact({ name: "", email: "", phone: "", purpose: "Course Enquiry", message: "" });
      setTimeout(() => setContactSuccess(false), 5000);
    } catch (e) { toast.error(formatApiError(e)); }
    setContactBusy(false);
  };

  // ── HERO ─────────────────────────────────────────────────────
  return (
    <main data-testid="home-page">
      <section id="home" className="relative min-h-[94vh] flex items-center px-5 lg:px-10 py-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse 70% 60% at 65% 42%,rgba(124,92,252,.12),transparent 60%),radial-gradient(ellipse 45% 38% at 10% 78%,rgba(201,168,76,.07),transparent 55%)" }} />
        <div className="absolute inset-0 grain-bg pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full flex flex-wrap gap-12 items-center relative z-10">
          <div className="flex-1 min-w-[280px] animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-brand-gold/20 rounded-full pl-1 pr-4 py-1 mb-6">
              <div className="flex -space-x-1.5">
                {["RK", "SM", "AP"].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gold-gradient border-2 border-ink-950 flex items-center justify-center text-[8px] font-black text-ink-950">{i}</div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground"><strong className="text-brand-gold">2,090+</strong> readers this month</span>
            </div>

            <h1 className="font-serif font-black tracking-tight leading-[1.05] text-[clamp(2.2rem,5.5vw,4.2rem)] mb-5">
              He Writes What<br/>You <span className="text-gold-gradient italic">Feel</span> But<br/>Can't <span className="text-purple-gradient italic">Say.</span>
            </h1>

            <p className="text-muted-foreground text-base lg:text-lg leading-relaxed max-w-[500px] mb-3">
              Bestselling Hindi author, life coach & educator helping thousands master time, silence overthinking, and build a life of clarity — through books, YouTube & premium courses.
            </p>
            <blockquote className="text-sm italic text-brand-gold/70 border-l-2 border-brand-gold pl-3.5 mb-8 leading-relaxed">
              "Dagmagate Pair" · "Jo Mai Kah Na Saka" · "Uljha Jeevan" · vishnuraghav.in
            </blockquote>

            <div className="flex gap-3 flex-wrap mb-10">
              <button
                data-testid="hero-cta-courses"
                onClick={() => document.getElementById("courses").scrollIntoView({ behavior: "smooth" })}
                className="bg-gold-gradient text-ink-950 px-7 py-3.5 rounded-xl font-extrabold text-sm hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-brand-gold/40 transition-all animate-gold-pulse btn-shimmer"
              >
                🎓 Explore Courses
              </button>
              <button
                data-testid="hero-cta-books"
                onClick={() => document.getElementById("books").scrollIntoView({ behavior: "smooth" })}
                className="bg-white/[0.04] border border-white/[0.08] text-foreground px-6 py-3.5 rounded-xl font-semibold text-sm hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                📚 Read Books
              </button>
            </div>

            <div className="flex gap-8 flex-wrap">
              {[
                ["3+", "Books Published"],
                ["2K+", "Students Enrolled"],
                ["Active", "YouTube Channel"],
                ["4.9★", "Avg Rating"],
              ].map(([n, l]) => (
                <div key={l}>
                  <span className="block text-2xl font-black text-gold-gradient leading-none">{n}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 block">{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-none w-full md:w-[320px] flex flex-col items-center gap-8 animate-fade-up">
            <div className="relative w-[260px] h-[260px]">
              <div className="absolute inset-[-12px] rounded-full bg-gradient-to-br from-brand-gold to-brand-purple opacity-25 blur-2xl animate-glow-pulse" />
              <img src={authorPhoto} alt="Vishnu Raghav" className="relative w-[260px] h-[260px] rounded-full object-cover object-top border-[3px] border-brand-gold/40" />
              {/* Orbiting gold sparks — premium accent (CSS only) */}
              <div className="hero-orbit" aria-hidden="true">
                <span className="hero-spark s1" />
                <span className="hero-spark s2" />
                <span className="hero-spark s3" />
              </div>
            </div>

            <div className="flex items-end gap-5">
              <div className="rounded-lg overflow-hidden shadow-2xl shadow-black/70 animate-float-y">
                <img
                  src={books.find(b => b.slug === "dagmagate-pair")?.cover_image || makeBookCover({ title: "Dagmagate Pair", hindi: "डगमगाते", emoji: "🚶", palette: ["#4a6741", "#8a9a5a"] })}
                  alt="Dagmagate Pair" width={82} height={112} className="block object-cover w-[82px] h-[112px]"
                />
              </div>
              <div className="rounded-lg overflow-hidden shadow-2xl shadow-black/70 animate-float-y2">
                <img
                  src={books.find(b => b.slug === "jo-mai-kah-na-saka")?.cover_image || makeBookCover({ title: "Jo Mai Kah", hindi: "जो मैं", emoji: "💬", palette: ["#1a3a5c", "#2c5f8a"] })}
                  alt="Jo Mai Kah Na Saka" width={92} height={126} className="block object-cover w-[92px] h-[126px]"
                />
              </div>
            </div>

            <div className="text-center">
              <strong className="block font-serif text-base font-bold">Vishnu Raghav</strong>
              <span className="text-xs text-muted-foreground">Author · Speaker · Life Coach</span>
            </div>
          </div>
        </div>
      </section>

      {/* Platforms bar */}
      <div className="flex justify-center items-center gap-4 flex-wrap py-4 px-5 border-y border-white/[0.07] bg-ink-900">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Find on</span>
        {[
          ["🛒 Amazon", "text-orange-400"],
          ["🛍️ Flipkart", "text-blue-400"],
          ["▶ YouTube", "text-red-400"],
          ["📸 @vishnuraghav21", "text-pink-400"],
        ].map(([t, c]) => (
          <div key={t} className={`bg-ink-800 border border-white/[0.07] rounded-md px-3 py-1.5 text-xs font-bold ${c}`}>{t}</div>
        ))}
      </div>

      {/* COURSES */}
      <section id="courses" className="px-5 lg:px-10 py-20 max-w-7xl mx-auto">
        <div className="reveal">
          <SectionLabel>Online Courses</SectionLabel>
          <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-3">Learn Directly from Vishnu</h2>
          <p className="text-muted-foreground max-w-xl mb-10 text-sm lg:text-base leading-relaxed">
            Structured video courses with modules, exercises, community access, and verified certificates. Buy once — access forever.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {courses.map((c, i) => {
            const Icon = iconMap[c.icon] || BookOpen;
            const disc = Math.round((1 - c.price / c.original_price) * 100);
            return (
              <div key={c.slug} className={`reveal delay${(i % 4) + 1} premium-card bg-ink-800 border ${c.featured ? "border-brand-gold/30" : "border-white/[0.07]"} rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-black/40 flex flex-col group`}>
                <div className="h-44 relative flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.palette[0]}, ${c.palette[1]})` }}>
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt={c.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Icon className="w-14 h-14 text-white/80 drop-shadow-xl" strokeWidth={1.4} />
                  )}
                  {c.featured && (
                    <div className="absolute top-2.5 left-2.5 bg-gold-gradient text-ink-950 text-[10px] font-extrabold px-2.5 py-1 rounded-full">⭐ Most Popular</div>
                  )}
                  {c.new && (
                    <div className="absolute top-2.5 right-2.5 bg-brand-purple/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">New</div>
                  )}
                  <div className="absolute bottom-2.5 right-2.5 bg-black/60 border border-brand-gold/30 text-brand-gold text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur">🏆 Certificate</div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-serif font-extrabold text-base leading-tight mb-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{c.tagline}</p>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {[c.duration, `${c.lessons} Lessons`, `${c.modules} Modules`, c.level].map((t) => (
                      <span key={t} className="bg-ink-900 border border-white/[0.07] rounded-full text-[10px] px-2 py-0.5 text-muted-foreground">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`w-3 h-3 ${s <= Math.round(c.rating) ? "fill-brand-gold text-brand-gold" : "text-muted-foreground"}`} />)}
                    </div>
                    <span className="text-xs font-bold">{c.rating}</span>
                    <span className="text-xs text-muted-foreground">👥 {c.students}</span>
                  </div>
                  <div className="h-[3px] bg-white/[0.07] rounded-full mb-3 overflow-hidden">
                    <div className="h-full bg-purple-gradient" style={{ width: `${Math.min(100, c.students / 10)}%` }} />
                  </div>
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <span className="text-xl font-black text-brand-gold">₹{c.price.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-muted-foreground line-through ml-1.5">₹{c.original_price.toLocaleString("en-IN")}</span>
                    </div>
                    <span className="text-[10px] text-green-400 font-bold">{disc}% OFF</span>
                  </div>
                  <button
                    data-testid={`enroll-${c.slug}`}
                    onClick={() => enrollClick(c)}
                    className={`mt-auto w-full py-2.5 rounded-lg font-extrabold text-sm transition-all hover:-translate-y-0.5 ${
                      c.color === "gold" ? "bg-gold-gradient text-ink-950" : "bg-purple-gradient text-white"
                    }`}
                  >
                    Buy Now — ₹{c.price.toLocaleString("en-IN")} →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BOOKS */}
      <section id="books" className="bg-ink-900 px-5 lg:px-10 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="reveal">
            <SectionLabel>Published Works</SectionLabel>
            <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-3">Books That Speak Your Heart</h2>
            <p className="text-muted-foreground max-w-xl mb-10 text-sm lg:text-base leading-relaxed">Real emotions. Honest words. Each book a mirror for the feelings you carry but rarely express.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {books.map((b, i) => {
              const cover = b.cover_image || makeBookCover({ title: b.title, hindi: b.hindi, emoji: bookEmojis[b.slug] || "✦", palette: b.cover_palette });
              return (
                <div key={b.slug} className={`reveal delay${(i % 3) + 1} premium-card bg-ink-800 border border-white/[0.07] rounded-2xl overflow-hidden hover:shadow-2xl`}>
                  <div className="h-72 relative overflow-hidden bg-ink-700">
                    <img src={cover} alt={b.title} className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 to-transparent" />
                    {b.badge && (
                      <div className={`absolute top-3 left-3 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                        b.status === "upcoming" ? "bg-gradient-to-r from-red-700 to-red-900 text-white" : "bg-gold-gradient text-ink-950"
                      }`}>{b.badge}</div>
                    )}
                    {b.price && b.price !== "Coming Soon" && (
                      <div className="absolute top-3 right-3 bg-ink-950/80 border border-brand-gold/30 text-brand-gold text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur">{b.price}</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif font-extrabold text-base mb-0.5">{b.title}</h3>
                    <div className="text-sm text-brand-gold italic mb-1">{b.hindi}</div>
                    <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{b.publisher} · {b.tagline}</p>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{b.description}</p>
                    <div className="bg-brand-gold/5 border border-brand-gold/15 border-l-2 border-l-brand-gold rounded-r-lg p-3 mb-4">
                      <p className="text-xs italic text-foreground/70 leading-relaxed">{b.excerpt}</p>
                    </div>
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-brand-gold mb-2">Key Takeaways</h4>
                    <ul className="space-y-1 mb-4">
                      {b.takeaways.map((t) => (
                        <li key={t} className="text-xs text-muted-foreground pl-3.5 relative leading-relaxed">
                          <span className="absolute left-0 text-brand-gold text-[9px] top-1">✦</span>{t}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      {b.amazon ? (
                <a href={b.amazon} target="_blank" rel="noopener noreferrer" data-testid={`book-amazon-${b.slug}`}
                          className="flex-1 py-2 rounded-md text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/25 hover:bg-orange-500/20 transition-colors text-center flex items-center justify-center gap-1">
                          <ShoppingCart className="w-3 h-3" /> Amazon
                        </a>
                      ) : null}
                      {b.flipkart ? (
                        <a href={b.flipkart} target="_blank" rel="noopener noreferrer" data-testid={`book-flipkart-${b.slug}`}
                          className="flex-1 py-2 rounded-md text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-center">
                          🛍️ Flipkart
                        </a>
                      ) : null}
                      {b.status === "upcoming" && (
                        <button onClick={() => toast.success("🔔 You'll be notified at launch!")}
                          data-testid={`book-notify-${b.slug}`}
                          className="flex-1 py-2 rounded-md text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 transition-colors">
                          🔔 Notify Me
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="px-5 lg:px-10 py-20">
        <div className="max-w-6xl mx-auto reveal">
          <div className="flex flex-col md:flex-row gap-14 items-center">
            <div className="flex-none text-center">
              <div className="relative w-[240px] mx-auto">
                <div className="absolute inset-[-7px] rounded-3xl bg-gradient-to-br from-brand-gold to-brand-purple opacity-30 blur-xl" />
                <img src={authorPhoto} alt="Vishnu Raghav" className="relative w-[240px] h-[300px] rounded-2xl object-cover object-top border-2 border-brand-gold/35 shadow-2xl shadow-black/60" />
              </div>
              <div className="text-2xl font-serif italic text-brand-gold/60 mt-4">— Vishnu Raghav</div>
            </div>
            <div className="flex-1 min-w-[260px]">
              <SectionLabel>About the Author</SectionLabel>
              <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-3">
                A Voice for the<br/>Silent Mind
              </h2>
              <blockquote className="text-brand-gold italic text-base border-l-2 border-brand-gold pl-3.5 mb-4 leading-relaxed">
                "I write what you feel but cannot say — because those words deserve to exist in the world."
              </blockquote>
              <p className="text-muted-foreground mb-3 leading-relaxed">
                Vishnu Raghav is an author, motivator, and life coach who works on inner beauty, principles, and spiritual thoughts. He believes understanding the roots of our emotions makes everything easier.
              </p>
              <p className="text-muted-foreground mb-5 leading-relaxed">
                Published by BlueRose ONE (New Delhi · London), his books have reached readers across India. Connect via Instagram <span className="text-brand-gold">@vishnuraghav21</span> and YouTube <span className="text-brand-gold">@vishnuraghav</span>.
              </p>
              <div className="flex gap-3 flex-wrap">
                {[["3", "Books"], ["4.9★", "Avg Rating"], ["Hindi", "Literature"], ["Pan India", "Readership"]].map(([n, l]) => (
                  <div key={l} className="glass border border-white/[0.08] rounded-xl px-4 py-2.5 text-center min-w-[88px]">
                    <strong className="block text-xl font-black text-gold-gradient">{n}</strong>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="bg-ink-900 px-5 lg:px-10 py-20">
        <div className="max-w-3xl mx-auto reveal">
          <div className="text-center mb-12">
            <SectionLabel centered>Your Path</SectionLabel>
            <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-3">The Transformation Journey</h2>
            <p className="text-muted-foreground text-sm">5 steps from where you are to where you want to be.</p>
          </div>
          <div className="relative">
            <div className="absolute left-[26px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-brand-gold via-brand-purple to-brand-gold" />
            {[
              ["🌱", "Discover Your Blocks", "Understand what's holding you back — overthinking, time misuse, emotional patterns, or relationship struggles."],
              ["📚", "Books That Mirror You", "Dive into Vishnu's books. Let the words unlock what you couldn't express or understand about yourself."],
              ["🎓", "Enroll in a Course", "Get structured, step-by-step video lessons with exercises, quizzes, and a private student community."],
              ["📈", "Monitor Your Progress", "Your dashboard tracks streaks, completion %, achievement badges, and lesson history in real time."],
              ["🏆", "Download Your Certificate", "Complete 100% of a course and download your official PDF certificate signed by Vishnu Raghav."],
            ].map(([ico, title, desc], i) => (
              <div key={i} className="flex gap-5 mb-7 items-start group">
                <div className="w-[54px] h-[54px] rounded-full border-2 border-brand-gold flex items-center justify-center text-xl bg-ink-950 relative z-10 group-hover:bg-brand-goldSoft transition-colors">{ico}</div>
                <div className="flex-1 glass border border-white/[0.07] rounded-xl p-4 group-hover:border-brand-gold/25 transition-colors">
                  <div className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mb-1">Step {i + 1}</div>
                  <h3 className="font-serif text-base font-bold mb-1">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-5 lg:px-10 py-20 max-w-7xl mx-auto reveal">
        <SectionLabel>Student Success</SectionLabel>
        <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-3">Words That Moved People</h2>
        <p className="text-muted-foreground max-w-xl mb-10 text-sm">Real students, real transformations, real results.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            ["Jo Mai Kah Na Saka felt like Vishnu wrote every word just for me. I cried reading it — in the best way.", "Riya Patel", "Reader · Mumbai", "RP", "Verified Purchase"],
            ["The Time Management course completely transformed how I structure my day. I accomplish more in 4 hours than I used to in 8.", "Sunita Mishra", "Professional · Delhi", "SM", "Course Graduate"],
            ["Dagmagate Pair is the most honest Hindi book I've ever read. He writes what we all think but never dare to say.", "Aditya Kumar", "Student · Lucknow", "AK", "Verified Purchase"],
            ["His YouTube content on mind control helped me through the hardest phase of my life. Truly life-changing.", "Meera Verma", "MBA Student · Pune", "MV", "Verified Subscriber"],
          ].map(([text, name, loc, av, vtype], i) => (
            <div key={i} className="glass border border-white/[0.07] rounded-2xl p-5 hover:border-brand-gold/20 hover:-translate-y-1 transition-all">
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-3.5 h-3.5 fill-brand-gold text-brand-gold" />)}
              </div>
              <p className="text-sm italic text-muted-foreground mb-4 leading-relaxed">"{text}"</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-gold to-brand-purple flex items-center justify-center font-black text-[10px] text-ink-950">{av}</div>
                <div>
                  <div className="text-xs font-bold">{name}</div>
                  <div className="text-[10px] text-muted-foreground">{loc}</div>
                  <div className="text-[10px] text-green-400 flex items-center gap-0.5 mt-0.5">✓ {vtype}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap justify-center mt-12">
          {[[BookOpen, "3 Books", "Published"], [Shield, "Secure", "Video Access"], [Award, "Auto Cert", "On Completion"], [Lock, "Razorpay", "Safe Payment"], [Star, "4.9 / 5", "Rating"]].map(([Icon, n, l], i) => (
            <div key={i} className="glass border border-brand-gold/15 rounded-xl px-4 py-2.5 flex items-center gap-2.5 hover:border-brand-gold hover:-translate-y-0.5 transition-all">
              <Icon className="w-4 h-4 text-brand-gold" />
              <div>
                <strong className="block text-xs font-bold">{n}</strong>
                <span className="text-[10px] text-muted-foreground">{l}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* YOUTUBE */}
      <section id="youtube" className="bg-ink-900 px-5 lg:px-10 py-20">
        <div className="max-w-7xl mx-auto reveal">
          <SectionLabel>YouTube</SectionLabel>
          <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-3">Watch. Learn. Grow.</h2>
          <p className="text-muted-foreground max-w-xl mb-10 text-sm">Free content every week — real talk on motivation, life skills, and emotional wellbeing in Hindi.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {(assets.youtube_videos && assets.youtube_videos.length > 0 ? assets.youtube_videos : [
              { title: "Time Management की पूरी Guide", url: "", palette: ["#1a1228", "#3a2865"] },
              { title: "Overthinking को कैसे रोकें — 5 Steps", url: "", palette: ["#120c28", "#2c1870"] },
              { title: "Failure के बाद कैसे उठें — Real Talk", url: "", palette: ["#1a0a10", "#4a1030"] },
            ]).map((v, i) => {
              const vid = extractYoutubeId(v.url);
              const thumb = vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : null;
              const watchUrl = v.url || assets.youtube_channel_url;
              const fallbackIcon = [Clock, Brain, Heart][i % 3];
              const Icon = fallbackIcon;
              const palette = v.palette || ["#1a1228", "#3a2865"];
              return (
                <a key={i} href={watchUrl} target="_blank" rel="noopener noreferrer"
                   data-testid={`yt-card-${i}`}
                   className="block bg-ink-800 border border-white/[0.07] rounded-2xl overflow-hidden hover:border-red-500/30 hover:-translate-y-1 transition-all cursor-pointer group">
                  <div className="h-44 relative overflow-hidden" style={!thumb ? { background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})` } : undefined}>
                    {thumb ? (
                      <img src={thumb} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <Icon className="w-12 h-12 text-white/70 absolute inset-0 m-auto" strokeWidth={1.3} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform shadow-2xl shadow-black/50">▶</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-serif text-sm font-bold mb-1 leading-snug line-clamp-2">{v.title}</h4>
                    <div className="text-[11px] text-muted-foreground">Watch on YouTube →</div>
                  </div>
                </a>
              );
            })}
          </div>

          <div className="text-center mb-12">
            <a href={assets.youtube_channel_url || "https://youtube.com/@vishnuraghav"} target="_blank" rel="noopener noreferrer" data-testid="yt-subscribe"
               className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-7 py-3 rounded-xl font-extrabold text-sm hover:-translate-y-0.5 transition-all">
              <Youtube className="w-4 h-4" /> Subscribe on YouTube
            </a>
          </div>

          <p className="text-[10px] uppercase tracking-widest text-brand-gold font-bold flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-brand-gold" /> Topics Covered
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[["⏰", "Time Mgmt"], ["🧠", "Mind Control"], ["😤", "Control Anger"], ["💔", "Handle Failure"], ["🧘", "Meditation"], ["💞", "Relationships"], ["🌱", "Self-Esteem"], ["🎯", "Deep Focus"], ["😔", "Depression"], ["⚡", "Motivation"], ["👨‍👩‍👧", "Family"], ["🌟", "Spiritual"]].map(([ico, l]) => (
              <a key={l} href={assets.youtube_channel_url || "https://youtube.com/@vishnuraghav"} target="_blank" rel="noopener noreferrer"
                 className="glass border border-white/[0.07] rounded-xl p-3 flex items-center gap-2.5 hover:border-brand-purple hover:bg-brand-purpleSoft hover:-translate-y-0.5 transition-all">
                <div className="w-9 h-9 rounded-lg bg-brand-purpleSoft flex items-center justify-center text-base">{ico}</div>
                <div className="text-xs font-semibold leading-tight">{l}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG */}
      <section id="blog" className="px-5 lg:px-10 py-20 max-w-7xl mx-auto">
        <div className="reveal">
          <SectionLabel>Blog</SectionLabel>
          <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-5">Ideas Worth Reading</h2>
          <div className="flex gap-2 mb-6 max-w-md">
            <input
              data-testid="blog-search"
              value={blogQ}
              onChange={(e) => setBlogQ(e.target.value)}
              placeholder="Search articles..."
              className="flex-1 bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-2 text-sm focus:border-brand-gold outline-none"
            />
            <button className="bg-brand-gold text-ink-950 px-4 py-2 rounded-lg text-sm font-bold">Search</button>
          </div>
          <div className="flex gap-2 flex-wrap mb-8">
            {[["all", "All"], ["productivity", "Productivity"], ["motivation", "Motivation"], ["time", "Time Mgmt"], ["career", "Career"], ["study", "Study Skills"]].map(([k, l]) => (
              <button key={k} onClick={() => setBlogCat(k)} data-testid={`blog-cat-${k}`}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  blogCat === k ? "bg-brand-goldSoft border-brand-gold/30 text-brand-gold" : "bg-ink-800 border-white/[0.07] text-muted-foreground hover:border-brand-gold/30"
                }`}>{l}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {blogs.map((p, i) => {
            const Icon = iconMap[p.icon] || BookOpen;
            return (
              <button key={p.slug} onClick={() => nav(`/blog/${p.slug}`)}
                data-testid={`blog-card-${p.slug}`}
                className={`text-left premium-card bg-ink-800 border border-white/[0.07] rounded-2xl overflow-hidden ${p.featured ? "sm:col-span-2" : ""}`}>
                <div className="relative flex items-center justify-center overflow-hidden" style={{ height: p.featured ? "200px" : "160px", background: `linear-gradient(135deg, ${p.palette[0]}, ${p.palette[1]})` }}>
                  {p.image ? (
                    <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Icon className="w-12 h-12 text-white/70" strokeWidth={1.3} />
                  )}
                  <div className="absolute top-3 left-3 bg-brand-goldSoft border border-brand-gold/30 text-brand-gold text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{p.category}</div>
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-base font-bold mb-2 leading-snug">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{p.excerpt}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] text-muted-foreground">{p.date} · {p.read_min} min</div>
                    <div className="text-xs text-brand-gold font-semibold">Read →</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="bg-ink-900 px-5 lg:px-10 py-20">
        <div className="max-w-2xl mx-auto text-center reveal">
          <SectionLabel centered>Free Newsletter</SectionLabel>
          <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-3">Weekly Wisdom in Your Inbox</h2>
          <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">
            Join readers getting Vishnu's best ideas on productivity, mindset, and growth every Monday morning.
          </p>
          <div className="inline-flex items-center gap-2 bg-brand-goldSoft border border-brand-gold/30 rounded-xl px-4 py-2.5 mt-5 text-sm font-bold text-brand-gold">
            🎁 Free: "10 Rules for a Disciplined Mind" PDF on signup
          </div>
          <div className="flex gap-2 mt-6 max-w-md mx-auto min-h-[44px]">
            {nlSuccess ? (
              <div data-testid="nl-success" className="flex-1 flex items-center justify-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2 animate-scale-in">
                <SuccessLottie size="sm" testId="nl-success-lottie" />
                <div className="text-left">
                  <div className="text-sm font-extrabold text-green-400">Subscribed!</div>
                  <div className="text-[11px] text-muted-foreground">Free PDF sent — check your inbox.</div>
                </div>
              </div>
            ) : (
              <>
                <input
                  data-testid="nl-email"
                  type="email"
                  value={nlEmail}
                  onChange={(e) => setNlEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm focus:border-brand-gold outline-none"
                />
                <button
                  data-testid="nl-submit"
                  onClick={subscribeNl}
                  disabled={nlBusy}
                  className="bg-brand-gold text-ink-950 px-5 py-2.5 rounded-lg text-sm font-extrabold whitespace-nowrap hover:-translate-y-0.5 transition-transform disabled:opacity-60 btn-shimmer"
                >
                  {nlBusy ? "..." : "Get Free Access"}
                </button>
              </>
            )}
          </div>
          <div className="flex justify-center gap-6 flex-wrap mt-4 text-xs text-muted-foreground">
            {["Weekly insights", "Free e-book", "No spam ever", "Unsubscribe anytime"].map((p) => (
              <span key={p} className="flex items-center gap-1"><span className="text-brand-gold font-bold">✓</span>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 lg:px-10 py-24 text-center relative overflow-hidden reveal">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 75% 65% at 50% 50%, rgba(124,92,252,.1), transparent 70%)" }} />
        <div className="relative max-w-3xl mx-auto">
          <SectionLabel centered>Begin Today</SectionLabel>
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3.2rem)] font-black tracking-tight mb-3">
            Ready to <span className="text-gold-gradient">Transform</span><br/>Your Life?
          </h2>
          <p className="text-muted-foreground mb-8 text-base max-w-md mx-auto">Books, courses, community — everything you need to grow, in one place.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              data-testid="cta-courses"
              onClick={() => document.getElementById("courses").scrollIntoView({ behavior: "smooth" })}
              className="bg-gold-gradient text-ink-950 px-7 py-3.5 rounded-xl font-extrabold text-sm hover:-translate-y-0.5 transition-transform">
              🎓 Browse Courses
            </button>
            {!user && (
              <button
                data-testid="cta-register"
                onClick={() => onOpenAuth("register")}
                className="bg-purple-gradient text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition-transform">
                Create Free Account →
              </button>
            )}
            <button
              data-testid="cta-books"
              onClick={() => document.getElementById("books").scrollIntoView({ behavior: "smooth" })}
              className="bg-white/[0.04] border border-white/[0.08] text-foreground px-7 py-3.5 rounded-xl font-semibold text-sm hover:border-brand-gold hover:text-brand-gold transition-colors">
              📚 Explore Books
            </button>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="px-5 lg:px-10 py-20 bg-ink-900">
        <div className="max-w-5xl mx-auto reveal">
          <div className="text-center mb-12">
            <SectionLabel centered>Contact</SectionLabel>
            <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-3">Get in Touch</h2>
            <p className="text-muted-foreground text-sm">Collaborations, speaking, course queries, or just a hello.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3 min-h-[420px]">
              {contactSuccess ? (
                <div data-testid="contact-success" className="h-full flex flex-col items-center justify-center text-center bg-green-500/10 border border-green-500/30 rounded-2xl p-8 animate-scale-in">
                  <SuccessLottie size="lg" testId="contact-success-lottie" />
                  <div className="mt-3 text-xl font-extrabold text-green-400 font-serif">Message Sent!</div>
                  <div className="text-sm text-muted-foreground mt-1.5">Vishnu will reply within 48 hours.</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                <Field label="Full Name"><input data-testid="contact-name" type="text" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Your Name" className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm focus:border-brand-gold outline-none" /></Field>
                <Field label="Email"><input data-testid="contact-email" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="you@email.com" className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm focus:border-brand-gold outline-none" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Phone"><input data-testid="contact-phone" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+91 98765 43210" className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm focus:border-brand-gold outline-none" /></Field>
                <Field label="Purpose">
                  <select data-testid="contact-purpose" value={contact.purpose} onChange={(e) => setContact({ ...contact, purpose: e.target.value })}
                    className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm focus:border-brand-gold outline-none appearance-none">
                    {["Course Enquiry", "Book Order", "Collaboration", "Speaking Invite", "Other"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Message">
                <textarea data-testid="contact-message" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} placeholder="Write your message..." className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm focus:border-brand-gold outline-none resize-y min-h-[108px]" />
              </Field>
              <button data-testid="contact-submit" onClick={sendContact} disabled={contactBusy}
                className="w-full bg-gold-gradient text-ink-950 rounded-lg py-3 text-sm font-extrabold hover:-translate-y-0.5 transition-transform disabled:opacity-60 btn-shimmer">
                {contactBusy ? "Sending..." : "Send Message →"}
              </button>
                </>
              )}
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold mb-4">Direct Contact</h3>
              {[
                [Mail, "Email", "vishnuraghav955@gmail.com"],
                [Youtube, "YouTube", "@vishnuraghav"],
                [Instagram, "Instagram", "@vishnuraghav21"],
                [Globe, "Website", "vishnuraghav.in"],
              ].map(([Icon, l, v]) => (
                <div key={l} className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-goldSoft flex items-center justify-center text-brand-gold"><Icon className="w-4 h-4" /></div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">{l}</div>
                    <div className="text-sm font-semibold">{v}</div>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 mt-6">
                <a href="https://youtube.com/@vishnuraghav" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"><Youtube className="w-3 h-3" /> YouTube</a>
                <a href="https://www.instagram.com/vishnuraghav21" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-pink-500/20 text-pink-400 hover:bg-pink-500/10 transition-colors"><Instagram className="w-3 h-3" /> Instagram</a>
                <a href="https://www.facebook.com/share/19NGt1py5V/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition-colors"><Facebook className="w-3 h-3" /> Facebook</a>
                <a href="https://www.linkedin.com/in/vishnu-raghav-8a4385403" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-blue-600/20 text-blue-500 hover:bg-blue-600/10 transition-colors"><Linkedin className="w-3 h-3" /> LinkedIn</a>
                <a href="mailto:vishnuraghav955@gmail.com" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border border-brand-gold/20 text-brand-gold hover:bg-brand-gold/10 transition-colors"><Mail className="w-3 h-3" /> Email</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink-900 border-t border-white/[0.07] px-5 lg:px-10 pt-12 pb-7">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-8 justify-between mb-8">
            <div className="max-w-xs">
              <div className="font-serif font-black text-lg">Vishnu <span className="text-gold-gradient italic">Raghav</span></div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Author · Educator · Life Coach. Building a better India, one mind at a time.</p>
            </div>
            <FooterCol title="Books" items={[
              ["Jo Mai Kah Na Saka", "https://www.amazon.in/dp/9375427781"],
              ["Dagmagate Pair", "https://amzn.in/d/08fg9q3O"],
              ["Uljha Jeevan (Soon)", "#books"],
            ]} />
            <FooterCol title="Courses" items={courses.map((c) => [c.title, "#courses"])} />
            <FooterCol title="Platform" items={[
              ["Student Dashboard", "/dashboard"],
              ["Blog", "#blog"],
              ["Contact", "#contact"],
            ]} />
            <FooterCol title="Legal" items={[
              ["Privacy Policy", "/privacy-policy"],
              ["Terms & Conditions", "/terms"],
              ["Refund & Cancellation", "/refund-policy"],
            ]} />
          </div>
          <div className="border-t border-white/[0.07] pt-5 flex justify-between flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span>© 2026 Vishnu Raghav. All rights reserved · vishnuraghav.in</span>
            <span>Built for India's next generation of learners 🇮🇳</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SectionLabel({ children, centered }) {
  return (
    <div className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-gold mb-2 ${centered ? "justify-center" : ""}`}>
      <span className="w-4 h-px bg-brand-gold" /> {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function FooterCol({ title, items }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">{title}</h4>
      {items.map(([label, href]) => {
        const isExternal = href.startsWith("http") || href.startsWith("#");
        const Tag = isExternal ? "a" : Link;
        const props = isExternal ? { href } : { to: href };
        return (
          <Tag key={label} {...props} className="block text-xs text-muted-foreground hover:text-foreground transition-colors mb-1.5" data-testid={`footer-link-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
            {label}
          </Tag>
        );
      })}
    </div>
  );
}
