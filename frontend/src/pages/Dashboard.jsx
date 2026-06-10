import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, TrendingUp, Award, CreditCard, User, LogOut, Clock, Brain, Sparkles, Heart, Flame } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const iconMap = { Clock, Brain, Sparkles, Heart, BookOpen };

export default function Dashboard({ onOpenAuth }) {
  const { user, loading, logout, updateProfile } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("courses");
  const [enrollments, setEnrollments] = useState([]);
  const [profile, setProfile] = useState({ name: "", phone: "", city: "", occupation: "" });

  useEffect(() => {
    if (!loading && !user) { onOpenAuth("login"); nav("/"); }
  }, [loading, user, nav, onOpenAuth]);

  useEffect(() => {
    if (user) {
      api.get("/enrollments/me").then((r) => setEnrollments(r.data)).catch(() => {});
      setProfile({ name: user.name || "", phone: user.phone || "", city: user.city || "", occupation: user.occupation || "" });
    }
  }, [user]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const initials = user.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";
  const paidEnrollments = enrollments.filter((e) => e.status === "paid");
  const totalSpent = paidEnrollments.reduce((s, e) => s + (e.amount || 0), 0);
  const avgProgress = paidEnrollments.length ? Math.round(paidEnrollments.reduce((s, e) => s + (e.progress_pct || 0), 0) / paidEnrollments.length) : 0;
  const completed = paidEnrollments.filter((e) => (e.progress_pct || 0) >= 100).length;

  const tabs = [
    { id: "courses", label: "My Courses", icon: BookOpen },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "certs", label: "Certificates", icon: Award },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "profile", label: "Profile", icon: User },
  ];

  const doLogout = async () => {
    await logout();
    toast.success("Logged out");
    nav("/");
  };

  const saveProfile = async () => {
    const r = await updateProfile(profile);
    if (r.ok) toast.success("Profile updated ✅");
    else toast.error(r.error);
  };

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10" data-testid="dashboard-page">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-black">Student Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, <span className="text-brand-gold font-semibold">{user.name.split(" ")[0]}</span> 👋</p>
        </div>
        <div className="flex items-center gap-3 bg-brand-goldSoft border border-brand-gold/30 rounded-full pl-1 pr-4 py-1">
          <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center text-xs font-black text-ink-950">{initials}</div>
          <div>
            <div className="text-xs font-bold">{user.name}</div>
            <div className="text-[10px] text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-6">
        <aside className="bg-ink-900 border border-white/[0.07] rounded-2xl p-3 h-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`dash-tab-${t.id}`}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold mb-1 transition-colors ${
                tab === t.id ? "bg-brand-goldSoft text-brand-gold" : "text-muted-foreground hover:bg-white/[0.04]"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
          <div className="border-t border-white/[0.07] mt-3 pt-3">
            <button onClick={doLogout} data-testid="dash-logout"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </aside>

        <main className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 min-h-[400px]">
          {tab === "courses" && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Stat label="Enrolled" value={paidEnrollments.length} />
                <Stat label="Avg Progress" value={`${avgProgress}%`} />
                <Stat label="Completed" value={completed} />
              </div>
              <SectionHead>Continue Learning</SectionHead>
              {paidEnrollments.length === 0 ? (
                <EmptyState text="You haven't enrolled in any courses yet." onClick={() => nav("/")} />
              ) : (
                paidEnrollments.map((e) => {
                  const Icon = iconMap[e.course_icon] || BookOpen;
                  return (
                    <button key={e.id} onClick={() => nav(`/learn/${e.course_slug}`)}
                      data-testid={`dash-course-${e.course_slug}`}
                      className="w-full text-left bg-ink-800 border border-white/[0.07] rounded-xl p-3.5 mb-2.5 flex items-center gap-4 hover:border-brand-gold/30 transition-colors">
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${e.course_palette[0]}, ${e.course_palette[1]})` }}>
                        <Icon className="w-5 h-5 text-white/80" strokeWidth={1.4} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold">{e.course_title}</h4>
                        <p className="text-xs text-muted-foreground">{e.course_tagline}</p>
                        <div className="h-1 bg-white/[0.07] rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-gold to-brand-purple rounded-full" style={{ width: `${e.progress_pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-brand-gold whitespace-nowrap">{e.progress_pct}%</span>
                    </button>
                  );
                })
              )}
            </>
          )}

          {tab === "progress" && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <Stat label="Day Streak 🔥" value="14" />
                <Stat label="Lessons Done" value={paidEnrollments.reduce((s, e) => s + (e.completed_lessons?.length || 0), 0)} />
                <Stat label="Watch Time" value="9.2h" />
              </div>
              <SectionHead>Weekly Activity</SectionHead>
              <div className="flex gap-1.5 items-end h-24 mb-6">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex-1 w-full bg-gradient-to-t from-brand-purple to-brand-gold rounded-t-md" style={{ height: `${[45, 70, 55, 85, 48, 30, 18][i]}%`, minHeight: "4px" }} />
                    <span className="text-[10px] text-muted-foreground">{d}</span>
                  </div>
                ))}
              </div>
              <SectionHead>Achievement Badges</SectionHead>
              <div className="flex flex-wrap gap-2">
                {["🔥 14-Day Streak", "📚 First Read", "🧠 Mind Warrior", "⏰ Time Starter", "🎯 Focused Learner"].map((b) => (
                  <div key={b} className="bg-brand-goldSoft border border-brand-gold/30 rounded-md px-3 py-1.5 text-xs font-bold text-brand-gold">{b}</div>
                ))}
              </div>
            </>
          )}

          {tab === "certs" && (
            <>
              <SectionHead>Earned Certificates</SectionHead>
              {paidEnrollments.filter((e) => e.progress_pct >= 100).length === 0 ? (
                <p className="text-sm text-muted-foreground mb-6">Complete a course 100% to earn your certificate.</p>
              ) : (
                paidEnrollments.filter((e) => e.progress_pct >= 100).map((e) => (
                  <div key={e.id} className="bg-ink-800 border border-brand-gold/25 rounded-xl p-4 mb-3 flex items-center gap-4">
                    <Award className="w-7 h-7 text-brand-gold" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold">{e.course_title}</h4>
                      <p className="text-xs text-muted-foreground">Issued · Vishnu Raghav</p>
                    </div>
                    <button onClick={() => toast.success("📄 Certificate PDF downloading...")}
                      className="bg-gold-gradient text-ink-950 rounded-md px-3 py-1.5 text-xs font-extrabold">⬇ Download</button>
                  </div>
                ))
              )}
              <SectionHead>In Progress</SectionHead>
              {paidEnrollments.filter((e) => e.progress_pct < 100).map((e) => (
                <div key={e.id} className="bg-ink-800 border border-white/[0.07] rounded-xl p-4 mb-3 flex items-center gap-4 opacity-70">
                  <div className="text-xl">🔒</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold">{e.course_title}</h4>
                    <p className="text-xs text-muted-foreground">Complete 100% to unlock · {e.progress_pct}% done</p>
                    <div className="h-1 bg-white/[0.07] rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-gold to-brand-purple rounded-full" style={{ width: `${e.progress_pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "payments" && (
            <>
              <SectionHead>Payment History</SectionHead>
              {paidEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              ) : (
                <>
                  {paidEnrollments.map((e) => (
                    <div key={e.id} className="bg-ink-800 border border-white/[0.07] rounded-xl p-3.5 mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold">{e.course_title}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()} · {e.payment_mode === "test_mock" ? "Test Mode" : "Razorpay"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-brand-gold">₹{e.amount.toLocaleString("en-IN")}</div>
                        <div className="text-[10px] text-green-400">✓ Paid</div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 text-sm text-muted-foreground">Total: <strong className="text-brand-gold">₹{totalSpent.toLocaleString("en-IN")}</strong></div>
                </>
              )}
            </>
          )}

          {tab === "profile" && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-gold to-brand-purple flex items-center justify-center text-lg font-black text-ink-950">{initials}</div>
                <div>
                  <h3 className="font-serif text-lg font-extrabold">{user.name}</h3>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[["Full Name", "name", "text"], ["Mobile", "phone", "tel"], ["City", "city", "text"], ["Occupation", "occupation", "text"]].map(([l, k, t]) => (
                  <div key={k}>
                    <label className="text-[11px] text-muted-foreground block mb-1">{l}</label>
                    <input data-testid={`profile-${k}`} type={t} value={profile[k]} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })}
                      className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3 py-2 text-sm focus:border-brand-gold outline-none" />
                  </div>
                ))}
              </div>
              <button data-testid="profile-save" onClick={saveProfile}
                className="mt-4 bg-gold-gradient text-ink-950 rounded-lg px-5 py-2.5 text-sm font-extrabold hover:-translate-y-0.5 transition-transform">
                Save Changes
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-ink-800 border border-white/[0.07] rounded-xl p-4 text-center">
      <div className="text-2xl font-black text-brand-gold">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
function SectionHead({ children }) {
  return <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">{children}</div>;
}
function EmptyState({ text, onClick }) {
  return (
    <div className="bg-ink-800 border border-dashed border-white/[0.1] rounded-xl p-8 text-center">
      <p className="text-sm text-muted-foreground mb-3">{text}</p>
      <button onClick={onClick} className="bg-gold-gradient text-ink-950 px-5 py-2 rounded-lg text-sm font-extrabold">Browse Courses</button>
    </div>
  );
}
