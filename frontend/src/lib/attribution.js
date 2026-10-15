// Remembers which ad / link brought the visitor (last click wins, kept 30 days)
const KEY = "vr_attr";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function captureAttribution() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found = {};
    FIELDS.forEach((f) => { const v = params.get(f); if (v) found[f] = v; });
    if (!Object.keys(found).length) return;
    const existing = getAttribution();
    // A reminder email shouldn't erase the ad that first brought the buyer
    if (found.utm_medium === "reminder" && existing && existing.utm_medium !== "reminder") {
      localStorage.setItem(KEY, JSON.stringify({ ...existing, recovered_by: "email_reminder" }));
      return;
    }
    localStorage.setItem(KEY, JSON.stringify({
      ...found,
      landing_page: window.location.pathname,
      referrer: document.referrer || "",
      first_seen: new Date().toISOString(),
    }));
  } catch { /* storage blocked: ignore */ }
}

export function getAttribution() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!a || Date.now() - new Date(a.first_seen).getTime() > MAX_AGE_MS) return undefined;
    return a;
  } catch {
    return undefined;
  }
}
