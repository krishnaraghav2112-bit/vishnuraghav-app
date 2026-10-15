import React, { useEffect, useState } from "react";
import { Star, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" data-testid={`review-star-${n}`} onClick={() => onChange(n)} aria-label={`${n} star`}
          className="p-0.5 hover:scale-110 transition-transform">
          <Star className={`w-6 h-6 ${n <= value ? "fill-brand-gold text-brand-gold" : "text-white/20"}`} />
        </button>
      ))}
    </div>
  );
}

// Lets a paid student leave one review (after week one). Admin approves before it goes public.
export default function CourseReviewCard({ slug, autoFocus }) {
  const [state, setState] = useState(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [city, setCity] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/reviews/me", { params: { course_slug: slug } }).then(({ data }) => {
      setState(data);
      if (data.review) { setRating(data.review.rating); setText(data.review.text); setCity(data.review.city || ""); }
    }).catch(() => setState({ eligible: false, review: null }));
  }, [slug]);

  useEffect(() => {
    if (autoFocus && state) document.getElementById("course-review-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [autoFocus, state]);

  if (!state) return null;

  const submit = async () => {
    if (text.trim().length < 10) { toast.error("Please write at least a sentence or two."); return; }
    setBusy(true);
    try {
      await api.post("/reviews", { course_slug: slug, rating, text: text.trim(), city: city.trim() });
      setState({ ...state, review: { rating, text, city, status: "pending" } });
      setEditing(false);
      toast.success("Thank you! Your review will appear after a quick check.");
    } catch (e) { toast.error(formatApiError(e)); }
    setBusy(false);
  };

  const box = "bg-ink-900 border border-white/[0.07] rounded-2xl p-5 mt-4";

  if (!state.eligible) {
    return (
      <div id="course-review-card" data-testid="review-locked" className={`${box} flex items-start gap-3 text-sm text-muted-foreground`}>
        <Lock className="w-4 h-4 mt-0.5 text-brand-gold flex-shrink-0" />
        Reviews open after your first week. Complete 7 lessons to share your experience.
      </div>
    );
  }

  if (state.review && !editing) {
    return (
      <div id="course-review-card" data-testid="review-submitted" className={box}>
        <div className="flex items-center gap-2 text-sm font-bold mb-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Your review</div>
        <div className="flex gap-0.5 mb-2">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-4 h-4 ${n <= state.review.rating ? "fill-brand-gold text-brand-gold" : "text-white/20"}`} />)}</div>
        <p className="text-sm text-muted-foreground italic mb-3">"{state.review.text}"</p>
        <div className="flex items-center justify-between text-xs">
          <span data-testid="review-status" className="text-muted-foreground">
            Status: <strong className="text-foreground">{state.review.status === "approved" ? "Published" : state.review.status === "hidden" ? "Not published" : "Waiting for approval"}</strong>
          </span>
          <button data-testid="review-edit" onClick={() => setEditing(true)} className="text-brand-gold underline">Edit</button>
        </div>
      </div>
    );
  }

  return (
    <div id="course-review-card" data-testid="review-form" className={box}>
      <h3 className="font-serif font-bold mb-1">How is the course going?</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Your honest review helps others decide. Only your first name and last initial are shown.
        {state.review?.status === "approved" && " Edited reviews are checked again before they're republished."}
      </p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea data-testid="review-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={4}
        placeholder="What changed for you after the first week?"
        className="w-full mt-3 bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm focus:border-brand-gold outline-none" />
      <input data-testid="review-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder="City (optional)"
        className="w-full mt-2 bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm focus:border-brand-gold outline-none" />
      <button data-testid="review-submit" onClick={submit} disabled={busy}
        className="mt-3 bg-gold-gradient text-ink-950 px-5 py-2.5 rounded-lg text-sm font-extrabold disabled:opacity-50">
        {busy ? "Sending..." : "Submit review"}
      </button>
    </div>
  );
}
