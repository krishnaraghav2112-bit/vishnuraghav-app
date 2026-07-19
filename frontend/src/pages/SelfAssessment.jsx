import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Brain, ShieldCheck, Clock, FileText, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle, Share2, Sparkles, TrendingUp, Users, BookOpen, ListChecks, Download, Instagram } from "lucide-react";
import { toast } from "sonner";
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

const STORAGE_KEY = "vr_assessment_progress";
const DOMAIN_LABELS = {
  mood: "Mood", overthinking: "Overthinking", self_worth: "Self Worth",
  stress: "Anxiety & Stress", daily_functioning: "Focus & Daily", relationships_purpose: "Relationships",
  safety: "Wellbeing Check",
};
const DISCOVERY_SOURCES = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "friend", label: "Friend / Family" },
  { value: "google", label: "Google Search" },
  { value: "book", label: "Vishnu's Book" },
  { value: "other", label: "Other" },
];

export default function SelfAssessment({ onOpenAuth }) {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [stage, setStage] = useState("landing");
  const [questions, setQuestions] = useState([]);
  const [options, setOptions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [agree, setAgree] = useState(false);
  const [report, setReport] = useState(null);
  const [discoverySource, setDiscoverySource] = useState("");
  const [stats, setStats] = useState({ total_completed: 1247 });
  const [product, setProduct] = useState({ price: 199, is_active: false, has_pdf: false });
  const [access, setAccess] = useState({ has_access: false, pdf_url: null });
  const [paying, setPaying] = useState(false);
  const [assets, setAssets] = useState({ author_photo: "" });
  const [allBooks, setAllBooks] = useState([]);
  const shareCanvasRef = useRef(null);

  // ── Load questions + stats + saved progress ──
  // ── If URL has ?report_id=xxx, load that report directly ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reportId = params.get("report_id");
    if (!reportId) return;
    if (!user) return;
    api.get(`/assessment/detail/${reportId}`).then(({ data }) => {
      setReport(data);
      setStage("result");
    }).catch(() => toast.error("Could not load that report"));
  }, [location.search, user]);

  useEffect(() => {
    api.get("/assessment/questions").then(({ data }) => {
      setQuestions(data.questions || []);
      setOptions(data.options || []);
    }).catch(() => toast.error("Could not load assessment. Try again."));

    api.get("/assessment/stats").then(({ data }) => setStats(data)).catch(() => {});
    api.get("/assessment/product").then(({ data }) => setProduct(data)).catch(() => {});
    api.get("/site/assets").then(({ data }) => setAssets(data)).catch(() => {});
    api.get("/books").then(({ data }) => setAllBooks(data || [])).catch(() => {});
     if (user) {
      api.get("/assessment/product/access").then(({ data }) => setAccess(data)).catch(() => {});
    }

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.answers && Object.keys(saved.answers).length > 0) {
        setAnswers(saved.answers);
        setCurrentQ(saved.currentQ || 0);
      }
    } catch {}
  }, [user]);

  // ── Save progress on every answer ──
  useEffect(() => {
    if (Object.keys(answers).length > 0 && stage === "questions") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, currentQ, savedAt: Date.now() }));
    }
  }, [answers, currentQ, stage]);

  const clearSavedProgress = () => localStorage.removeItem(STORAGE_KEY);
  const hasSavedProgress = Object.keys(answers).length > 0;

  const startAssessment = (resume = false) => {
    if (authLoading) return;
    if (!user) { onOpenAuth("login"); toast.info("Please login to take the assessment"); return; }
    if (!resume) {
      setAnswers({}); setCurrentQ(0); clearSavedProgress();
    }
    setStage("disclaimer");
  };

  const selectAnswer = (qId, value) => {
    const newAns = { ...answers, [qId]: value };
    setAnswers(newAns);
    setTimeout(() => {
      if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
      else setStage("source"); // go to discovery source before submit
    }, 250);
  };

  const submitAssessment = async () => {
    setStage("loading");
    try {
      const payload = {
        answers: questions.map(q => ({ q_id: q.id, value: answers[q.id] ?? 0 })),
        discovery_source: discoverySource || null,
      };
      const { data } = await api.post("/assessment/submit", payload);
      await new Promise(r => setTimeout(r, 2400));
      setReport(data);
      clearSavedProgress();
      setStage("result");
    } catch (e) {
      toast.error(formatApiError(e));
      setStage("questions");
    }
  };

  // ── Generate Instagram Story image ──
  const generateShareImage = async () => {
    if (!report) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext("2d");

    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const loadImg = (src) => new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    const [bookImg1, bookImg2] = await Promise.all([
      loadImg("/Dagmagate%20Pair.png"),
      loadImg("/Jo%20Mai%20Kah%20Na%20Saka.png"),
    ]);

    // Palette (dark theme — matches website)
    const BG_TOP = "#0f0a1f";
    const BG_BOTTOM = "#1a0e2e";
    const GOLD = "#c9a84c";
    const GOLD_BRIGHT = "#e0c26a";
    const COPPER = "#a67840";
    const CREAM = "#f4ecd8";
    const IVORY = "#e8dcc0";
    const MUTED = "#9a8560";

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, 1920);
    bg.addColorStop(0, BG_TOP);
    bg.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1920);

    // Corner mandala rings in all 4 corners
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    [[0,0],[1080,0],[0,1920],[1080,1920]].forEach(([cx,cy]) => {
      for (let r = 60; r < 500; r += 35) {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      }
    });
    ctx.restore();

    // Central mandala petals behind score
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      ctx.save();
      ctx.translate(540, 900);
      ctx.rotate((i * Math.PI * 2) / 16);
      ctx.beginPath();
      ctx.ellipse(0, -240, 30, 90, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    ctx.textAlign = "center";

    // Top lotus ornament
    ctx.save();
    ctx.fillStyle = GOLD;
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(540, 130);
      ctx.rotate((i - 2) * 0.35);
      ctx.beginPath();
      ctx.ellipse(0, -15, 8, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(540, 140, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Tagline
    ctx.fillStyle = GOLD;
    ctx.font = "600 22px Georgia, serif";
    ctx.fillText("THE MIND HEALTH REPORT  ·  BY VISHNU RAGHAV", 540, 190);

    // Divider
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(360, 220); ctx.lineTo(720, 220); ctx.stroke();
    ctx.globalAlpha = 1;

    // "prepared for"
    ctx.fillStyle = MUTED;
    ctx.font = "italic 30px Georgia, serif";
    ctx.fillText("prepared for", 540, 285);

    // User name in calligraphy
    const rawName = (user && (user.name || (user.email && user.email.split('@')[0]))) || 'You';
    const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    ctx.fillStyle = CREAM;
    ctx.font = "italic 96px \"Brush Script MT\", \"Lucida Handwriting\", \"Segoe Script\", Georgia, serif";
    ctx.fillText(displayName, 540, 400);

    const nameWidth = ctx.measureText(displayName).width;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(540 - nameWidth/2 - 30, 425);
    ctx.quadraticCurveTo(540, 442, 540 + nameWidth/2 + 30, 425);
    ctx.stroke();

    // Score ring
    const scx = 540, scy = 900, outerR = 240, innerR = 205;

    ctx.strokeStyle = GOLD; ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(scx, scy, outerR + 25, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.15; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(scx, scy, outerR, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;

    const progressAngle = (report.total / 60) * Math.PI * 2;
    const grad = ctx.createLinearGradient(scx - outerR, scy - outerR, scx + outerR, scy + outerR);
    grad.addColorStop(0, GOLD_BRIGHT);
    grad.addColorStop(0.5, GOLD);
    grad.addColorStop(1, COPPER);
    ctx.strokeStyle = grad; ctx.lineWidth = 14; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(scx, scy, outerR, -Math.PI / 2, -Math.PI / 2 + progressAngle);
    ctx.stroke();
    ctx.lineCap = "butt";

    ctx.fillStyle = BG_TOP;
    ctx.beginPath(); ctx.arc(scx, scy, innerR, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = GOLD; ctx.globalAlpha = 0.12; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(scx, scy, innerR - 15, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = CREAM;
    ctx.font = "bold 180px Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.fillText(String(report.total), scx, scy - 10);
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = GOLD;
    ctx.font = "500 32px Georgia, serif";
    ctx.fillText("out of 60", scx, scy + 120);

    // Level label
    ctx.fillStyle = CREAM;
    ctx.font = "italic 56px Georgia, serif";
    ctx.fillText(report.level.label, 540, 1240);

    const lblWidth = ctx.measureText(report.level.label).width;
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(540 - lblWidth/2, 1258);
    ctx.quadraticCurveTo(540, 1272, 540 + lblWidth/2, 1258);
    ctx.stroke();

    const levelSubtitles = {
      healthy: 'the mind is at ease — treasure this',
      mild: 'the mind is asking for gentleness',
      moderate: 'the mind is calling for care',
      high: 'the mind needs rest and support',
      very_high: 'reach out — you are not alone',
    };
    const subtitle = levelSubtitles[report.level.key] || 'a moment of reflection';
    ctx.fillStyle = MUTED;
    ctx.font = "italic 26px Georgia, serif";
    ctx.fillText(subtitle, 540, 1305);

    // Insight bars
    const top2 = (report.top_domains || []).slice(0, 2);
    top2.forEach((d, i) => {
      const label = DOMAIN_LABELS[d] || d;
      const pct = report.domain_pct[d] || 0;
      const yy = 1390 + i * 80;
      const barX = 260, barW = 560;

      ctx.fillStyle = IVORY;
      ctx.font = "500 26px Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillText(`${label}  ·  ${pct}%`, barX, yy);

      ctx.strokeStyle = GOLD; ctx.globalAlpha = 0.15; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(barX, yy + 18); ctx.lineTo(barX + barW, yy + 18); ctx.stroke();
      ctx.globalAlpha = 1;

      const bgrad = ctx.createLinearGradient(barX, yy, barX + barW, yy);
      bgrad.addColorStop(0, GOLD_BRIGHT);
      bgrad.addColorStop(1, COPPER);
      ctx.strokeStyle = bgrad; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(barX, yy + 18);
      ctx.lineTo(barX + (barW * pct / 100), yy + 18);
      ctx.stroke();
      ctx.lineCap = "butt";
    });
    ctx.textAlign = "center";

    // Quote
    const quotes = {
      healthy: { default: '"Balance is a habit —\nkeep tending to it."', overthinking: '"A quiet mind\nis your greatest asset."', mood: '"Joy is a choice\nyou make daily."', stress: '"Peace is your natural state.\nProtect it."' },
      mild: { default: '"Small changes today,\nreal clarity tomorrow."', overthinking: '"The mind that thinks too much,\nalso feels too deeply."', stress: '"Stress ends\nwhere breath begins."', mood: '"Every storm passes.\nYours will too."', self_worth: '"You are enough,\nexactly as you are."' },
      moderate: { default: '"Awareness is the first step\nto transformation."', overthinking: '"You are not your thoughts —\nyou are the awareness."', stress: '"When the mind is heavy,\nkeep the steps small."', self_worth: '"Your worth is not a score.\nIt is your existence."', mood: '"Even the darkest night\nends in dawn."', relationships_purpose: '"Reconnect with yourself,\nthen with others."', daily_functioning: '"Progress, not perfection,\nis the goal."' },
      high: { default: '"You are not alone.\nHelp is closer than you think."', overthinking: '"Your mind is exhausted.\nBe kind to it."', mood: '"Feeling low is not failure.\nIt is a signal."', stress: '"Pause is not weakness —\nit is wisdom."' },
      very_high: { default: '"Reaching out is strength,\nnot weakness."' },
    };
    const topDomain = report.top_domains?.[0];
    const levelSet = quotes[report.level.key] || quotes.moderate;
    const quote = levelSet[topDomain] || levelSet.default;

    ctx.fillStyle = CREAM;
    ctx.font = "italic 34px Georgia, serif";
    quote.split("\n").forEach((line, i) => ctx.fillText(line, 480, 1610 + i * 46));

    ctx.fillStyle = MUTED;
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillText("— Vishnu Raghav", 480, 1720);

    // Book signature (bottom right)
    const bookOptions = [
      { img: bookImg1, title: "Dagmagate Pair" },
      { img: bookImg2, title: "Jo Mai Kah Na Saka" },
    ];
    const topDom = report.top_domains?.[0];
    const preferOverthinking = topDom === "overthinking" || topDom === "anxiety_stress";
    const preferredOrder = preferOverthinking ? [bookOptions[0], bookOptions[1]] : [bookOptions[1], bookOptions[0]];
    const selectedBook = preferredOrder.find(b => b.img) || null;

    if (selectedBook) {
      ctx.fillStyle = MUTED;
      ctx.font = "500 16px Georgia, serif";
      ctx.textAlign = "right";
      const serialNo = "No. " + String(Math.floor(Date.now() / 1000)).slice(-4);
      ctx.fillText(serialNo, 1000, 1620);

      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.translate(910, 1740);
      ctx.rotate(-0.08);
      ctx.drawImage(selectedBook.img, -75, -100, 150, 210);
      ctx.restore();

      ctx.fillStyle = CREAM;
      ctx.font = "italic 24px Georgia, serif";
      ctx.textAlign = "right";
      ctx.fillText(`"${selectedBook.title}"`, 810, 1860);

      ctx.fillStyle = MUTED;
      ctx.font = "500 14px Georgia, serif";
      ctx.fillText("BY VISHNU RAGHAV  →", 810, 1885);
    }
    ctx.textAlign = "center";

    // Footer
    const dateStr = new Date().toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillStyle = MUTED;
    ctx.font = "500 20px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText(dateStr, 90, 1890);

    ctx.fillStyle = GOLD;
    ctx.font = "bold 28px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("authorvishnuraghav.in", 540, 1890);

    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  };

  const shareToInstagram = async () => {
    const blob = await generateShareImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mind-health-report-${report.total}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast.success("Image downloaded! ✨ Ab isse Instagram Story par lagayein", { duration: 5000 });
  };
  
  const buyWorkbook = async () => {
    if (!user) { onOpenAuth("login"); return; }
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
            toast.success("Payment successful! Your workbook is ready ��");
          } catch (e) {
            toast.error("Payment verification failed. Please contact support.");
          } finally { setPaying(false); }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (e) {
      toast.error(formatApiError(e));
      setPaying(false);
    }
  };

  const shareText = async () => {
  const url = `${window.location.origin}/self-assessment`;
  const message = `Take the Mind Health Assessment by Vishnu Raghav — 5 min, free. Know your mind better.\n\n${url}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Mind Health Assessment", text: message });
    } else {
      await navigator.clipboard.writeText(message);
      toast.success("Link copied to clipboard!");
    }
  } catch {}
};
  
  // ═══════════════════════════════════════════════
  // ─── LANDING ────────────────────────────────
  // ═══════════════════════════════════════════════
  if (stage === "landing") return (
    <div className="min-h-screen bg-ink-950 text-foreground">
      <div className="max-w-3xl mx-auto px-5 lg:px-10 py-16 lg:py-24">
        <div className="inline-flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/20 rounded-full px-3 py-1 mb-6 text-xs font-bold text-brand-gold">
          <Sparkles className="w-3.5 h-3.5" /> By Vishnu Raghav
        </div>
        <h1 className="font-serif text-4xl md:text-6xl font-black leading-tight mb-4">Discover Your Mind</h1>
        <h2 className="font-serif text-2xl md:text-3xl text-brand-gold mb-6 italic">Mind Health Assessment</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
          Sirf 5 minute mein jaaniye ki aapka dimaag kis sthiti mein hai. Har insaan stress feel karta hai — lekin har stress normal nahi hota.
        </p>

        {/* SOCIAL PROOF */}
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-10 text-sm font-bold text-green-400">
          <Users className="w-4 h-4" /> �� {stats.total_completed.toLocaleString("en-IN")}+ log ye test le chuke hain
        </div>

        <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-8">
          <div className="text-sm font-bold text-brand-gold mb-3">Ye assessment aapko batayega —</div>
          <ul className="space-y-2.5 text-sm text-foreground">
            <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> Aap kitna emotional stress feel kar rahe hain</li>
            <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> Kya overthinking aapki life ko control kar rahi hai</li>
            <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> Kya anxiety ya depression ke warning signs dikh rahe hain</li>
            <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> Aapko ab kis direction mein kaam karna chahiye</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { icon: Clock, label: "5 Minutes" },
            { icon: FileText, label: "20 Questions" },
            { icon: Brain, label: "Personal Report" },
            { icon: ShieldCheck, label: "100% Private" },
          ].map(({icon:Ic, label}) => (
            <div key={label} className="bg-ink-900 border border-white/[0.07] rounded-xl p-3 text-center">
              <Ic className="w-4 h-4 text-brand-gold mx-auto mb-1.5" />
              <div className="text-xs font-bold">{label}</div>
            </div>
          ))}
        </div>

        {/* Resume banner */}
        {hasSavedProgress && (
          <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-xl p-4 mb-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-bold text-brand-gold">Aapne pichli baar {Object.keys(answers).length} questions bhare the</div>
              <div className="text-xs text-muted-foreground">Wahin se continue karein ya nayi shuruat karein</div>
            </div>
            <button onClick={() => startAssessment(true)} data-testid="resume-assessment"
              className="px-4 py-2 rounded-lg bg-gold-gradient text-ink-950 text-xs font-bold">
              Resume →
            </button>
          </div>
        )}

        <button onClick={() => startAssessment(false)} data-testid="start-assessment"
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gold-gradient text-ink-950 font-black text-base tracking-wide hover:opacity-90 transition-opacity inline-flex items-center gap-2">
          {hasSavedProgress ? "START FRESH" : "START ASSESSMENT"} <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-xs text-muted-foreground mt-4">Login required — your responses stay private on your account.</p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // ─── DISCLAIMER ────────────────────────────────
  // ═══════════════════════════════════════════════
  if (stage === "disclaimer") return (
    <div className="min-h-screen bg-ink-950 text-foreground flex items-center justify-center px-5">
      <div className="max-w-lg w-full bg-ink-900 border border-white/[0.07] rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h2 className="font-serif text-2xl font-black">Before You Begin</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Ye assessment kisi disease ka diagnosis nahi karta. Iska purpose sirf aapki current emotional aur mental well-being ko samajhna hai.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Agar result <strong className="text-yellow-400">High Distress</strong> dikhaye to kisi qualified mental health professional se consult karna faydemand ho sakta hai.
        </p>
        <label className="flex items-start gap-3 cursor-pointer mb-6 p-3 rounded-lg bg-ink-800 hover:bg-ink-800/80 transition-colors">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
            data-testid="agree-checkbox" className="mt-0.5 w-4 h-4 accent-brand-gold" />
          <span className="text-sm">I Understand — main isse ek self-reflection tool ke roop mein le raha hoon</span>
        </label>
        <div className="flex gap-3">
          <button onClick={() => setStage("landing")}
            className="px-5 py-3 rounded-xl border border-white/10 text-muted-foreground text-sm font-bold hover:bg-white/5">Back</button>
          <button onClick={() => setStage("questions")} disabled={!agree}
            data-testid="next-to-questions"
            className="flex-1 py-3 rounded-xl bg-gold-gradient text-ink-950 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
            NEXT <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // ─── QUESTIONS ────────────────────────────────
  // ═══════════════════════════════════════════════
  if (stage === "questions") {
    const q = questions[currentQ];
    if (!q) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
    const progress = ((currentQ + 1) / questions.length) * 100;
    return (
      <div className="min-h-screen bg-ink-950 text-foreground flex flex-col">
        <div className="sticky top-0 bg-ink-950 border-b border-white/[0.05] px-5 lg:px-10 py-4 z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-muted-foreground font-bold">Question {currentQ + 1} / {questions.length}</span>
              <span className="text-brand-gold font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
              <div className="h-full bg-gold-gradient transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-5 py-10">
          <div className="max-w-2xl w-full">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Pichhle 2 hafton mein…</span>
              <span className="inline-flex items-center gap-1 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {DOMAIN_LABELS[q.domain] || q.domain}
              </span>
            </div>
            <h2 className="font-serif text-xl md:text-2xl font-black leading-snug mb-8">"{q.text}"</h2>
            <div className="space-y-3">
              {options.map((opt) => {
                const selected = answers[q.id] === opt.value;
                return (
                  <button key={opt.value} onClick={() => selectAnswer(q.id, opt.value)}
                    data-testid={`answer-${q.id}-${opt.value}`}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-semibold text-sm ${selected ? "border-brand-gold bg-brand-gold/10" : "border-white/10 hover:border-white/25 bg-ink-900"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${selected ? "border-brand-gold bg-brand-gold" : "border-white/25"}`} />
                      <span>{opt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-between items-center">
              {currentQ > 0 ? (
                <button onClick={() => setCurrentQ(currentQ - 1)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
              ) : <span />}
              <span className="text-xs text-muted-foreground">✓ Progress auto-saved</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // ─── DISCOVERY SOURCE ─────────────────────────
  // ═══════════════════════════════════════════════
  if (stage === "source") return (
    <div className="min-h-screen bg-ink-950 text-foreground flex items-center justify-center px-5">
      <div className="max-w-lg w-full bg-ink-900 border border-white/[0.07] rounded-2xl p-8">
        <div className="text-center mb-2">
          <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-1">One last thing</div>
          <h2 className="font-serif text-2xl font-black">Aap yahan kaise pahunche?</h2>
          <p className="text-sm text-muted-foreground mt-2">Ye Vishnu ko batata hai kaunsa platform sabse zyada logon tak pahunch raha hai.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6 mb-6">
          {DISCOVERY_SOURCES.map((s) => (
            <button key={s.value} onClick={() => setDiscoverySource(s.value)}
              data-testid={`source-${s.value}`}
              className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${discoverySource === s.value ? "border-brand-gold bg-brand-gold/10 text-brand-gold" : "border-white/10 bg-ink-800 hover:border-white/25"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={submitAssessment}
          data-testid="submit-assessment"
          className="w-full py-3 rounded-xl bg-gold-gradient text-ink-950 font-bold text-sm inline-flex items-center justify-center gap-2">
          Generate My Report <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={submitAssessment}
          className="w-full mt-2 py-2 text-xs text-muted-foreground hover:text-foreground">
          Skip this question
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // ─── LOADING ────────────────────────────────
  // ═══════════════════════════════════════════════
  if (stage === "loading") return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center animate-pulse">
          <Brain className="w-10 h-10 text-brand-gold" />
        </div>
        <h2 className="font-serif text-2xl font-black mb-2">Assessment Complete</h2>
        <p className="text-sm text-muted-foreground mb-8">Generating Your Mind Report...</p>
        <div className="space-y-3 text-left">
          {[
            { label: "�� Analysing Thinking Pattern", delay: 0 },
            { label: "❤️ Checking Emotional Stability", delay: 600 },
            { label: "⚡ Measuring Stress Level", delay: 1200 },
            { label: "�� Preparing Personalized Report", delay: 1800 },
          ].map(({label, delay}, i) => (
            <div key={i} className="bg-ink-900 rounded-lg p-3 border border-white/[0.06]" style={{ animation: `fadeInUp 0.4s ease ${delay}ms both` }}>
              <div className="text-xs mb-1.5">{label}</div>
              <div className="h-1 bg-ink-800 rounded-full overflow-hidden">
                <div className="h-full bg-gold-gradient" style={{ width: "0%", animation: `fillBar 0.8s ease ${delay}ms forwards` }} />
              </div>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes fillBar { to { width: 100%; } }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // ─── RESULT ────────────────────────────────
  // ═══════════════════════════════════════════════
  if (stage === "result" && report) {
    const domainList = Object.entries(report.domain_pct).sort((a,b) => b[1] - a[1]);
    return (
      <div className="min-h-screen bg-ink-950 text-foreground">
        <div className="max-w-3xl mx-auto px-5 lg:px-10 py-12">

         {/* AUTHOR SIGNATURE BANNER */}
          <div className="relative overflow-hidden bg-gradient-to-r from-brand-gold/15 via-brand-gold/5 to-brand-gold/15 border border-brand-gold/30 rounded-2xl p-5 mb-6">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-brand-gold/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-brand-gold/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              {assets.author_photo && (
                <img src={assets.author_photo} alt="Vishnu Raghav"
                 className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover object-top border-2 border-brand-gold shadow-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-brand-gold font-bold mb-0.5">Personally Prepared By</div>
                <div className="font-serif text-lg md:text-xl font-black">Vishnu Raghav</div>
                <div className="text-[11px] text-muted-foreground italic">✍️ Author · Life Coach · Educator</div>
              </div>
              <div className="hidden sm:block">
                <svg width="80" height="30" viewBox="0 0 80 30" className="text-brand-gold opacity-80">
                  <path d="M5,20 Q15,5 25,15 T45,15 T65,15 L75,20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <circle cx="72" cy="22" r="1.5" fill="currentColor"/>
                  <circle cx="76" cy="24" r="1" fill="currentColor"/>
                </svg>
              </div>
            </div>
          </div>

          {/* HEADER with decorative book covers in background */}
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-gold/10 via-ink-900 to-transparent border border-brand-gold/20 rounded-3xl p-8 mb-6 text-center">
            {[
  { src: "/Dagmagate%20Pair.png", top: "10%", left: "-40px", right: "auto", rotate: -12 },
  { src: "/Jo%20Mai%20Kah%20Na%20Saka.png", top: "50%", left: "auto", right: "-30px", rotate: 8 },
].map((b, i) => (
  <img key={i} src={b.src} alt="" aria-hidden
    className="absolute w-32 h-44 object-contain opacity-[0.15] pointer-events-none"
    style={{
      top: b.top,
      left: b.left,
      right: b.right,
      transform: `rotate(${b.rotate}deg)`,
      filter: "blur(1px)",
    }} />
))}
            <div className="relative">
              <div className="text-xs uppercase tracking-widest text-brand-gold font-bold mb-2">Your Mind Health Report</div>
              <div className="text-6xl md:text-7xl font-black font-serif mb-2" style={{color: report.level.color}}>
                {report.total}<span className="text-2xl text-muted-foreground">/60</span>
              </div>
              <div className="text-lg font-bold mb-1">{report.level.emoji} {report.level.label}</div>
              <div className="text-xs text-muted-foreground">Assessment Date: {new Date().toLocaleDateString("en-IN")}</div>
              <div className="mt-4 inline-flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3 text-brand-gold" /> You're in the {report.percentile > 50 ? `top ${100 - report.percentile}%` : `bottom ${report.percentile}%`} of assessment takers
              </div>
            </div>
          </div>

          {/* SAFETY */}
          {report.safety_risk && (
            <div className="bg-red-500/10 border-2 border-red-500/40 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-2 text-red-400 font-bold">
                <AlertTriangle className="w-5 h-5" /> Important — Please Read
              </div>
              <p className="text-sm mb-3">Aapke jawab dikhate hain ki aap is samay kaafi emotional distress me ho sakte hain. Hum <strong>strongly recommend</strong> karte hain ki aap kisi qualified mental health professional se baat karein.</p>
              <p className="text-xs text-muted-foreground">Agar aapko lagta hai ki aap khud ko turant nuksan pahucha sakte hain, kripya abhi kisi bharosemand vyakti ko batayein aur emergency services se turant sampark karein.</p>
              <div className="mt-3 text-xs">
                <a href="tel:9152987821" className="text-red-400 font-bold underline">iCall: 9152987821</a>
                {" · "}<a href="tel:18005990019" className="text-red-400 font-bold underline">Kiran 24×7: 1800-599-0019</a>
              </div>
            </div>
          )}

          {/* DOMAIN GRAPH */}
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-sm mb-4 text-brand-gold uppercase tracking-widest">Your Mind — In Detail</h3>
            <div className="space-y-3">
              {domainList.map(([key, pct]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold">{report.domain_names[key]}</span>
                    <span className="text-brand-gold font-bold">{pct}%</span>
                  </div>
                  <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: pct >= 70 ? "#ef4444" : pct >= 50 ? "#f97316" : pct >= 30 ? "#eab308" : "#22c55e" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PATTERN */}
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-sm mb-2 text-brand-gold uppercase tracking-widest">Your Mind Pattern</h3>
            <h4 className="font-serif text-xl font-black mb-3">{report.analysis.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.analysis.body}</p>
          </div>

          {/* 3 ACTIONS - NEW */}
          {report.three_actions?.length > 0 && (
            <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/25 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-5 h-5 text-green-400" />
                <h3 className="font-bold text-sm text-green-400 uppercase tracking-widest">Your Next Steps (This Week)</h3>
              </div>
              <ul className="space-y-3">
                {report.three_actions.map((a, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{i + 1}</div>
                    <span className="text-sm">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* STRENGTHS */}
          {report.strengths?.length > 0 && (
            <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-sm mb-3 text-green-400 uppercase tracking-widest">Your Strengths</h3>
              <ul className="space-y-2">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-green-400" /> {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* RISKS */}
          {report.risks?.length > 0 && (
            <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-sm mb-3 text-orange-400 uppercase tracking-widest">If Ignored — Common Risks</h3>
              <ul className="space-y-2">
                {report.risks.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="w-4 h-4 text-orange-400" /> {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* SHARE - 2 BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <button onClick={shareToInstagram} data-testid="share-instagram"
              className="py-3 rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-300 font-bold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90">
              <Instagram className="w-4 h-4" /> Share to Instagram Story
            </button>
            <button onClick={shareText} data-testid="share-report"
              className="py-3 rounded-xl border border-brand-gold/30 bg-brand-gold/5 text-brand-gold font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-brand-gold/10">
              <Share2 className="w-4 h-4" /> Share Link
            </button>
          </div>

          {/* PDF WORKBOOK — Buy, Download, or Coming Soon */}
          <div className="bg-gradient-to-br from-brand-gold/10 to-brand-gold/[0.02] border border-brand-gold/25 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-brand-gold" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-1">Deeper Self-Work</div>
                <h3 className="font-serif text-xl font-black mb-2">
                  {product.is_active && product.has_pdf ? product.title : "Your Personal Self-Help Workbook"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {product.description || "Vishnu Raghav ne aapki situation ke liye ek detailed workbook banaya hai — practical exercises, daily reflections aur mind reset techniques."}
                </p>
                {access.has_access && access.pdf_url ? (
                   <a href={access.pdf_url.includes('/upload/') ? access.pdf_url.replace('/upload/', '/upload/fl_attachment:Mind-Health-Workbook.pdf/') : access.pdf_url}
                    download="Mind-Health-Workbook.pdf"
                    target="_blank" rel="noreferrer"
                    data-testid="download-workbook"
                    className="w-full py-3 rounded-xl bg-green-500 text-white font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-green-600 no-underline">
                    <Download className="w-4 h-4" /> Download Your Workbook (PDF)
                  </a>
                ) : product.is_active && product.has_pdf ? (
                  <button onClick={buyWorkbook} disabled={paying}
                    data-testid="buy-workbook"
                    className="w-full py-3 rounded-xl bg-gold-gradient text-ink-950 font-bold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
                    {paying ? "Processing..." : `📥 Buy Workbook — ₹${product.price}`}
                  </button>
                ) : (
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Coming soon — Workbook launching this week ✨</div>
                  </div>
                )}
                {access.has_access && (
                  <p className="text-[10px] text-green-400 text-center mt-2">✓ Purchased • Lifetime access</p>
                )}
              </div>
            </div>
          </div>

          
          {/* BOOK RECOMMENDATION - NEW */}
          {report.recommended_book && (
            <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Book Recommendation</div>
                  <h3 className="font-serif text-xl font-black mb-1">{report.recommended_book.title}</h3>
                  <div className="text-sm text-brand-gold italic mb-2">{report.recommended_book.hindi}</div>
                  <p className="text-sm text-muted-foreground mb-4">{report.recommended_book.why}</p>
                  <button onClick={() => nav(`/#books`)} className="text-sm text-brand-gold font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
                    Read this book <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

         
          {/* COURSE RECOMMENDATION */}
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-6">
            <div className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-2">Structured Course For You</div>
            <h3 className="font-serif text-xl font-black mb-2">Your Next Step — {DOMAIN_LABELS[report.top_domains[0]] || "Mind Reset"}</h3>
            <p className="text-sm text-muted-foreground mb-4">Sirf score dekhna kaafi nahi hota. Apne thinking patterns ko samajhna aur un par kaam karna hi long-term change laata hai.</p>
            <button onClick={() => nav(`/learn/${report.course_slug}`)}
              data-testid="go-to-course"
              className="w-full py-3 rounded-xl bg-gold-gradient text-ink-950 font-bold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90">
              Start Your Mind Reset Journey <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button onClick={() => nav("/dashboard", { state: { tab: "mindreports" } })}
              className="flex-1 py-3 rounded-xl border border-white/10 text-muted-foreground font-bold text-sm hover:bg-white/5">
              View in Dashboard
            </button>
            <button onClick={() => { setStage("landing"); setCurrentQ(0); setAnswers({}); setAgree(false); setReport(null); setDiscoverySource(""); clearSavedProgress(); }}
              className="flex-1 py-3 rounded-xl border border-white/10 text-muted-foreground font-bold text-sm hover:bg-white/5">
              Retake Assessment
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">This assessment is a self-reflection tool, not a medical diagnosis.</p>
        </div>
      </div>
    );
  }

  return null;
}
