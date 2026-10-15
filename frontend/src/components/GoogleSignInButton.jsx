import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) { resolve(); return; }
    const existing = document.getElementById("google-gsi-script");
    if (existing) { existing.addEventListener("load", resolve); existing.addEventListener("error", reject); return; }
    const s = document.createElement("script");
    s.id = "google-gsi-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function GoogleSignInButton({ onSuccess }) {
  const { googleLogin } = useAuth();
  const boxRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !boxRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (resp) => {
          const r = await googleLogin(resp.credential);
          if (r.ok) onSuccess(r.user);
          else toast.error(r.error);
        },
      });
      window.google.accounts.id.renderButton(boxRef.current, {
        theme: "filled_black", size: "large", text: "continue_with", shape: "pill", width: 300,
      });
      setReady(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className="mb-4" data-testid="google-signin">
      <div className="flex justify-center min-h-[44px]" ref={boxRef} />
      {ready && (
        <div className="flex items-center gap-3 mt-4 text-[11px] text-muted-foreground">
          <div className="flex-1 h-px bg-white/[0.08]" /> or use email <div className="flex-1 h-px bg-white/[0.08]" />
        </div>
      )}
    </div>
  );
}
