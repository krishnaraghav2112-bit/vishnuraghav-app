import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Lock, CheckCircle2, Circle, Play, Pause,
  Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

/* ───────────────────────── SECURE VIDEO PLAYER ─────────────────────────
   - YouTube's own buttons are switched OFF (controls=0): no settings menu,
     no "copy link", no title, no YouTube logo.
   - The YouTube frame is cropped at top & bottom and fully covered,
     so nothing inside it can be clicked or right-clicked.
   - Our own buttons: play/pause, ±10s, seek bar, volume, speed, CC, fullscreen.
   - Student's email watermark moves around (also visible in fullscreen).
──────────────────────────────────────────────────────────────────────── */

let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previous) previous();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return ytApiPromise;
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

const SPEEDS = [1, 1.25, 1.5, 2, 0.75];
const CROP = 70; // px of YouTube frame hidden at top and bottom

const WATERMARK_SPOTS = [
  { top: "18%", left: "8%" },
  { top: "62%", left: "58%" },
  { top: "40%", left: "35%" },
  { top: "68%", left: "10%" },
  { top: "22%", left: "60%" },
];

function SecurePlayer({ videoId, watermark }) {
  const wrapRef = useRef(null);
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const hideTimer = useRef(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(100);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [realFull, setRealFull] = useState(false);
  const [fakeFull, setFakeFull] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [spot, setSpot] = useState(0);

  // Create the YouTube player (without YouTube's controls)
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      const el = document.createElement("div");
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(el);
      playerRef.current = new YT.Player(el, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0, rel: 0, modestbranding: 1, playsinline: 1,
          iv_load_policy: 3, disablekb: 1, fs: 0, cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            setReady(true);
            setDuration(e.target.getDuration() || 0);
          },
          onStateChange: (e) => {
            if (cancelled) return;
            const S = YT.PlayerState;
            if (e.data === S.PLAYING) {
              setPlaying(true);
              setStarted(true);
              setEnded(false);
              setDuration(e.target.getDuration() || 0);
            } else if (e.data === S.PAUSED) {
              setPlaying(false);
            } else if (e.data === S.ENDED) {
              setPlaying(false);
              setEnded(true);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try { if (playerRef.current) playerRef.current.destroy(); } catch (e) { /* ignore */ }
      playerRef.current = null;
    };
  }, [videoId]);

  // Update the time / seek bar while playing
  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => {
      const p = playerRef.current;
      if (p && p.getCurrentTime) setTime(p.getCurrentTime() || 0);
    }, 500);
    return () => clearInterval(t);
  }, [playing]);

  // Move the watermark every 8 seconds
  useEffect(() => {
    const t = setInterval(() => setSpot((s) => (s + 1) % WATERMARK_SPOTS.length), 8000);
    return () => clearInterval(t);
  }, []);

  // Track real fullscreen on/off
  useEffect(() => {
    const onChange = () => setRealFull(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const wakeUi = () => {
    setShowUi(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUi(false), 3000);
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p || !ready) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
    wakeUi();
  };

  const seekTo = (sec) => {
    const p = playerRef.current;
    if (!p || !ready) return;
    const v = Math.max(0, Math.min(duration || 0, sec));
    p.seekTo(v, true);
    setTime(v);
    wakeUi();
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p || !ready) return;
    if (muted) p.unMute();
    else p.mute();
    setMuted(!muted);
  };

  const changeSpeed = () => {
    const p = playerRef.current;
    if (!p || !ready) return;
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    p.setPlaybackRate(next);
    setSpeed(next);
  };

  const toggleCc = () => {
    const p = playerRef.current;
    if (!p || !ready) return;
    try {
      if (cc) p.unloadModule("captions");
      else p.loadModule("captions");
    } catch (e) { /* ignore */ }
    setCc(!cc);
  };

  const toggleFull = () => {
    const el = wrapRef.current;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
      return;
    }
    if (fakeFull) { setFakeFull(false); return; }
    const req = el && (el.requestFullscreen || el.webkitRequestFullscreen);
    if (req) {
      const r = req.call(el);
      if (r && r.catch) r.catch(() => setFakeFull(true));
    } else {
      setFakeFull(true); // iPhone: full-window mode
    }
  };

  const isFull = realFull || fakeFull;
  const uiVisible = showUi || !playing;
  const pct = duration ? (time / duration) * 100 : 0;
  const block = (e) => e.preventDefault();

  return (
    <div
      ref={wrapRef}
      data-testid="secure-player"
      onContextMenu={block}
      onMouseMove={wakeUi}
      onTouchStart={wakeUi}
      className={`${fakeFull ? "fixed inset-0 z-[100]" : "aspect-video relative"} bg-black overflow-hidden select-none`}
      style={{ cursor: uiVisible ? "default" : "none" }}
    >
      {/* YouTube frame: cropped top & bottom, cannot be clicked at all */}
      <div
        ref={hostRef}
        className="absolute left-0 w-full"
        style={{ top: `-${CROP}px`, height: `calc(100% + ${CROP * 2}px)`, pointerEvents: "none" }}
      />

      {/* Cover image before start / after end, dark layer when paused */}
      {(!started || ended) && (
        <div
          className="absolute inset-0 bg-black bg-cover bg-center"
          style={{ backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }}
        />
      )}
      {started && !ended && !playing && <div className="absolute inset-0 bg-black/60" />}

      {/* Full cover: click = play/pause, double-click = fullscreen */}
      <div
        data-testid="player-click-layer"
        className="absolute inset-0 z-10"
        onClick={togglePlay}
        onDoubleClick={toggleFull}
        onContextMenu={block}
      />

      {/* Big centre play button */}
      {!playing && (
        <button
          type="button"
          data-testid="player-big-play"
          onClick={togglePlay}
          className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold-gradient text-ink-950 flex items-center justify-center shadow-xl"
        >
          {ready ? <Play className="w-8 h-8 ml-1" fill="currentColor" /> : <span className="text-[10px] font-bold">Loading…</span>}
        </button>
      )}

      {/* Moving email watermark */}
      {watermark && (
        <div
          data-testid="video-watermark"
          className="absolute z-20 pointer-events-none text-white text-xs sm:text-sm font-semibold"
          style={{
            ...WATERMARK_SPOTS[spot],
            opacity: 0.22,
            transition: "top 1.5s ease, left 1.5s ease",
            textShadow: "0 0 4px rgba(0,0,0,0.8)",
          }}
        >
          {watermark}
        </div>
      )}

      {/* Our own control bar */}
      <div
        className={`absolute z-30 bottom-0 left-0 right-0 px-3 sm:px-4 pb-2 pt-8 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <input
          type="range"
          data-testid="player-seek"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="w-full h-1.5 cursor-pointer"
          style={{ accentColor: "#C9A84C", background: `linear-gradient(to right, #C9A84C ${pct}%, rgba(255,255,255,0.25) ${pct}%)` }}
        />
        <div className="flex items-center gap-1 sm:gap-2 text-white mt-1">
          <button type="button" data-testid="player-play" onClick={togglePlay} className="p-2 rounded hover:bg-white/10">
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button type="button" data-testid="player-back10" onClick={() => seekTo(time - 10)} className="p-2 rounded hover:bg-white/10">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button type="button" data-testid="player-fwd10" onClick={() => seekTo(time + 10)} className="p-2 rounded hover:bg-white/10">
            <RotateCw className="w-4 h-4" />
          </button>
          <button type="button" data-testid="player-mute" onClick={toggleMute} className="p-2 rounded hover:bg-white/10">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <span className="text-[11px] sm:text-xs tabular-nums ml-1" data-testid="player-time">
            {formatTime(time)} / {formatTime(duration)}
          </span>
          <div className="flex-1" />
          <button type="button" data-testid="player-speed" onClick={changeSpeed} className="px-2 py-1 rounded hover:bg-white/10 text-xs font-bold">
            {speed}x
          </button>
          <button type="button" data-testid="player-cc" onClick={toggleCc} className={`p-2 rounded hover:bg-white/10 ${cc ? "text-brand-gold" : ""}`}>
            <Captions className="w-5 h-5" />
          </button>
          <button type="button" data-testid="player-fullscreen" onClick={toggleFull} className="p-2 rounded hover:bg-white/10">
            {isFull ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── COURSE PAGE ───────────────────────── */

export default function CoursePlayer({ onOpenAuth, onOpenPay }) {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [access, setAccess] = useState(null);
  const [activeLesson, setActiveLesson] = useState({ moduleIdx: 0, lessonIdx: 0 });
  const [course, setCourse] = useState(null);

  useEffect(() => {
    if (!loading && !user) { onOpenAuth("login"); nav("/"); return; }
    if (!user) return;
    api.get(`/enrollments/access/${slug}`).then((r) => {
      setAccess(r.data);
      if (r.data.course) {
        setCourse(r.data.course);
        setActiveLesson({ moduleIdx: 0, lessonIdx: 0 });
      }
    }).catch(() => setAccess({ access: false }));
  }, [slug, user, loading, nav, onOpenAuth]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!access) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading course...</div>;

  if (!access.access || !course) {
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
  const modules = c.modules_detail || [];
  const videos = c.videos || [];

  // Day number (1, 2, 3 ... 21) for a given week + lesson
  const dayNumber = (mi, li) => modules.slice(0, mi).reduce((s, m) => s + m.lessons, 0) + li + 1;

  const allLessonIds = [];
  modules.forEach((m, mi) => {
    for (let li = 0; li < m.lessons; li++) allLessonIds.push(`m${mi}-l${li}`);
  });
  const totalLessons = allLessonIds.length || 1;

  const lessonId = `m${activeLesson.moduleIdx}-l${activeLesson.lessonIdx}`;
  const currentDay = dayNumber(activeLesson.moduleIdx, activeLesson.lessonIdx);
  const currentVideoId = videos[currentDay - 1];

  const completedSet = new Set((access.completed_lessons || []).filter((id) => allLessonIds.includes(id)));
  const progressPct = Math.round((completedSet.size / totalLessons) * 100);

  const markComplete = async () => {
    const next = new Set(completedSet);
    next.add(lessonId);
    const pct = Math.round((next.size / totalLessons) * 100);
    try {
      await api.post("/enrollments/progress", {
        enrollment_id: access.enrollment_id,
        lesson_id: lessonId,
        progress_pct: pct,
      });
      setAccess({ ...access, completed_lessons: Array.from(next), progress_pct: pct });
      toast.success(`Day ${currentDay} marked complete ✓`);
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
            {currentVideoId ? (
              <SecurePlayer key={currentVideoId} videoId={currentVideoId} watermark={user?.email} />
            ) : (
              <div className="aspect-video bg-ink-950 flex items-center justify-center text-sm text-muted-foreground">
                Video coming soon
              </div>
            )}
            <div className="p-5">
              <div className="text-xs font-bold text-brand-gold mb-1" data-testid="current-day-label">Day {currentDay}</div>
              <h1 className="font-serif text-2xl font-black mb-1">{c.title}</h1>
              <p className="text-sm text-muted-foreground mb-4">{c.tagline}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={markComplete} data-testid="mark-complete"
                  className="bg-gold-gradient text-ink-950 px-4 py-2 rounded-lg text-sm font-extrabold">
                  Mark Lesson Complete
                </button>
                <div className="text-xs text-muted-foreground">
                  Progress: <strong className="text-brand-gold">{completedSet.size}/{totalLessons} ({progressPct}%)</strong>
                </div>
                <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden max-w-xs">
                  <div className="h-full bg-gradient-to-r from-brand-gold to-brand-purple rounded-full" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-5">
            <h3 className="font-serif font-bold mb-2">About this Course</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div><div className="text-xl font-black text-brand-gold">{modules.length}</div><div className="text-[10px] text-muted-foreground uppercase">Weeks</div></div>
              <div><div className="text-xl font-black text-brand-gold">{totalLessons}</div><div className="text-[10px] text-muted-foreground uppercase">Lessons</div></div>
              <div><div className="text-xl font-black text-brand-gold">{c.duration}</div><div className="text-[10px] text-muted-foreground uppercase">Duration</div></div>
              <div><div className="text-xl font-black text-brand-gold">{c.level}</div><div className="text-[10px] text-muted-foreground uppercase">Level</div></div>
            </div>
          </div>
        </div>

        <aside className="bg-ink-900 border border-white/[0.07] rounded-2xl p-4 h-fit lg:sticky lg:top-20">
          <h3 className="font-serif font-bold mb-3 text-sm">Course Content</h3>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {modules.map((m, mi) => (
              <div key={mi}>
                <div className="text-xs font-bold text-brand-gold mb-1.5">{m.title}</div>
                {Array.from({ length: m.lessons }).map((_, li) => {
                  const lid = `m${mi}-l${li}`;
                  const isActive = activeLesson.moduleIdx === mi && activeLesson.lessonIdx === li;
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
                      <span className="truncate">Day {dayNumber(mi, li)}</span>
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
