import { useEffect, useRef, useState } from "react";
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import PayModal from "./components/PayModal";
import WhatsAppButton from "./components/WhatsAppButton";
import PhoneRequiredModal from "./components/PhoneRequiredModal";
import { track } from "./lib/pixel";
import { captureAttribution } from "./lib/attribution";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CoursePlayer from "./pages/CoursePlayer";
import BlogPostPage from "./pages/BlogPostPage";
import AdminPanel from "./pages/AdminPanel";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import ResetPassword from "./pages/ResetPassword";
import BookCheckout from "./pages/BookCheckout";
import SelfAssessment from "./pages/SelfAssessment";
import BuyEbook from "./pages/BuyEbook";
import EbookLanding from "./pages/EbookLanding";
import OverthinkingLanding from "./pages/OverthinkingLanding";
import ThankYou from "./pages/ThankYou";

// Ad landing pages: no top menu, no global WhatsApp bubble
const BARE_PAGES = ["/overthinking", "/thank-you"];

function useReveal() {
  useEffect(() => {
    const observed = new WeakSet();
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.05, rootMargin: "0px 0px -10% 0px" }
    );
    const scan = () => {
      document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
        if (!observed.has(el)) { observed.add(el); io.observe(el); }
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

// First PageView is sent by index.html; this sends one on every later page change
function usePixelPageViews(pathname) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    track("PageView");
  }, [pathname]);
}

function AppShell() {
  useReveal();
  const location = useLocation();
  usePixelPageViews(location.pathname);
  useEffect(() => { captureAttribution(); }, [location.search]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [payCourse, setPayCourse] = useState(null);
  const bare = BARE_PAGES.includes(location.pathname);

  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };
  const openPay = (course) => setPayCourse(course);

  return (
    <div className="App bg-ink-950 text-foreground min-h-screen">
      {!bare && <Navbar onOpenAuth={openAuth} />}
      <div className={bare ? "" : "pt-16"}>
        <div key={location.pathname} className="page-enter">
          <Routes location={location}>
            <Route path="/" element={<Home onOpenAuth={openAuth} onOpenPay={openPay} />} />
            <Route path="/dashboard" element={<Dashboard onOpenAuth={openAuth} onOpenPay={openPay} />} />
            <Route path="/book-checkout" element={<BookCheckout onOpenAuth={openAuth} />} />
            <Route path="/learn/:slug" element={<CoursePlayer onOpenAuth={openAuth} onOpenPay={openPay} />} />
            <Route path="/self-assessment" element={<SelfAssessment onOpenAuth={openAuth} />} />
            <Route path="/buy-ebook" element={<BuyEbook onOpenAuth={openAuth} />} />
            <Route path="/uljha-jeevan" element={<EbookLanding />} />
            <Route path="/overthinking" element={<OverthinkingLanding onOpenPay={openPay} />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/admin" element={<AdminPanel onOpenAuth={openAuth} />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </div>
      </div>
      <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
      <PhoneRequiredModal />
      <PayModal key={payCourse?.slug || "closed"} open={!!payCourse} course={payCourse} onClose={() => setPayCourse(null)} onOpenAuth={openAuth} />
      <WhatsAppButton hidden={!!payCourse || bare} />
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: { background: "#0c0b18", border: "1px solid rgba(201,168,76,0.3)", color: "#f2f0fa" },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
    <AuthProvider>
      <BrowserRouter>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </BrowserRouter>
    </AuthProvider>
  </HelmetProvider>
  );
}

export default App;
