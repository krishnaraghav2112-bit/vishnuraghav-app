import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Save, Loader2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";

// Admin: write a title + description for every day (lesson) of a course.
const inputCls = "w-full bg-ink-900 border border-white/[0.07] rounded-lg px-3 py-2 text-xs focus:border-brand-gold outline-none";

export default function LessonEditor({ course, onClose }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/courses/${encodeURIComponent(course.slug)}/lessons`)
      .then((r) => setLessons(r.data.lessons || []))
      .catch((e) => toast.error(formatApiError(e)))
      .finally(() => setLoading(false));
  }, [course.slug]);

  const update = (i, field, value) => {
    setLessons((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/courses/${encodeURIComponent(course.slug)}/lessons`, { lessons });
      toast.success("Lesson details saved");
      onClose();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-ink-800 border border-brand-gold/30 rounded-xl p-4 space-y-3 mt-4" data-testid="admin-lesson-editor">
      <div className="flex justify-between items-center">
        <h3 className="font-serif font-bold text-sm">Lessons: {course.title}</h3>
        <button onClick={onClose} data-testid="lesson-editor-close" className="text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Write a title and description for each day. Empty fields show the course title / tagline instead.
      </p>

      {loading ? (
        <div className="text-xs text-muted-foreground py-6 text-center">Loading lessons…</div>
      ) : lessons.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">This course has no lessons yet.</div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {lessons.map((l, i) => (
            <div key={i} className="bg-ink-900/60 border border-white/[0.05] rounded-lg p-3 space-y-2">
              <div className="text-xs font-bold text-brand-gold">Day {i + 1}</div>
              <input
                data-testid={`lesson-title-${i + 1}`}
                value={l.title}
                onChange={(e) => update(i, "title", e.target.value)}
                placeholder={`Title for Day ${i + 1}`}
                className={inputCls}
              />
              <textarea
                data-testid={`lesson-desc-${i + 1}`}
                value={l.description}
                onChange={(e) => update(i, "description", e.target.value)}
                placeholder={`What will students learn on Day ${i + 1}?`}
                rows={3}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-white/[0.04]">Cancel</button>
        <button
          onClick={save}
          disabled={saving || loading}
          data-testid="lesson-editor-save"
          className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-4 py-1.5 rounded-lg text-xs font-extrabold disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Lessons
        </button>
      </div>
    </div>
  );
}
