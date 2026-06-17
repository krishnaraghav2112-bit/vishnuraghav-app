import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import api from "../lib/api";
import { Helmet } from "react-helmet-async";

export default function BlogPostPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [post, setPost] = useState(null);

  useEffect(() => {
    api.get(`/blog/${encodeURIComponent(slug)}`).then((r) => setPost(r.data)).catch(() => {});
  }, [slug]);

  if (!post) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
<>
  <Helmet>
<title>{post.title} | Vishnu Raghav</title>
<meta name="description" content={post.excerpt} />
<meta property="og:title" content={post.title} />
<meta property="og:image" content={post.image} />
</Helmet>
    <article className="max-w-3xl mx-auto px-5 lg:px-10 py-12" data-testid="blog-post-page">
      <button onClick={() => nav(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-2xl h-80 mb-7 flex items-center justify-center" style={{ background: `linear-gradient(135...`}}>
    {post.image ? (
        <img src={post.image} alt={post.title} className="w-full h-full object-contain rounded-2xl" />
    ) : (
        <div className="text-7xl">📖</div>
    )}
</div>

      <div className="inline-block bg-brand-goldSoft border border-brand-gold/30 text-brand-gold text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">{post.category}</div>
      <h1 className="font-serif text-3xl lg:text-4xl font-black tracking-tight mb-3">{post.title}</h1>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-8">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.read_min} min read</span>
      </div>
      <div className="prose prose-invert max-w-none">
        <p className="text-base text-muted-foreground italic leading-relaxed mb-6 border-l-2 border-brand-gold pl-4">{post.excerpt}</p>
        <div className="text-base leading-relaxed whitespace-pre-line">{post.body}</div>
      </div>

      <div className="mt-12 p-6 bg-ink-900 border border-brand-gold/20 rounded-2xl text-center">
        <h3 className="font-serif text-lg font-extrabold mb-2">Liked this article?</h3>
        <p className="text-sm text-muted-foreground mb-4">Subscribe to get a fresh idea every Monday.</p>
        <button onClick={() => { nav("/"); setTimeout(() => document.getElementById("blog")?.scrollIntoView({ behavior: "smooth" }), 60); }}
          className="bg-gold-gradient text-ink-950 px-5 py-2.5 rounded-lg text-sm font-extrabold">
          More Articles →
        </button>
      </div>
    </article>
  </>
  );
}
