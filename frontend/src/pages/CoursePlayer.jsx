import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Lock, CheckCircle2, Circle, Play, Pause,
  Volume2, VolumeX, Volume1, Maximize, Minimize, RotateCcw, RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import CourseHub from "../components/CourseHub";
import CourseReviewCard from "../components/CourseReviewCard";

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
// Remember where the student stopped (saved in this browser)
function readResume(key) {
  try { return Number(window.localStorage.getItem(key)) || 0; } catch { return 0; }
}
function writeResume(key, sec) {
  try {
    if (sec > 0) window.localStorage.setItem(key, String(Math.floor(sec)));
    else window.localStorage.removeItem(key);
  } catch { /* ignore */ }
}
const BASE_W = 1920;
const BASE_H = 1080;
const CROP = 120;// px of YouTube frame hidden at top and bottom

const WATERMARK_SPOTS = [
  { top: "18%", left: "8%" },
  { top: "62%", left: "58%" },
  { top: "40%", left: "35%" },
  { top: "68%", left: "10%" },
  { top: "22%", left: "60%" },
];

function SecurePlayer({ videoId, watermark, autoPlay, onEnded }) {
  const resumeKey = `vr-resume-${watermark || "guest"}-${videoId}`;
  const [resumeFrom, setResumeFrom] = useState(0);
  const autoPlayRef = useRef(autoPlay);
  const onEndedRef = useRef(onEnded);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
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
      const saved = readResume(resumeKey);
      const startAt = saved > 5 ? saved : 0;
      setResumeFrom(startAt);
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
          start: startAt,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            setReady(true);
            if (startAt) setTime(startAt);
            if (autoPlayRef.current) e.target.playVideo();
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
              writeResume(resumeKey, 0);
              if (onEndedRef.current) onEndedRef.current();
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
   }, [videoId, resumeKey]);

  // Update the time / seek bar while playing
  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => {
      const p = playerRef.current;
       if (p && p.getCurrentTime) {
        const now = p.getCurrentTime() || 0;
        setTime(now);
        writeResume(resumeKey, now);
      }
    }, 500);
    return () => clearInterval(t);
 }, [playing, resumeKey]);

  // Measure the player box (to fit the Full-HD frame)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    let ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  
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
     if (muted || volume === 0) {
      p.unMute();
      if (volume === 0) { p.setVolume(50); setVolume(50); }
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  };

  const changeSpeed = () => {
    const p = playerRef.current;
    if (!p || !ready) return;
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    p.setPlaybackRate(next);
    setSpeed(next);
  };
const changeVolume = (v) => {
    const p = playerRef.current;
    setVolume(v);
    if (!p || !ready) return;
    p.setVolume(v);
    if (v === 0) { p.mute(); setMuted(true); }
    else if (muted) { p.unMute(); setMuted(false); }
    wakeUi();
  };
  
  const lockLandscape = () => {
    try {
      const o = window.screen && window.screen.orientation;
      if (o && o.lock) o.lock("landscape").catch(() => {});
    } catch (e) { /* ignore */ }
  };

  const unlockOrientation = () => {
    try {
      const o = window.screen && window.screen.orientation;
      if (o && o.unlock) o.unlock();
    } catch (e) { /* ignore */ }
  };

  const toggleFull = () => {
    const el = wrapRef.current;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      unlockOrientation();
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
      return;
    }
    if (fakeFull) { setFakeFull(false); return; }
    const req = el && (el.requestFullscreen || el.webkitRequestFullscreen);
    if (req) {
      const r = req.call(el);
      if (r && r.then) r.then(lockLandscape).catch(() => setFakeFull(true));
      else lockLandscape();
    } else {
      setFakeFull(true); // iPhone: full-window mode
    }
  };

  const isFull = realFull || fakeFull;
  const rotateFake = fakeFull && window.innerHeight > window.innerWidth;
  const uiVisible = showUi || !playing;
  const pct = duration ? (time / duration) * 100 : 0;
  const block = (e) => e.preventDefault();
  const shownVolume = muted ? 0 : volume;
  const scale = box.w && box.h ? Math.min(box.w / BASE_W, box.h / BASE_H) : 0;
  const frameLeft = (box.w - BASE_W * scale) / 2;
  const frameTop = (box.h - BASE_H * scale) / 2 - CROP * scale;

  return (
    <div
      ref={wrapRef}
      data-testid="secure-player"
      onContextMenu={block}
      onMouseMove={wakeUi}
      onTouchStart={wakeUi}
      className={`${fakeFull ? "fixed inset-0 z-[100]" : "aspect-video relative"} bg-black overflow-hidden select-none`}
       style={{
        cursor: uiVisible ? "default" : "none",
        ...(rotateFake ? { width: `${window.innerHeight}px`, height: `${window.innerWidth}px`, transformOrigin: "top left", transform: "rotate(90deg) translateY(-100%)" } : {}),
      }}
    >
      {/* YouTube frame: cropped top & bottom, cannot be clicked at all */}
      <div
        ref={hostRef}
         className="absolute top-0 left-0"
        style={{
          width: `${BASE_W}px`,
          height: `${BASE_H + CROP * 2}px`,
          transformOrigin: "0 0",
          transform: `translate(${frameLeft}px, ${frameTop}px) scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
          pointerEvents: "none",
        }}
      />

      {/* Cover image before start / after end, dark layer when paused */}
      {(!started || ended) && (
        <div
          className="absolute inset-0 bg-black bg-cover bg-center"
          style={{ backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }}
        />
      )}
      {started && !ended && !playing && <div className="absolute inset-0 bg-black/60" />}

      {/* Full cover: tap = show controls only, double-click = fullscreen */}
      <div
        data-testid="player-click-layer"
        className="absolute inset-0 z-10"
        onClick={wakeUi}
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

       {/* "Resume from" label */}
      {!started && resumeFrom > 0 && (
        <div
          data-testid="player-resume-label"
          className="absolute z-20 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs font-semibold px-3 py-1 rounded-full pointer-events-none"
          style={{ top: "calc(50% + 52px)" }}
        >
          Resume from {formatTime(resumeFrom)}
        </div>
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
          {shownVolume === 0 ? <VolumeX className="w-5 h-5" /> : shownVolume < 50 ? <Volume1 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
           <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={shownVolume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-16 sm:w-24 h-1 cursor-pointer"
            style={{ accentColor: "#C9A84C" }}
            aria-label="Volume"
          />
          <span className="text-[11px] sm:text-xs tabular-nums ml-1" data-testid="player-time">
            {formatTime(time)} / {formatTime(duration)}
          </span>
          <div className="flex-1" />
          <button type="button" data-testid="player-speed" onClick={changeSpeed} className="px-2 py-1 rounded hover:bg-white/10 text-xs font-bold">
            {speed}x
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
  const [autoStart, setAutoStart] = useState(false);
  const [searchParams] = useSearchParams();
  const fromReviewEmail = searchParams.get("review") === "1";
  const [view, setView] = useState(fromReviewEmail ? "videos" : "hub");

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
  const lessonDetails = c.lesson_details || [];
  const lessonInfo = lessonDetails[currentDay - 1] || {};

  const completedSet = new Set((access.completed_lessons || []).filter((id) => allLessonIds.includes(id)));
  const progressPct = Math.round((completedSet.size / totalLessons) * 100);
  
  // Overcoming Overthinking: show the 4 options first
  if (slug === "overcoming-overthinking" && view === "hub") {
    return <CourseHub course={c} progressPct={progressPct} onWatch={() => setView("videos")} onBack={() => nav("/dashboard")} />;
  }

  // Jump to a day number (1..21)
  const goToDay = (day) => {
    let d = day - 1;
    for (let mi = 0; mi < modules.length; mi++) {
      if (d < modules[mi].lessons) { setActiveLesson({ moduleIdx: mi, lessonIdx: d }); return; }
      d -= modules[mi].lessons;
    }
  };

  // When a video ends: start the next day automatically
  const handleEnded = () => {
    if (currentDay < allLessonIds.length) {
      setAutoStart(true);
      goToDay(currentDay + 1);
      toast.success(`Starting Day ${currentDay + 1}`);
    } else {
      toast.success("You finished the last day of the course!");
    }
  };

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
            <button onClick={() => (slug === "overcoming-overthinking" ? setView("hub") : nav("/dashboard"))} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> {slug === "overcoming-overthinking" ? "Back to Course Options" : "Back to Dashboard"}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        <div>
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl overflow-hidden mb-4">
            {currentVideoId ? (
              <SecurePlayer key={currentVideoId} videoId={currentVideoId} watermark={user?.email} autoPlay={autoStart} onEnded={handleEnded} />
            ) : (
              <div className="aspect-video bg-ink-950 flex items-center justify-center text-sm text-muted-foreground">
                Video coming soon
              </div>
            )}
            <div className="p-5">
              <div className="text-xs font-bold text-brand-gold mb-1" data-testid="current-day-label">Day {currentDay}</div>
               <h1 className="font-serif text-2xl font-black mb-1" data-testid="lesson-title">{lessonInfo.title || c.title}</h1>
              <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line" data-testid="lesson-description">{lessonInfo.description || c.tagline}</p>
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
          <CourseReviewCard slug={slug} autoFocus={fromReviewEmail} />
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
                      onClick={() => { setAutoStart(false); setActiveLesson({ moduleIdx: mi, lessonIdx: li }); }}
                      data-testid={`lesson-${lid}`}
                      className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-md text-xs mb-0.5 transition-colors ${
                        isActive ? "bg-brand-goldSoft text-brand-gold" : "text-muted-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> :
                        isActive ? <Play className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" /> :
                        <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
                       <span className="truncate">
                        Day {dayNumber(mi, li)}
                        {lessonDetails[dayNumber(mi, li) - 1]?.title ? ` · ${lessonDetails[dayNumber(mi, li) - 1].title}` : ""}
                      </span>
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
