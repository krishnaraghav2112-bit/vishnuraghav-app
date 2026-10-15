// Meta Pixel helper. Does nothing until the Pixel ID is set in public/index.html.
export function track(event, params = {}, eventID) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventID) window.fbq("track", event, params, { eventID });
  else window.fbq("track", event, params);
}
