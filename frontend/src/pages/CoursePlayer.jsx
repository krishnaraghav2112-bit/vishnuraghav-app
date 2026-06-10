import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle2, Circle, Play } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function CoursePlayer({ onOpenAuth, onOpenPay }) {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [access, setAccess] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [course, setCourse] = useState(null);

  useEffect(() => {
    if (!loading && !user) { onOpenAuth("login"); nav("/"); return; }
    if (!user) return;
    api.get(`/enrollments/access/${slug}`).then((r) => {
      setAccess(r.data);
      if (r.data.course) {
        setCourse(r.data.course);
        const firstModule = r.data.course.modules_detail?.[0];
        if (firstModule) setActiveLesson({ moduleIdx: 0, lessonIdx: 0 });
      }
    }).catch(() => {});
  }, [slug, user, loading, nav, onOpenAuth]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!access) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading course...</div>;

  if (!access.access) {
    return (
      <div className="max-w-md mx-auto py-20 px-5 text-center" data-testid="locked-screen">
        <Lock className="w-12 h-12 text-brand-gold mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-extrabold mb-2">Course Locked</h2>
        <p className="text-sm text-muted-foreground mb-6">You haven't purchased this course yet. Enroll to start watching.</p>
        <button
          onClick={async () => {
            const { data } = await api.get(`/courses/${slug}`).catch(() => ({ data: null }));
            if (data) onOpenPay(data);
          }}
          data-testid="locked-buy"
          className="bg-gold-gradient text-ink-950 px-6 py-3 rounded-xl font-extrabold text-sm"
        >
          Enroll Now →
        </button>
        <button onClick={() => nav("/")} className="block mx-auto mt-4 text-sm text-muted-foreground">← Back to home</button>
      </div>
    );
  }

  const c = course;
  const lessonId = activeLesson ? `m${activeLesson.moduleIdx}-l${activeLesson.lessonIdx}` : null;
  const completedSet = new Set(access.completed_lessons || []);

  const markComplete = async () => {
    if (!lessonId) return;
    completedSet.add(lessonId);
    const totalLessons = c.modules_detail.reduce((s, m) => s + m.lessons, 0);
    const completedCount = completedSet.size;
    const pct = Math.round((completedCount / totalLessons) * 100);
    try {
      await api.post("/enrollments/progress", {
        enrollment_id: access.enrollment_id,
        lesson_id: lessonId,
        progress_pct: pct,
      });
      setAccess({ ...access, completed_lessons: Array.from(completedSet), progress_pct: pct });
      toast.success("Lesson marked complete ✓");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-10 py-8" data-testid="course-player">
      <button onClick={() => nav("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        <div>
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl overflow-hidden mb-4">
            <div className="aspect-video bg-ink-950 relative">
              <iframe
                data-testid="course-video"
                src={c.youtube_playlist}
                title={c.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-5">
              <h1 className="font-serif text-2xl font-black mb-1">{c.title}</h1>
              <p className="text-sm text-muted-foreground mb-4">{c.tagline}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={markComplete} data-testid="mark-complete"
                  className="bg-gold-gradient text-ink-950 px-4 py-2 rounded-lg text-sm font-extrabold">
                  Mark Lesson Complete
                </button>
                <div className="text-xs text-muted-foreground">Progress: <strong className="text-brand-gold">{access.progress_pct}%</strong></div>
                <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden max-w-xs">
                  <div className="h-full bg-gradient-to-r from-brand-gold to-brand-purple rounded-full" style={{ width: `${access.progress_pct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-5">
            <h3 className="font-serif font-bold mb-2">About this Course</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div><div className="text-xl font-black text-brand-gold">{c.modules}</div><div className="text-[10px] text-muted-foreground uppercase">Modules</div></div>
              <div><div className="text-xl font-black text-brand-gold">{c.lessons}</div><div className="text-[10px] text-muted-foreground uppercase">Lessons</div></div>
              <div><div className="text-xl font-black text-brand-gold">{c.duration}</div><div className="text-[10px] text-muted-foreground uppercase">Duration</div></div>
              <div><div className="text-xl font-black text-brand-gold">{c.level}</div><div className="text-[10px] text-muted-foreground uppercase">Level</div></div>
            </div>
          </div>
        </div>

        <aside className="bg-ink-900 border border-white/[0.07] rounded-2xl p-4 h-fit lg:sticky lg:top-20">
          <h3 className="font-serif font-bold mb-3 text-sm">Course Content</h3>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {c.modules_detail.map((m, mi) => (
              <div key={mi}>
                <div className="text-xs font-bold text-brand-gold mb-1.5">Module {mi + 1}: {m.title}</div>
                {Array.from({ length: m.lessons }).map((_, li) => {
                  const lid = `m${mi}-l${li}`;
                  const isActive = activeLesson?.moduleIdx === mi && activeLesson?.lessonIdx === li;
                  const isDone = completedSet.has(lid);
                  return (
                    <button
                      key={li}
                      onClick={() => setActiveLesson({ moduleIdx: mi, lessonIdx: li })}
                      data-testid={`lesson-${lid}`}
                      className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-md text-xs mb-0.5 transition-colors ${
                        isActive ? "bg-brand-goldSoft text-brand-gold" : "text-muted-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> :
                        isActive ? <Play className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" /> :
                        <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span className="truncate">Lesson {li + 1}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
