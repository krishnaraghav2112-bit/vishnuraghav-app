import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Youtube, Menu, X, LayoutDashboard, ShoppingCart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar({ onOpenAuth }) {
  const { user } = useAuth();
  const { totalItems, items } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const onHome = loc.pathname === "/";

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  const goSection = (id) => {
    setOpen(false);
    if (!onHome) {
      nav("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 80);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      data-testid="main-nav"
      className={`fixed top-0 left-0 right-0 z-50 transition-all border-b ${
        scrolled ? "bg-ink-950/95 backdrop-blur-2xl border-white/[0.08]" : "bg-ink-950/70 backdrop-blur-lg border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-3.5 flex items-center justify-between">
        <Link to="/" data-testid="logo-link" className="font-serif font-black tracking-tight text-lg">
          Vishnu <span className="text-gold-gradient italic">Raghav</span>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {[
            ["Courses", "courses"],
            ["Books", "books"],
            ["About", "about"],
            ["YouTube", "youtube"],
            ["Blog", "blog"],
            ["Contact", "contact"],
          ].map(([label, id]) => (
            <button
              key={id}
              onClick={() => goSection(id)}
              data-testid={`nav-${id}`}
              className="text-muted-foreground text-sm hover:text-foreground transition-colors relative group"
            >
              {label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-gold group-hover:w-full transition-all" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <button
              onClick={() => nav("/book-checkout")}
              data-testid="nav-cart"
              aria-label="View cart"
              className="relative flex items-center justify-center w-8 h-8 rounded-md border border-brand-gold/30 bg-brand-goldSoft text-brand-gold hover:bg-brand-gold/15 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-brand-gold text-ink-950 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {totalItems}
              </span>
            </button>
          )}
          <div id="google_translate_element" className="notranslate"></div>
          <a
            href="https://youtube.com/@vishnuraghav"
            target="_blank"
          rel="noopener noreferrer"
            data-testid="nav-yt"
            className="hidden sm:flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-opacity"
          >
            <Youtube className="w-3.5 h-3.5" /> YouTube
          </a>
          {!user ? (
            <>
              <button
                onClick={() => onOpenAuth("login")}
                data-testid="nav-signin"
                className="hidden sm:block text-muted-foreground text-sm px-3 py-1.5 rounded-md border border-white/[0.08] hover:text-foreground hover:border-brand-gold transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth("register")}
                data-testid="nav-getstarted"
                className="bg-gold-gradient text-ink-950 px-4 py-1.5 rounded-md text-sm font-extrabold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-gold/30 transition-all"
              >
                Get Started
              </button>
            </>
          ) : (
            <>
              {user.role === "admin" && (
                <button
                  onClick={() => nav("/admin")}
                  data-testid="nav-admin"
                  className="hidden sm:flex items-center gap-1.5 bg-brand-purpleSoft border border-brand-purple/30 text-brand-purpleLight rounded-md px-3 py-1.5 text-xs font-bold hover:bg-brand-purple/20 transition-colors"
                >
                  Admin
                </button>
              )}
              <button
                onClick={() => nav("/dashboard")}
                data-testid="nav-dashboard"
                className="flex items-center gap-2 bg-brand-goldSoft border border-brand-gold/30 text-brand-gold rounded-md px-3 py-1.5 text-xs font-bold hover:bg-brand-gold/15 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-gold-gradient text-ink-950 flex items-center justify-center text-[10px] font-black">
                  {initials}
                </span>
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            </>
          )}
          <button
            onClick={() => setOpen(!open)}
            data-testid="mobile-menu-toggle"
            className="lg:hidden p-1.5 text-muted-foreground"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/[0.08] bg-ink-950/95 backdrop-blur-xl px-5 py-4 space-y-2">
          {[
            ["Courses", "courses"],
            ["Books", "books"],
            ["About", "about"],
            ["YouTube", "youtube"],
            ["Blog", "blog"],
            ["Contact", "contact"],
          ].map(([label, id]) => (
            <button
              key={id}
              onClick={() => goSection(id)}
              data-testid={`nav-mobile-${id}`}
              className="block w-full text-left text-sm text-muted-foreground hover:text-foreground py-2"
            >
              {label}
            </button>
          ))}
          {!user && (
            <button
              onClick={() => { setOpen(false); onOpenAuth("login"); }}
              data-testid="nav-mobile-signin"
              className="block w-full text-left text-sm text-brand-gold py-2"
            >
              Sign In
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
