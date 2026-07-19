import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BarChart3, Users, ShoppingBag, BookOpen, GraduationCap, FileText, Mail, MessageSquare, Image, Plus, Edit2, Trash2, Save, X, LogOut, Ticket, Brain, Upload, Loader2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import ImageUpload from "../components/ImageUpload";

const TABS = [
  { id: "stats", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "enrollments", label: "Enrollments", icon: ShoppingBag },
  { id: "books", label: "Books", icon: BookOpen },
  { id: "courses", label: "Courses", icon: GraduationCap },
  { id: "blog", label: "Blog", icon: FileText },
  { id: "coupons", label: "Coupons", icon: Ticket },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "contacts", label: "Contacts", icon: MessageSquare },
  { id: "assessment", label: "Assessment PDF", icon: Brain },
  { id: "site", label: "Site Settings", icon: Image },
];

export default function AdminPanel({ onOpenAuth }) {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("stats");

  useEffect(() => {
    if (!loading) {
      if (!user) { onOpenAuth("login"); nav("/"); return; }
      if (user.role !== "admin") { toast.error("Admin access only"); nav("/"); }
    }
  }, [loading, user, nav, onOpenAuth]);

  if (loading || !user || user.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10" data-testid="admin-panel">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-black">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage books, courses, blog posts and site content</p>
        </div>
        <button onClick={async () => { await logout(); nav("/"); }} data-testid="admin-logout"
          className="flex items-center gap-2 bg-ink-800 border border-white/[0.07] text-muted-foreground px-3 py-1.5 rounded-lg text-xs hover:text-red-400 hover:border-red-500/30 transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-6">
        <aside className="bg-ink-900 border border-white/[0.07] rounded-2xl p-3 h-fit">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold mb-1 transition-colors ${
                tab === t.id ? "bg-brand-goldSoft text-brand-gold" : "text-muted-foreground hover:bg-white/[0.04]"
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </aside>

        <main className="bg-ink-900 border border-white/[0.07] rounded-2xl p-6 min-h-[500px]">
          {tab === "stats" && <StatsPanel />}
          {tab === "users" && <UsersPanel />}
          {tab === "enrollments" && <EnrollmentsPanel />}
          {tab === "books" && <BooksPanel />}
          {tab === "courses" && <CoursesPanel />}
          {tab === "blog" && <BlogPanel />}
          {tab === "coupons" && <CouponsPanel />}
          {tab === "newsletter" && <NewsletterPanel />}
          {tab === "contacts" && <ContactsPanel />}
          {tab === "assessment" && <AssessmentProductPanel />}
          {tab === "site" && <SiteSettingsPanel />}
        </main>
      </div>
    </div>
  );
}

function StatsPanel() {
  const [stats, setStats] = useState({});
  useEffect(() => { api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {}); }, []);
  const cards = [
    ["Total Users", stats.users || 0, "bg-blue-500/10 text-blue-400"],
    ["Paid Enrollments", stats.enrollments || 0, "bg-green-500/10 text-green-400"],
    ["Revenue (₹)", (stats.revenue || 0).toLocaleString("en-IN"), "bg-brand-goldSoft text-brand-gold"],
    ["Newsletter Subs", stats.newsletter_subs || 0, "bg-purple-500/10 text-purple-400"],
    ["Contact Messages", stats.contacts || 0, "bg-pink-500/10 text-pink-400"],
  ];
  return (
    <>
      <h2 className="font-serif text-xl font-extrabold mb-5">Platform Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(([label, value, color], i) => (
          <div key={i} className={`rounded-xl p-5 border border-white/[0.07] ${color.split(" ")[0]}`}>
            <div className={`text-3xl font-black ${color.split(" ")[1]}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 bg-ink-800 border border-white/[0.07] rounded-xl text-xs text-muted-foreground">
        <strong className="text-foreground">Tip:</strong> Click on tabs at the left to manage Books, Courses, Blog posts and Site Settings. All edits are saved instantly.
      </div>
    </>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get("/admin/users").then((r) => setUsers(r.data)).catch(() => {}); }, []);
  return (
    <>
      <h2 className="font-serif text-xl font-extrabold mb-5">Registered Users ({users.length})</h2>
      <DataTable
        rows={users}
        cols={[
          ["Name", "name"],
          ["Email", "email"],
          ["Role", "role"],
          ["Phone", "phone"],
          ["Joined", "created_at", (v) => v ? new Date(v).toLocaleDateString() : ""],
        ]}
      />
    </>
  );
}

function EnrollmentsPanel() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/enrollments").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <>
      <h2 className="font-serif text-xl font-extrabold mb-5">All Enrollments ({items.length})</h2>
      <DataTable
        rows={items}
        cols={[
          ["Course", "course_title"],
          ["Amount", "amount", (v) => `₹${v.toLocaleString("en-IN")}`],
          ["Status", "status"],
          ["Date", "created_at", (v) => v ? new Date(v).toLocaleDateString() : ""],
        ]}
      />
    </>
  );
}

function NewsletterPanel() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/newsletter").then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <>
      <h2 className="font-serif text-xl font-extrabold mb-5">Newsletter Subscribers ({items.length})</h2>
      <DataTable
        rows={items}
        cols={[
          ["Email", "email"],
          ["Subscribed", "created_at", (v) => v ? new Date(v).toLocaleDateString() : ""],
        ]}
      />
    </>
  );
}

function ContactsPanel() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/contacts").then((r) => setItems(r.data)).catch(() => {}); }, []);
  const [view, setView] = useState(null);
  return (
    <>
      <h2 className="font-serif text-xl font-extrabold mb-5">Contact Messages ({items.length})</h2>
      {view && (
        <div className="bg-ink-800 border border-brand-gold/30 rounded-xl p-4 mb-4 relative">
          <button onClick={() => setView(null)} className="absolute top-2 right-2 text-muted-foreground"><X className="w-4 h-4" /></button>
          <div className="text-xs text-muted-foreground mb-1">From: <strong className="text-foreground">{view.name}</strong> ({view.email})</div>
          <div className="text-xs text-muted-foreground mb-3">Purpose: {view.purpose} · {view.phone || "no phone"}</div>
          <div className="text-sm whitespace-pre-line">{view.message}</div>
        </div>
      )}
      <div className="space-y-2">
        {items.map((c) => (
          <button key={c.id} onClick={() => setView(c)} data-testid={`contact-row-${c.id}`}
            className="w-full text-left bg-ink-800 border border-white/[0.07] rounded-lg p-3 hover:border-brand-gold/30 transition-colors">
            <div className="flex justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{c.name} <span className="text-muted-foreground font-normal">· {c.email}</span></div>
                <div className="text-xs text-muted-foreground truncate">{c.message}</div>
              </div>
              <div className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</div>
            </div>
          </button>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No contact messages yet.</p>}
      </div>
    </>
  );
}

function BooksPanel() {
  const [books, setBooks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const refresh = () => api.get("/books").then((r) => setBooks(r.data)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  return (
    <>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-serif text-xl font-extrabold">Books ({books.length})</h2>
        <button onClick={() => setCreating(true)} data-testid="admin-book-new"
          className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-3 py-1.5 rounded-lg text-xs font-extrabold">
          <Plus className="w-3.5 h-3.5" /> New Book
        </button>
      </div>

      {(editing || creating) && (
        <BookForm
          book={editing}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); refresh(); }}
        />
      )}

      <div className="space-y-2 mt-4">
        {books.map((b) => (
          <div key={b.slug} className="flex items-center gap-4 bg-ink-800 border border-white/[0.07] rounded-xl p-3" data-testid={`admin-book-row-${b.slug}`}>
            {b.cover_image ? <img src={b.cover_image} alt="" className="w-12 h-16 object-cover rounded-md" /> : <div className="w-12 h-16 rounded-md bg-ink-700" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">{b.title}</div>
              <div className="text-xs text-brand-gold">{b.hindi}</div>
              <div className="text-[11px] text-muted-foreground">{b.price} · {b.status}</div>
            </div>
            <button onClick={() => setEditing(b)} data-testid={`admin-book-edit-${b.slug}`}
              className="p-2 rounded-md hover:bg-white/[0.04] text-brand-gold"><Edit2 className="w-4 h-4" /></button>
            <button onClick={async () => {
              if (!window.confirm(`Delete "${b.title}"?`)) return;
              try { await api.delete(`/admin/books/${b.slug}`); toast.success("Deleted"); refresh(); }
              catch (e) { toast.error(formatApiError(e)); }
            }} data-testid={`admin-book-delete-${b.slug}`}
              className="p-2 rounded-md hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}

function BookForm({ book, onCancel, onSaved }) {
  const isNew = !book;
  const [form, setForm] = useState(book || {
    slug: "", title: "", hindi: "", tagline: "", publisher: "BlueRose ONE",
    price: "₹220", description: "", excerpt: "",
    takeaways: [], amazon: "", flipkart: "", badge: "",
    cover_image: "", cover_palette: ["#1a3a5c", "#2c5f8a"], status: "available", order: 100,
  });
  const [takeawaysText, setTakeawaysText] = useState((form.takeaways || []).join("\n"));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.slug || !form.title) { toast.error("Slug and Title required"); return; }
    setSaving(true);
    const payload = { ...form, takeaways: takeawaysText.split("\n").map(s => s.trim()).filter(Boolean) };
    try {
      if (isNew) {
        await api.post("/admin/books", payload);
        toast.success("Book created");
      } else {
        const { slug, ...rest } = payload;
        await api.patch(`/admin/books/${slug}`, rest);
        toast.success("Book updated");
      }
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    setSaving(false);
  };

  return (
    <div className="bg-ink-800 border border-brand-gold/30 rounded-xl p-4 space-y-3" data-testid="admin-book-form">
      <div className="flex justify-between items-center">
        <h3 className="font-serif font-bold text-sm">{isNew ? "New Book" : `Editing: ${book.title}`}</h3>
        <button onClick={onCancel} className="text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Slug (URL-safe id)"><input data-testid="bf-slug" disabled={!isNew} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Title (English)"><input data-testid="bf-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Title (Hindi)"><input value={form.hindi} onChange={(e) => setForm({ ...form, hindi: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Tagline"><input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Publisher"><input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Price (display)"><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Signed Copy Price (₹)"><input type="number" value={form.signed_price || 249} onChange={(e) => setForm({ ...form, signed_price: parseInt(e.target.value) })} className={fieldCls} placeholder="249" /></FormField>
        <FormField label="COD Fee (₹)"><input type="number" value={form.cod_fee ?? 40} onChange={(e) => setForm({ ...form, cod_fee: parseInt(e.target.value) })} className={fieldCls} placeholder="40" /></FormField>
        <FormField label="Amazon URL"><input value={form.amazon} onChange={(e) => setForm({ ...form, amazon: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Flipkart URL"><input value={form.flipkart} onChange={(e) => setForm({ ...form, flipkart: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Badge (Bestseller / Coming Soon)"><input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={fieldCls}><option value="available">Available</option><option value="upcoming">Upcoming</option></select></FormField>
      </div>
      <FormField label="Cover Image">
        <ImageUpload
          value={form.cover_image}
          onChange={async (url) => {
            setForm({ ...form, cover_image: url });
            // Auto-save image immediately when editing existing book
            if (!isNew && book?.slug) {
              try { await api.patch(`/admin/books/${book.slug}`, { cover_image: url }); } catch (e) { /* ignored */ }
            }
          }}
          testIdPrefix="bf-cover"
          previewClass="w-24 h-32"
        />
      </FormField>
      <FormField label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldCls + " min-h-[60px]"} /></FormField>
      <FormField label="Excerpt (italic quote shown on card)"><textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className={fieldCls + " min-h-[60px]"} /></FormField>
      <FormField label="Key Takeaways (one per line)"><textarea value={takeawaysText} onChange={(e) => setTakeawaysText(e.target.value)} className={fieldCls + " min-h-[80px]"} /></FormField>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-white/[0.04] text-muted-foreground text-xs border border-white/[0.07]">Cancel</button>
        <button onClick={save} disabled={saving} data-testid="bf-save"
          className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-4 py-1.5 rounded-lg text-xs font-extrabold disabled:opacity-60">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function CoursesPanel() {
  const [courses, setCourses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const refresh = () => api.get("/courses").then((r) => setCourses(r.data)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  return (
    <>
      <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-3 py-1.5 rounded-lg text-xs font-extrabold"><Plus className="w-3.5 h-3.5" /> New Course</button>
      <h2 className="font-serif text-xl font-extrabold mb-2">Courses ({courses.length})</h2>
      <p className="text-xs text-muted-foreground mb-5">Edit course basics. Lessons/modules structure is fixed in v1.</p>

     {(editing || creating) && <CourseForm course={editing} onCancel={() => { setEditing(null); setCreating(false); }} onSaved={() => { setEditing(null); setCreating(false); refresh(); }} />}

      <div className="space-y-2 mt-4">
        {courses.map((c) => (
          <div key={c.slug} className="flex items-center gap-4 bg-ink-800 border border-white/[0.07] rounded-xl p-3" data-testid={`admin-course-row-${c.slug}`}>
            {c.thumbnail ? (
              <img src={c.thumbnail} alt="" className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-md flex-shrink-0" style={{ background: `linear-gradient(135deg,${c.palette?.[0] || "#1a1228"},${c.palette?.[1] || "#3a2865"})` }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">{c.title}</div>
              <div className="text-[11px] text-muted-foreground">₹{c.price?.toLocaleString("en-IN")} · {c.duration} · {c.lessons} lessons</div>
            </div>
            <button onClick={() => setEditing(c)} data-testid={`admin-course-edit-${c.slug}`}
              className="p-2 rounded-md hover:bg-white/[0.04] text-brand-gold"><Edit2 className="w-4 h-4" /></button>
            <button onClick={async () => { if (!window.confirm(`Delete "${c.title}"?`)) return; try { await api.delete(`/admin/courses/${encodeURIComponent(c.slug)}`); toast.success("Deleted"); refresh(); } catch (e) { toast.error(formatApiError(e)); } }} className="p-2 rounded-md hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}

function CourseForm({ course, onCancel, onSaved }) {
  const [form, setForm] = useState({
    title: course?.title || "",
    tagline: course?.tagline || "",
    price: course?.price || 0,
    original_price: course?.original_price || 0,
    duration: course?.duration || "",
    lessons: course?.lessons || 0,
    modules: course?.modules || 0,
    level: course?.level || "All Levels",
    rating: course?.rating || 4.5,
    students: course?.students || 0,
    featured: course?.featured || false,
    new: course?.new || false,
    youtube_playlist: course?.youtube_playlist || "",
    thumbnail: course?.thumbnail || "",
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const isNew = !course;
if (isNew) { await api.post("/admin/courses", form); toast.success("Course created"); }
else { await api.patch(`/admin/courses/${encodeURIComponent(course.slug)}`, form); toast.success("Course updated"); onSaved(); }
    } catch (e) { toast.error(formatApiError(e)); }
    setSaving(false);
  };
  return (
    <div className="bg-ink-800 border border-brand-gold/30 rounded-xl p-4 space-y-3" data-testid="admin-course-form">
      <div className="flex justify-between items-center">
        <h3 className="font-serif font-bold text-sm">{course ? `Editing: ${course.title}` : "New Course"}</h3>
        <button onClick={onCancel} className="text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Title"><input data-testid="cf-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })} className={fieldCls} /></FormField>
        <FormField label="Slug"><input value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-from-title" className="w-full bg-ink-800 border border-white/[0.07] rounded-lg px-3.5 py-2.5 text-sm" /></FormField>
        <FormField label="Tagline"><input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Price ₹"><input data-testid="cf-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className={fieldCls} /></FormField>
        <FormField label="Original Price ₹"><input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: parseInt(e.target.value) || 0 })} className={fieldCls} /></FormField>
        <FormField label="Duration"><input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Lessons"><input type="number" value={form.lessons} onChange={(e) => setForm({ ...form, lessons: parseInt(e.target.value) || 0 })} className={fieldCls} /></FormField>
        <FormField label="Modules"><input type="number" value={form.modules} onChange={(e) => setForm({ ...form, modules: parseInt(e.target.value) || 0 })} className={fieldCls} /></FormField>
        <FormField label="Level"><input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Rating (0-5)"><input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })} className={fieldCls} /></FormField>
        <FormField label="Students Count"><input type="number" value={form.students} onChange={(e) => setForm({ ...form, students: parseInt(e.target.value) || 0 })} className={fieldCls} /></FormField>
      </div>
      <FormField label="YouTube Playlist Embed URL (https://www.youtube.com/embed/videoseries?list=...)">
        <input data-testid="cf-youtube" value={form.youtube_playlist} onChange={(e) => setForm({ ...form, youtube_playlist: e.target.value })} className={fieldCls} />
      </FormField>
      <FormField label="Course Thumbnail">
        <ImageUpload
          value={form.thumbnail}
          onChange={async (url) => {
            setForm((f) => ({ ...f, thumbnail: url }));
            try { await api.patch(`/admin/courses/${course.slug}`, { thumbnail: url }); } catch (e) { /* ignored */ }
          }}
          testIdPrefix="cf-thumb"
          previewClass="w-32 h-20"
        />
      </FormField>
      <div className="flex gap-4 text-xs">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured (Most Popular badge)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.new} onChange={(e) => setForm({ ...form, new: e.target.checked })} /> New badge</label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-white/[0.04] text-muted-foreground text-xs border border-white/[0.07]">Cancel</button>
        <button onClick={save} disabled={saving} data-testid="cf-save"
          className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-4 py-1.5 rounded-lg text-xs font-extrabold disabled:opacity-60">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function BlogPanel() {
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const refresh = () => api.get("/blog").then((r) => setPosts(r.data)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  return (
    <>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-serif text-xl font-extrabold">Blog Posts ({posts.length})</h2>
        <button onClick={() => setCreating(true)} data-testid="admin-blog-new"
          className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-3 py-1.5 rounded-lg text-xs font-extrabold">
          <Plus className="w-3.5 h-3.5" /> New Post
        </button>
      </div>

      {(editing || creating) && (
        <BlogForm post={editing} onCancel={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); refresh(); }} />
      )}

      <div className="space-y-2 mt-4">
        {posts.map((p) => (
          <div key={p.slug} className="flex items-center gap-4 bg-ink-800 border border-white/[0.07] rounded-xl p-3" data-testid={`admin-blog-row-${p.slug}`}>
            {p.image ? (
              <img src={p.image} alt="" className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-md flex-shrink-0" style={{ background: `linear-gradient(135deg,${p.palette?.[0] || "#1a1228"},${p.palette?.[1] || "#3a2865"})` }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">{p.title}</div>
              <div className="text-[11px] text-muted-foreground">{p.category} · {p.date} · {p.read_min} min</div>
            </div>
            <button onClick={() => setEditing(p)} data-testid={`admin-blog-edit-${p.slug}`}
              className="p-2 rounded-md hover:bg-white/[0.04] text-brand-gold"><Edit2 className="w-4 h-4" /></button>
            <button onClick={async () => {
              if (!window.confirm(`Delete "${p.title}"?`)) return;
              try { await api.delete(`/admin/blog/${encodeURIComponent(p.slug)}`); toast.success("Deleted"); refresh(); }
              catch (e) { toast.error(formatApiError(e)); }
            }} data-testid={`admin-blog-delete-${p.slug}`}
              className="p-2 rounded-md hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}

function BlogForm({ post, onCancel, onSaved }) {
  const isNew = !post;
  const [form, setForm] = useState(post || {
    slug: "", title: "", category: "productivity", excerpt: "", body: "",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    read_min: 5, featured: false, palette: ["#1a1228", "#3a2865"], icon: "BookOpen", image: "", order: 100,
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.slug || !form.title) { toast.error("Slug and Title required"); return; }
    setSaving(true);
    try {
      if (isNew) { await api.post("/admin/blog", form); toast.success("Post created"); }
      else { const { slug, ...rest } = form; await api.patch(`/admin/blog/${encodeURIComponent(slug)}`, rest); toast.success("Post updated"); }
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    setSaving(false);
  };
  return (
    <div className="bg-ink-800 border border-brand-gold/30 rounded-xl p-4 space-y-3" data-testid="admin-blog-form">
      <div className="flex justify-between items-center">
        <h3 className="font-serif font-bold text-sm">{isNew ? "New Post" : `Editing: ${post.title}`}</h3>
        <button onClick={onCancel} className="text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Slug"><input data-testid="bf-blog-slug" disabled={!isNew} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Title"><input data-testid="bf-blog-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={fieldCls}>
          {["productivity", "motivation", "time", "career", "study", "general"].map(c => <option key={c} value={c}>{c}</option>)}
        </select></FormField>
        <FormField label="Date (display)"><input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={fieldCls} /></FormField>
        <FormField label="Read time (min)"><input type="number" value={form.read_min} onChange={(e) => setForm({ ...form, read_min: parseInt(e.target.value) || 0 })} className={fieldCls} /></FormField>
        <FormField label="Icon (Zap / Clock / Flame / BookOpen / Briefcase)"><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className={fieldCls} /></FormField>
      </div>
      <FormField label="Excerpt"><textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className={fieldCls + " min-h-[60px]"} /></FormField>
      <FormField label="Featured Image">
        <ImageUpload
          value={form.image}
          onChange={async (url) => {
            setForm((f) => ({ ...f, image: url }));
            if (!isNew && post?.slug) {
             try  { await api.patch(`/admin/blog/${encodeURIComponent(post.slug)}`, { image: url }); } catch (e) { /* ignored */ }
            }
          }}
          testIdPrefix="bf-blog-image"
          previewClass="w-32 h-20"
        />
      </FormField>
      <FormField label="Body (full article)"><textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={fieldCls + " min-h-[160px]"} /></FormField>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured (large card on blog grid)</label>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-white/[0.04] text-muted-foreground text-xs border border-white/[0.07]">Cancel</button>
        <button onClick={save} disabled={saving} data-testid="bf-blog-save"
          className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-4 py-1.5 rounded-lg text-xs font-extrabold disabled:opacity-60">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function SiteSettingsPanel() {
  const [form, setForm] = useState({ author_photo: "", hero_quote: "", youtube_channel_url: "", youtube_videos: [] });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get("/site/assets").then((r) => setForm({
      author_photo: r.data.author_photo || "",
      hero_quote: r.data.hero_quote || "",
      youtube_channel_url: r.data.youtube_channel_url || "https://youtube.com/@vishnuraghav",
      youtube_videos: (r.data.youtube_videos && r.data.youtube_videos.length > 0) ? r.data.youtube_videos : [
        { title: "", url: "", palette: ["#1a1228", "#3a2865"] },
        { title: "", url: "", palette: ["#120c28", "#2c1870"] },
        { title: "", url: "", palette: ["#1a0a10", "#4a1030"] },
      ],
    })).catch(() => {});
  }, []);
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/site", form);
      setForm({
        author_photo: data.author_photo || "",
        hero_quote: data.hero_quote || "",
        youtube_channel_url: data.youtube_channel_url || "",
        youtube_videos: data.youtube_videos || [],
      });
      toast.success("Site settings saved");
    } catch (e) { toast.error(formatApiError(e)); }
    setSaving(false);
  };
  const updateVideo = (i, patch) => {
    const copy = [...form.youtube_videos];
    copy[i] = { ...copy[i], ...patch };
    setForm({ ...form, youtube_videos: copy });
  };
  const addVideo = () => setForm({ ...form, youtube_videos: [...form.youtube_videos, { title: "", url: "", palette: ["#1a1228", "#3a2865"] }] });
  const removeVideo = (i) => setForm({ ...form, youtube_videos: form.youtube_videos.filter((_, idx) => idx !== i) });

  // Extract YT ID for thumbnail preview (mirrors logic in Home.jsx)
  const ytThumb = (url) => {
    if (!url) return null;
    const u = String(url).trim();
    if (!u) return null;
    const patterns = [/[?&]v=([a-zA-Z0-9_-]{11})/, /youtu\.be\/([a-zA-Z0-9_-]{11})/, /\/shorts\/([a-zA-Z0-9_-]{11})/, /\/embed\/([a-zA-Z0-9_-]{11})/, /\/live\/([a-zA-Z0-9_-]{11})/, /\/v\/([a-zA-Z0-9_-]{11})/];
    for (const p of patterns) { const m = u.match(p); if (m) return `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`; }
    if (/^[a-zA-Z0-9_-]{11}$/.test(u)) return `https://i.ytimg.com/vi/${u}/hqdefault.jpg`;
    return null;
  };

  return (
    <>
      <h2 className="font-serif text-xl font-extrabold mb-5">Site Settings</h2>
      <div className="space-y-5 max-w-2xl">
        <FormField label="Author Photo (hero + about sections)">
          <ImageUpload
            value={form.author_photo}
            onChange={async (url) => {
              setForm((f) => ({ ...f, author_photo: url }));
              try { await api.patch("/admin/site", { author_photo: url }); toast.success("Author photo updated"); } catch (e) { toast.error(formatApiError(e)); }
            }}
            testIdPrefix="site-photo"
            previewClass="w-32 h-40"
          />
        </FormField>

        <FormField label="Hero Quote (italic line under tagline)">
          <input data-testid="site-quote" value={form.hero_quote} onChange={(e) => setForm({ ...form, hero_quote: e.target.value })} className={fieldCls} />
        </FormField>

        <FormField label="YouTube Channel URL">
          <input data-testid="site-yt-channel" value={form.youtube_channel_url} onChange={(e) => setForm({ ...form, youtube_channel_url: e.target.value })} placeholder="https://youtube.com/@vishnuraghav" className={fieldCls} />
        </FormField>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] text-muted-foreground">YouTube Videos (shown on landing page)</label>
            <button onClick={addVideo} data-testid="site-yt-add"
              className="flex items-center gap-1 bg-brand-purpleSoft text-brand-purpleLight px-2 py-1 rounded text-[11px] font-bold"><Plus className="w-3 h-3" /> Add</button>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">
            Paste any YouTube video URL (watch link, youtu.be link, or shorts link). Real thumbnail will auto-load from YouTube.
          </p>
          <div className="space-y-3">
            {form.youtube_videos.map((v, i) => (
              <div key={i} className="flex gap-3 bg-ink-900 border border-white/[0.07] rounded-xl p-3" data-testid={`site-yt-row-${i}`}>
                {ytThumb(v.url) ? (
                  <img src={ytThumb(v.url)} alt="" className="w-24 h-16 object-cover rounded-md flex-shrink-0" />
                ) : (
                  <div className="w-24 h-16 rounded-md flex-shrink-0" style={{ background: `linear-gradient(135deg,${v.palette?.[0] || "#1a1228"},${v.palette?.[1] || "#3a2865"})` }} />
                )}
                <div className="flex-1 space-y-2 min-w-0">
                  <input data-testid={`site-yt-title-${i}`} value={v.title} onChange={(e) => updateVideo(i, { title: e.target.value })} placeholder="Video Title (e.g. Time Management की पूरी Guide)" className={fieldCls} />
                  <input data-testid={`site-yt-url-${i}`} value={v.url} onChange={(e) => updateVideo(i, { url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className={fieldCls} />
                </div>
                <button onClick={() => removeVideo(i)} data-testid={`site-yt-remove-${i}`}
                  className="text-red-400 hover:bg-red-500/10 rounded-md p-1.5 self-start"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving} data-testid="site-save"
          className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-5 py-2 rounded-lg text-sm font-extrabold disabled:opacity-60">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </>
  );
}

function CouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const refresh = () => api.get("/admin/coupons").then((r) => setCoupons(r.data)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  return (
    <>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-serif text-xl font-extrabold">Coupons ({coupons.length})</h2>
        <button onClick={() => setCreating(true)} data-testid="admin-coupon-new"
          className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-3 py-1.5 rounded-lg text-xs font-extrabold">
          <Plus className="w-3.5 h-3.5" /> New Coupon
        </button>
      </div>

      {(editing || creating) && (
        <CouponForm coupon={editing} onCancel={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); refresh(); }} />
      )}

      <div className="space-y-2 mt-4">
        {coupons.map((c) => {
          const expired = c.expires_at && new Date(c.expires_at) < new Date();
          const limited = c.max_uses != null;
          return (
            <div key={c.code} className="flex items-center gap-4 bg-ink-800 border border-white/[0.07] rounded-xl p-3" data-testid={`admin-coupon-row-${c.code}`}>
              <div className="w-14 h-14 rounded-md flex items-center justify-center bg-brand-goldSoft text-brand-gold font-black text-base flex-shrink-0">
                {c.kind === "percent" ? `${c.value}%` : `₹${c.value}`}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold flex items-center gap-2">
                  <span className="font-mono">{c.code}</span>
                  {!c.active && <span className="text-[10px] bg-white/[0.07] text-muted-foreground px-1.5 py-0.5 rounded">Inactive</span>}
                  {expired && <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">Expired</span>}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {c.kind === "percent" ? `${c.value}% off` : `₹${c.value} off`}
                  {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : " · no expiry"}
                  {limited ? ` · ${c.used_count}/${c.max_uses} used` : ` · ${c.used_count} used`}
                  {c.course_slugs && c.course_slugs.length > 0 ? ` · ${c.course_slugs.length} course(s)` : " · all courses"}
                </div>
              </div>
              <button onClick={() => setEditing(c)} data-testid={`admin-coupon-edit-${c.code}`}
                className="p-2 rounded-md hover:bg-white/[0.04] text-brand-gold"><Edit2 className="w-4 h-4" /></button>
              <button onClick={async () => {
                if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
                try { await api.delete(`/admin/coupons/${c.code}`); toast.success("Deleted"); refresh(); }
                catch (e) { toast.error(formatApiError(e)); }
              }} data-testid={`admin-coupon-delete-${c.code}`}
                className="p-2 rounded-md hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
        {coupons.length === 0 && <p className="text-sm text-muted-foreground">No coupons yet. Click &quot;New Coupon&quot; to create one.</p>}
      </div>
    </>
  );
}

function CouponForm({ coupon, onCancel, onSaved }) {
  const isNew = !coupon;
  const [form, setForm] = useState(coupon ? {
    code: coupon.code,
    kind: coupon.kind || "percent",
    value: coupon.value || 0,
    expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : "",
    max_uses: coupon.max_uses ?? "",
    course_slugs_text: (coupon.course_slugs || []).join(","),
    active: coupon.active !== false,
  } : {
   code: "", kind: "percent", value: 10, expires_at: "", max_uses: "", course_slugs_text: "", applies_to: "all", active: true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) { toast.error("Code is required"); return; }
    if (!form.value || form.value <= 0) { toast.error("Discount value must be > 0"); return; }
    if (form.kind === "percent" && form.value > 100) { toast.error("Percent must be ≤ 100"); return; }
    setSaving(true);
    const payload = {
      kind: form.kind,
      value: parseInt(form.value, 10),
      expires_at: form.expires_at || null,
      max_uses: form.max_uses === "" || form.max_uses === null ? null : parseInt(form.max_uses, 10),
      course_slugs: form.course_slugs_text
        ? form.course_slugs_text.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      active: !!form.active,
      applies_to: form.applies_to || "all",
    };
    try {
      if (isNew) {
        await api.post("/admin/coupons", { code, ...payload });
        toast.success("Coupon created");
      } else {
        await api.patch(`/admin/coupons/${code}`, payload);
        toast.success("Coupon updated");
      }
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    setSaving(false);
  };

  return (
    <div className="bg-ink-800 border border-brand-gold/30 rounded-xl p-4 space-y-3" data-testid="admin-coupon-form">
      <div className="flex justify-between items-center">
        <h3 className="font-serif font-bold text-sm">{isNew ? "New Coupon" : `Editing: ${coupon.code}`}</h3>
        <button onClick={onCancel} className="text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Code (uppercase)">
          <input data-testid="cpf-code" disabled={!isNew} value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="LAUNCH20" className={fieldCls + " font-mono uppercase tracking-wider"} />
        </FormField>
        <FormField label="Type">
          <select data-testid="cpf-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={fieldCls}>
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed (₹)</option>
          </select>
        </FormField>
        <FormField label={form.kind === "percent" ? "Discount %" : "Discount ₹"}>
          <input data-testid="cpf-value" type="number" value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })} className={fieldCls} />
        </FormField>
        <FormField label="Expires on (optional)">
          <input data-testid="cpf-expires" type="date" value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={fieldCls} />
        </FormField>
        <FormField label="Max uses (optional, blank = unlimited)">
          <input data-testid="cpf-max-uses" type="number" min="1" value={form.max_uses}
            onChange={(e) => setForm({ ...form, max_uses: e.target.value })} className={fieldCls} />
        </FormField>
        <FormField label="Restrict to course slugs (comma separated, blank = all)">
          <input data-testid="cpf-slugs" value={form.course_slugs_text}
            onChange={(e) => setForm({ ...form, course_slugs_text: e.target.value })}
            placeholder="time-management-mastery, overcoming-overthinking" className={fieldCls} />
        </FormField>
        <FormField label="Applies to">
          <select value={form.applies_to || "all"} onChange={(e) => setForm({ ...form, applies_to: e.target.value })} className={fieldCls}>
            <option value="all">All (Courses + Books)</option>
            <option value="courses">Courses only</option>
            <option value="books">Books only</option>
          </select>
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input data-testid="cpf-active" type="checkbox" checked={!!form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        Active
      </label>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg bg-white/[0.04] text-muted-foreground text-xs border border-white/[0.07]">Cancel</button>
        <button onClick={save} disabled={saving} data-testid="cpf-save"
          className="flex items-center gap-1.5 bg-gold-gradient text-ink-950 px-4 py-1.5 rounded-lg text-xs font-extrabold disabled:opacity-60">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Shared helpers ──
const fieldCls = "w-full bg-ink-900 border border-white/[0.07] rounded-lg px-3 py-2 text-xs focus:border-brand-gold outline-none";

function FormField({ label, children }) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function DataTable({ rows, cols }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  return (
    <div className="bg-ink-800 border border-white/[0.07] rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ink-900 border-b border-white/[0.07]">
          <tr>{cols.map((c) => <th key={c[0]} className="text-left p-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{c[0]}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-0">
              {cols.map((c) => (
                <td key={c[0]} className="p-3 text-xs">
                  {c[2] ? c[2](row[c[1]]) : (row[c[1]] || "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════
// ─── Assessment PDF Product Panel ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function AssessmentProductPanel() {
  const [form, setForm] = useState({
    pdf_url: "", price: 199, is_active: false,
    title: "Mind Health Workbook", description: "",
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    api.get("/admin/assessment-product").then(({ data }) => {
      setForm({
        pdf_url: data.pdf_url || "",
        price: data.price ?? 199,
        is_active: !!data.is_active,
        title: data.title || "Mind Health Workbook",
        description: data.description || "",
      });
    }).catch(() => toast.error("Could not load product"))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a .pdf file"); return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error("PDF too large (max 30 MB)"); return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload-pdf", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(f => ({ ...f, pdf_url: data.url }));
      toast.success("PDF uploaded successfully!");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (form.is_active && !form.pdf_url) {
      toast.error("Please upload a PDF before making product active"); return;
    }
    if (form.price < 1) {
      toast.error("Price must be at least ₹1"); return;
    }
    setSaving(true);
    try {
      await api.post("/admin/assessment-product", form);
      toast.success("Assessment PDF settings saved!");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-serif text-2xl font-black mb-1">Assessment PDF Workbook</h2>
        <p className="text-sm text-muted-foreground">Manage the paid workbook that appears on the Mind Assessment result page.</p>
      </div>

      {/* Active toggle */}
      <div className="bg-ink-800 border border-white/10 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-sm mb-1">Sell this workbook</div>
          <div className="text-xs text-muted-foreground">Turn ON to show "Buy for ₹{form.price}" on assessment results. Turn OFF to show "Coming soon".</div>
        </div>
        <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
          data-testid="assessment-active-toggle"
          className={`relative w-14 h-7 rounded-full transition-colors ${form.is_active ? "bg-green-500" : "bg-ink-600"}`}>
          <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${form.is_active ? "translate-x-7" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* PDF upload */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">PDF File</label>
        <div className="bg-ink-800 border border-white/10 rounded-xl p-4">
          {form.pdf_url ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-green-400">PDF uploaded ✓</div>
                  <a href={form.pdf_url} target="_blank" rel="noreferrer"
                    className="text-xs text-brand-gold underline truncate block">Preview PDF</a>
                </div>
                <button onClick={() => setForm(f => ({ ...f, pdf_url: "" }))}
                  data-testid="remove-pdf"
                  className="text-red-400 hover:text-red-300 text-xs font-bold">
                  Remove
                </button>
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-full py-2 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5">
                {uploading ? "Uploading..." : "Replace with new PDF"}
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              data-testid="upload-pdf-btn"
              className="w-full py-8 rounded-lg border-2 border-dashed border-white/15 hover:border-brand-gold/50 hover:bg-brand-gold/5 transition-colors flex flex-col items-center gap-2">
              {uploading ? (
                <><Loader2 className="w-6 h-6 text-brand-gold animate-spin" /><span className="text-sm">Uploading PDF...</span></>
              ) : (
                <><Upload className="w-6 h-6 text-brand-gold" /><span className="text-sm font-bold">Click to upload PDF</span><span className="text-xs text-muted-foreground">Max 30 MB</span></>
              )}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Title</label>
        <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          data-testid="assessment-title-input"
          className="w-full bg-ink-800 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold/50"
          placeholder="Mind Health Workbook" />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Description</label>
        <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          data-testid="assessment-description-input"
          rows={3}
          className="w-full bg-ink-800 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold/50"
          placeholder="A short description shown on the assessment result page..." />
      </div>

      {/* Price */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Price (₹)</label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[200px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold font-bold">₹</span>
            <input type="number" value={form.price}
              onChange={(e) => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))}
              data-testid="assessment-price-input"
              className="w-full bg-ink-800 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-lg font-bold focus:outline-none focus:border-brand-gold/50" />
          </div>
          <div className="text-xs text-muted-foreground">
            Suggested: ₹99, ₹149, ₹199, ₹249
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex gap-3 pt-4 border-t border-white/[0.07]">
        <button onClick={handleSave} disabled={saving}
          data-testid="save-assessment-product"
          className="px-6 py-3 rounded-xl bg-gold-gradient text-ink-950 font-bold text-sm hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Status card */}
      <div className={`rounded-xl p-4 border ${form.is_active && form.pdf_url ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20"}`}>
        <div className="text-sm font-bold mb-1">
          {form.is_active && form.pdf_url ? "🟢 Live — customers can buy" : "🟠 Not live"}
        </div>
        <div className="text-xs text-muted-foreground">
          {form.is_active && form.pdf_url
            ? `Assessment result page shows: "Buy Workbook — ₹${form.price}"`
            : "Assessment result page shows: 'Coming soon'"}
        </div>
      </div>
    </div>
  );
}
