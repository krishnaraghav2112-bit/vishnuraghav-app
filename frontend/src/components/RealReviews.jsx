import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import api from "../lib/api";

export default function RealReviews({ courseSlug = "overcoming-overthinking" }) {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    api.get("/reviews", { params: { course_slug: courseSlug } }).then(({ data }) => setReviews(data || [])).catch(() => {});
  }, [courseSlug]);
  if (reviews.length === 0) return null;
  return (
    <div data-testid="real-reviews">
      <div className="text-[11px] uppercase tracking-[0.2em] text-brand-gold font-bold mb-2">Student Reviews</div>
      <h2 className="font-serif text-[clamp(1.8rem,4vw,2.7rem)] font-black tracking-tight mb-10">What Students Say</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {reviews.slice(0, 6).map((r) => (
          <div key={r.id} data-testid={`real-review-${r.id}`} className="glass border border-white/[0.07] rounded-2xl p-5">
            <div className="flex gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-brand-gold text-brand-gold" : "text-white/20"}`} />)}
            </div>
            <p className="text-sm italic text-muted-foreground mb-4 leading-relaxed">"{r.text}"</p>
            <div className="text-xs font-bold">{r.name}</div>
            <div className="text-[10px] text-green-400 mt-0.5">✓ Verified student{r.city ? ` · ${r.city}` : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
