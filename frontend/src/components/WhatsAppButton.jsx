import React from "react";

// Number: +91 8439111502 (no spaces, no +, just digits)
const WHATSAPP_NUMBER = "918439111502";
const DEFAULT_MESSAGE = "Hi Vishnu, I have a question about your courses.";

export default function WhatsAppButton({ hidden = false }) {
  if (hidden) return null;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      data-testid="whatsapp-floating-btn"
      className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-[90] w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-full bg-[#25D366] hover:bg-[#1ebe57] shadow-lg shadow-[#25D366]/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
      style={{ boxShadow: "0 8px 28px rgba(37, 211, 102, 0.45)" }}
    >
      {/* Subtle pulse ring */}
      <span aria-hidden className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 animate-ping" style={{ animationDuration: "2.4s" }} />
      <svg viewBox="0 0 32 32" className="w-7 h-7 sm:w-8 sm:h-8 relative" fill="#ffffff" aria-hidden="true">
        <path d="M16 .5C7.44.5.5 7.44.5 16c0 2.83.74 5.49 2.04 7.79L.5 31.5l7.94-2.03A15.45 15.45 0 0 0 16 31.5C24.56 31.5 31.5 24.56 31.5 16S24.56.5 16 .5Zm0 28.16a12.6 12.6 0 0 1-6.43-1.77l-.46-.27-4.71 1.2 1.25-4.59-.3-.48A12.66 12.66 0 1 1 28.66 16 12.68 12.68 0 0 1 16 28.66Zm7.07-9.5c-.39-.2-2.31-1.14-2.66-1.27-.36-.13-.62-.2-.88.2-.26.39-1.02 1.27-1.25 1.53-.23.26-.46.29-.85.1-.39-.2-1.65-.61-3.14-1.94a11.79 11.79 0 0 1-2.17-2.7c-.23-.39-.02-.6.17-.79.18-.18.39-.46.59-.69.2-.23.26-.39.39-.65.13-.26.07-.49-.03-.69-.1-.2-.88-2.13-1.21-2.91-.32-.77-.65-.66-.88-.67h-.75c-.26 0-.69.1-1.05.49-.36.39-1.37 1.34-1.37 3.27 0 1.93 1.4 3.79 1.6 4.06.2.26 2.76 4.21 6.69 5.91 3.93 1.7 3.93 1.13 4.64 1.06.71-.07 2.31-.94 2.64-1.85.33-.91.33-1.69.23-1.85-.1-.16-.36-.26-.75-.46Z" />
      </svg>
    </a>
  );
}
