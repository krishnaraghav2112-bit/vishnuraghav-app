import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, ShieldCheck, Clock, FileText, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle, Share2, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SelfAssessment({ onOpenAuth }) {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();

  const [stage, setStage] = useState("landing"); // landing | disclaimer | questions | loading | result
  const [questions, setQuestions] = useState([]);
  const [options, setOptions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [agree, setAgree] = useState(false);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/assessment/questions").then(({ data }) => {
      setQuestions(data.questions || []);
      setOptions(data.options || []);
    }).catch(() => toast.error("Could not load assessment. Try again."));
  }, []);

  const startAssessment = () => {
    if (authLoading) return;
    if (!user) { onOpenAuth("login"); toast.info("Please login to take the assessment"); return; }
    setStage("disclaimer");
  };

  const selectAnswer = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
    setTimeout(() => {
      if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
      else submitAssessment({ ...answers, [qId]: value });
    }, 250);
  };

  const submitAssessment = async (finalAnswers) => {
    setBusy(true);
    setStage("loading");
    try {
      const payload = { answers: questions.map(q => ({ q_id: q.id, value: finalAnswers[q.id] ?? 0 })) };
      const { data } = await api.post("/assessment/submit", payload);
      await new Promise(r => setTimeout(r, 2400)); // let loading animation finish
      setReport(data);
      setStage("result");
    } catch (e) {
      toast.error(formatApiError(e));
      setStage("questions");
    } finally { setBusy(false); }
  };

  const shareReport = async () => {
    if (!report) return;
    const text = `I just took the Mind Health Assessment™ by Vishnu Raghav.\n\nMy score: ${report.total}/60\nLevel: ${report.level.label}\n\nTake yours (5 min): ${window.location.origin}/self-assessment`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Mind Health Report", text, url: `${window.location.origin}/self-assessment` });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Report link copied to clipboard!");
      }
    } catch {}
  };

  // ─────────── LANDING ───────────
  if (stage === "landing") return (
    <div className="min-h-screen bg-ink-950 text-foreground">
      <div className="max-w-3xl mx-auto px-5 lg:px-10 py-16 lg:py-24">
        <div className="inline-flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/20 rounded-full px-3 py-1 mb-6 text-xs font-bold text-brand-gold">
          <Sparkles className="w-3.5 h-3.5" /> By Vishnu Raghav
        </div>
        <h1 className="font-serif text-4xl md:text-6xl font-black leading-tight mb-4">
          Discover Your Mind
        </h1>
        <h2 className="font-serif text-2xl md:text-3xl text-brand-gold mb-6 italic">
          Mind Health Assessment™
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
          Sirf 5 minute mein jaaniye ki aapka dimaag kis sthiti mein hai. Har insaan stress feel karta hai — lekin har stress normal nahi hota.
        </p>

        <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-8">
          <div className="text-sm font-bold text-brand-gold mb-3">Ye assessment aapko batayega —</div>
          <ul className="space-y-2.5 text-sm text-foreground">
            <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> Aap kitna emotional stress feel kar rahe hain</li>
            <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> Kya overthinking aapki life ko control kar rahi hai</li>
            <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> Kya anxiety ya depression ke warning signs dikh rahe hain</li>
            <li className="flex gap-3"><CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> Aur sabse zaruri — aapko ab kis direction mein kaam karna chahiye</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { icon: Clock, label: "5 Minutes" },
            { icon: FileText, label: "20 Questions" },
            { icon: Brain, label: "Personalized Report" },
            { icon: ShieldCheck, label: "100% Private" },
          ].map(({icon:Ic, label}) => (
            <div key={label} className="bg-ink-900 border border-white/[0.07] rounded-xl p-3 text-center">
              <Ic className="w-4 h-4 text-brand-gold mx-auto mb-1.5" />
              <div className="text-xs font-bold">{label}</div>
            </div>
          ))}
        </div>

        <button onClick={startAssessment} data-testid="start-assessment"
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gold-gradient text-ink-950 font-black text-base tracking-wide hover:opacity-90 transition-opacity inline-flex items-center gap-2">
          START ASSESSMENT <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-xs text-muted-foreground mt-4">Login required — your responses stay private on your account.</p>
      </div>
    </div>
  );

  // ─────────── DISCLAIMER ───────────
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
            data-testid="agree-checkbox"
            className="mt-0.5 w-4 h-4 accent-brand-gold" />
          <span className="text-sm">I Understand — main isse ek self-reflection tool ke roop mein le raha hoon</span>
        </label>
        <div className="flex gap-3">
          <button onClick={() => setStage("landing")}
            className="px-5 py-3 rounded-xl border border-white/10 text-muted-foreground text-sm font-bold hover:bg-white/5">
            Back
          </button>
          <button onClick={() => setStage("questions")} disabled={!agree}
            data-testid="next-to-questions"
            className="flex-1 py-3 rounded-xl bg-gold-gradient text-ink-950 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
            NEXT <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─────────── QUESTIONS ───────────
  if (stage === "questions") {
    const q = questions[currentQ];
    if (!q) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading questions...</div>;
    const progress = ((currentQ + 1) / questions.length) * 100;
    return (
      <div className="min-h-screen bg-ink-950 text-foreground flex flex-col">
        <div className="sticky top-0 bg-ink-950 border-b border-white/[0.05] px-5 lg:px-10 py-4">
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
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Pichhle 2 hafton mein…</div>
            <h2 className="font-serif text-xl md:text-2xl font-black leading-snug mb-8">
              "{q.text}"
            </h2>
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
            {currentQ > 0 && (
              <button onClick={() => setCurrentQ(currentQ - 1)}
                className="mt-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Previous question
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────── LOADING ───────────
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
            { label: "🧠 Analysing Thinking Pattern", delay: 0 },
            { label: "❤️ Checking Emotional Stability", delay: 600 },
            { label: "⚡ Measuring Stress Level", delay: 1200 },
            { label: "📝 Preparing Personalized Report", delay: 1800 },
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

  // ─────────── RESULT ───────────
  if (stage === "result" && report) {
    const domainList = Object.entries(report.domain_pct).sort((a,b) => b[1] - a[1]);
    return (
      <div className="min-h-screen bg-ink-950 text-foreground">
        <div className="max-w-3xl mx-auto px-5 lg:px-10 py-12">

          {/* HEADER */}
          <div className="bg-gradient-to-br from-brand-gold/10 to-transparent border border-brand-gold/20 rounded-3xl p-8 mb-6 text-center">
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

          {/* SAFETY ALERT */}
          {report.safety_risk && (
            <div className="bg-red-500/10 border-2 border-red-500/40 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-2 text-red-400 font-bold">
                <AlertTriangle className="w-5 h-5" /> Important — Please Read
              </div>
              <p className="text-sm text-foreground mb-3">
                Aapke jawab dikhate hain ki aap is samay kaafi emotional distress me ho sakte hain. Hum <strong>strongly recommend</strong> karte hain ki aap kisi qualified mental health professional se baat karein.
              </p>
              <p className="text-xs text-muted-foreground">
                Agar aapko lagta hai ki aap khud ko turant nuksan pahucha sakte hain, kripya abhi kisi bharosemand vyakti ko batayein aur apne area ki emergency medical service ya crisis support se turant sampark karein. Aap akele nahi hain.
              </p>
              <div className="mt-3 text-xs">
                <a href="tel:9152987821" className="text-red-400 font-bold underline">iCall Helpline: 9152987821</a>
                {" · "}
                <a href="tel:18005990019" className="text-red-400 font-bold underline">Kiran (24×7): 1800-599-0019</a>
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

          {/* PERSONALITY ANALYSIS */}
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-sm mb-2 text-brand-gold uppercase tracking-widest">Your Mind Pattern</h3>
            <h4 className="font-serif text-xl font-black mb-3">{report.analysis.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{report.analysis.body}</p>
          </div>

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
              <p className="text-xs text-muted-foreground mt-3 italic">Ye prediction nahi hai — balki aam taur par dekhe jaane wale patterns ka sanket hai.</p>
            </div>
          )}

          {/* SHARE */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button onClick={shareReport} data-testid="share-report"
              className="flex-1 py-3 rounded-xl border border-brand-gold/30 bg-brand-gold/5 text-brand-gold font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-brand-gold/10">
              <Share2 className="w-4 h-4" /> Share Your Report
            </button>
            <button onClick={() => { setStage("landing"); setCurrentQ(0); setAnswers({}); setAgree(false); setReport(null); }}
              className="flex-1 py-3 rounded-xl border border-white/10 text-muted-foreground font-bold text-sm hover:bg-white/5">
              Retake Assessment
            </button>
          </div>

          {/* PDF WORKBOOK (Phase 2 — placeholder for now) */}
          <div className="bg-gradient-to-br from-brand-gold/10 to-brand-gold/[0.02] border border-brand-gold/25 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-brand-gold" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-1">Deeper Self-Work</div>
                <h3 className="font-serif text-xl font-black mb-2">Your Personal Self-Help Workbook</h3>
                <p className="text-sm text-muted-foreground mb-4">Vishnu Raghav ne aapki situation ke liye ek detailed workbook banaya hai — practical exercises, daily reflections aur mind reset techniques.</p>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Coming soon — Workbook launching this week ✨</div>
                </div>
              </div>
            </div>
          </div>

          {/* COURSE RECOMMENDATION */}
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 mb-8">
            <div className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-2">Your Next Step</div>
            <h3 className="font-serif text-xl font-black mb-2">Structured course made for your pattern</h3>
            <p className="text-sm text-muted-foreground mb-4">Sirf score dekhna kaafi nahi hota. Apne thinking patterns ko samajhna aur un par kaam karna hi long-term change laata hai.</p>
            <button onClick={() => nav(`/learn/${report.course_slug}`)}
              data-testid="go-to-course"
              className="w-full py-3 rounded-xl bg-gold-gradient text-ink-950 font-bold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90">
              Start Your Mind Reset Journey <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            This assessment is a self-reflection tool, not a medical diagnosis.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
