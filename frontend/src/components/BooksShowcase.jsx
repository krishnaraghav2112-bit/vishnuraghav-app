import React, { useState } from "react";
import { ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const VISIBLE = 5; // books shown in the single row before "See All"

export default function BooksShowcase({ books, getCover, onBuySigned }) {
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? books : books.slice(0, VISIBLE);

  return (
    <div>
      <div
        className={
          showAll
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
            : "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3"
        }
        data-testid="books-row"
      >
        {list.map((b) => (
          <div
            key={b.slug}
            className={`${showAll ? "" : "w-[210px] flex-shrink-0 snap-start"} premium-card bg-ink-800 border border-white/[0.07] rounded-2xl overflow-hidden hover:shadow-2xl flex flex-col`}
          >
            <div className="h-56 relative overflow-hidden bg-ink-700">
              <img src={getCover(b)} alt={b.title} className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
              {b.badge && (
                <div className={`absolute top-2 left-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                  b.status === "upcoming" ? "bg-gradient-to-r from-red-700 to-red-900 text-white" : "bg-gold-gradient text-ink-950"
                }`}>{b.badge}</div>
              )}
              {b.price && b.price !== "Coming Soon" && (
                <div className="absolute top-2 right-2 bg-ink-950/80 border border-brand-gold/30 text-brand-gold text-[11px] font-bold px-2 py-0.5 rounded-md backdrop-blur">{b.price}</div>
              )}
            </div>
            <div className="p-3.5 flex flex-col flex-1">
              <h3 className="font-serif font-extrabold text-sm leading-tight truncate">{b.title}</h3>
              <div className="text-xs text-brand-gold italic mb-1 truncate">{b.hindi}</div>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {b.tagline}
              </p>
              <div className="mt-auto">
                {(b.amazon || b.flipkart) && (
                  <div className="flex gap-1.5 mb-1.5">
                    {b.amazon && (
                      <a href={b.amazon} target="_blank" rel="noopener noreferrer" data-testid={`book-amazon-${b.slug}`}
                        className="flex-1 py-1.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/25 hover:bg-orange-500/20 transition-colors text-center flex items-center justify-center gap-1">
                        <ShoppingCart className="w-3 h-3" /> Amazon
                      </a>
                    )}
                    {b.flipkart && (
                      <a href={b.flipkart} target="_blank" rel="noopener noreferrer" data-testid={`book-flipkart-${b.slug}`}
                        className="flex-1 py-1.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-center">
                        🛍️ Flipkart
                      </a>
                    )}
                  </div>
                )}
                {b.status !== "upcoming" ? (
                  <button onClick={() => onBuySigned(b)} data-testid={`book-signed-${b.slug}`}
                    className="w-full py-1.5 rounded-md text-[11px] font-bold bg-gold-gradient text-ink-950 hover:opacity-90 transition-opacity">
                    ✍️ Buy Signed Copy
                  </button>
                ) : (
                  <button onClick={() => toast.success("🔔 You'll be notified at launch!")} data-testid={`book-notify-${b.slug}`}
                    className="w-full py-1.5 rounded-md text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 transition-colors">
                    🔔 Notify Me
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {books.length > VISIBLE && (
        <div className="text-center mt-6">
          <button onClick={() => setShowAll(!showAll)} data-testid="books-see-all"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-brand-gold/40 text-brand-gold text-sm font-bold hover:bg-brand-gold/10">
            {showAll ? (<>Show Less <ChevronUp className="w-4 h-4" /></>) : (<>See All {books.length} Books <ChevronDown className="w-4 h-4" /></>)}
          </button>
        </div>
      )}
    </div>
  );
}
