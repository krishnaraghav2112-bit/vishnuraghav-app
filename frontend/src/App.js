import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import PayModal from "./components/PayModal";
import WhatsAppButton from "./components/WhatsAppButton";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CoursePlayer from "./pages/CoursePlayer";
import BlogPostPage from "./pages/BlogPostPage";
import AdminPanel from "./pages/AdminPanel";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import ResetPassword from "./pages/ResetPassword";

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

function AppShell() {
  useReveal();
  const location = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [payCourse, setPayCourse] = useState(null);

  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };
  const openPay = (course) => setPayCourse(course);

  return (
    <div className="App bg-ink-950 text-foreground min-h-screen">
      <Navbar onOpenAuth={openAuth} />
      <div className="pt-16">
        {/* Re-mount route subtree on path change to trigger page-enter animation */}
        <div key={location.pathname} className="page-enter">
          <Routes location={location}>
            <Route path="/" element={<Home onOpenAuth={openAuth} onOpenPay={openPay} />} />
            <Route path="/dashboard" element={<Dashboard onOpenAuth={openAuth} onOpenPay={openPay} />} />
            <Route path="/learn/:slug" element={<CoursePlayer onOpenAuth={openAuth} onOpenPay={openPay} />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/admin" element={<AdminPanel onOpenAuth={openAuth} />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </div>
      </div>
      <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} />
      <PayModal open={!!payCourse} course={payCourse} onClose={() => setPayCourse(null)} onOpenAuth={openAuth} />
      <WhatsAppButton hidden={!!payCourse} />
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
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
