import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* ✏️ EDIT THE TEXT BELOW TO CHANGE THE COURSE DETAILS.
   Each line inside ITEMS is:  ["Heading", "Description", "Worth badge (or leave empty "")"]  */
export const TITLE = "ULJHA JEEVAN MASTERY";
export const SUBTITLE = "21 Days to Understand Your Mind.";
export const ITEMS = [
  ["21 Days of Video Lessons", "Deep teachings to understand your mind, thoughts, emotions, and inner conflicts.", ""],
  ["5 Books by Vishnu Raghav (Hard Copy)", "Explore self-understanding, overthinking, life, and human psychology through reading. The 5 printed books are delivered to your home.", "Worth ₹1,500+"],
  ["Practical Workbook (eBook - Soft Copy)", "Reflection questions and journaling exercises to apply each lesson in your daily life. Download it as a PDF.", "Worth ₹649"],
  ["1-to-1 Personal Session", "An individual session to discuss your concerns and gain personal clarity.", "Worth ₹999"],
  ["Daily Action Plan", "Simple practices to help you turn understanding into action.", ""],
  ["Philosophical Teachings", "Insights inspired by Buddha, Shri Krishna, Osho, J. Krishnamurti, Ramana Maharshi, and Kabir.", ""],
  ["Practical Self-Understanding", "Learn to observe your thoughts, understand your fears, question old patterns, and respond more consciously.", ""],
   ];
export const CLOSING = "More than information. A journey towards understanding yourself.";

export default function CourseDetailsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="course-details-btn"
        className="w-full mb-3 py-2 rounded-lg text-xs font-bold border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 transition-colors">
        📖 View Full Course Details
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-ink-900 border border-brand-gold/30 rounded-2xl w-full max-w-xl max-h-[88vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-serif text-2xl font-black text-brand-gold leading-tight">{TITLE}</div>
                <div className="text-sm text-muted-foreground mt-1">{SUBTITLE}</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground ml-3"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {ITEMS.map(([h, d, worth]) => (
                <div key={h} className="bg-ink-800 border border-white/[0.06] rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold text-sm mb-0.5">✦ {h}</div>
                    {worth ? (
                      <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gold-gradient text-ink-950 whitespace-nowrap">{worth}</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{d}</div>
                </div>
              ))}
            </div>
            <p className="font-serif italic text-sm text-brand-gold mt-5 text-center">{CLOSING}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
