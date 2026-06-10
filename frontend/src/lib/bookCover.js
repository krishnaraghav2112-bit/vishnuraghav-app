// Generate a literary book cover via inline SVG → data URI.
// Matches book-card style (Hindi+English title, author, publisher).
export function makeBookCover({ title, hindi, author = "विष्णु राघव", emoji, palette = ["#1a3a5c", "#2c5f8a"] }) {
  const [c1, c2] = palette;
  const id = Math.random().toString(36).slice(2, 8);
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 560' preserveAspectRatio='xMidYMid slice'>
  <defs>
    <linearGradient id='g${id}' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${c1}'/>
      <stop offset='1' stop-color='${c2}'/>
    </linearGradient>
    <linearGradient id='ov${id}' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='rgba(0,0,0,0.05)'/>
      <stop offset='1' stop-color='rgba(0,0,0,0.55)'/>
    </linearGradient>
    <pattern id='p${id}' x='0' y='0' width='40' height='40' patternUnits='userSpaceOnUse'>
      <circle cx='20' cy='20' r='1' fill='rgba(255,255,255,0.04)'/>
    </pattern>
  </defs>
  <rect width='400' height='560' fill='url(#g${id})'/>
  <rect width='400' height='560' fill='url(#p${id})'/>
  <rect width='400' height='560' fill='url(#ov${id})'/>
  <circle cx='200' cy='200' r='110' fill='rgba(255,255,255,0.04)'/>
  <text x='200' y='220' font-family='Georgia, serif' font-size='80' text-anchor='middle' fill='rgba(255,255,255,0.85)'>${emoji || "✦"}</text>
  <text x='200' y='300' font-family='Georgia, serif' font-size='30' font-weight='800' text-anchor='middle' fill='#f0d080'>${escapeXml(hindi)}</text>
  <text x='200' y='335' font-family='Plus Jakarta Sans, sans-serif' font-size='17' font-weight='600' text-anchor='middle' fill='rgba(255,255,255,0.85)'>${escapeXml(title)}</text>
  <line x1='130' y1='365' x2='270' y2='365' stroke='rgba(201,168,76,0.5)' stroke-width='1'/>
  <text x='200' y='395' font-family='Plus Jakarta Sans, sans-serif' font-size='15' font-weight='700' text-anchor='middle' fill='#c9a84c'>${escapeXml(author)}</text>
  <text x='200' y='420' font-family='Plus Jakarta Sans, sans-serif' font-size='11' fill='rgba(255,255,255,0.5)' text-anchor='middle'>BlueRose ONE Publishers</text>
</svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s = "") {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function makeAuthorPortrait() {
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>
  <defs>
    <radialGradient id='ag' cx='50%' cy='40%' r='60%'>
      <stop offset='0' stop-color='#2a2048'/>
      <stop offset='1' stop-color='#060510'/>
    </radialGradient>
    <radialGradient id='glow' cx='50%' cy='42%' r='35%'>
      <stop offset='0' stop-color='rgba(201,168,76,0.35)'/>
      <stop offset='1' stop-color='transparent'/>
    </radialGradient>
  </defs>
  <rect width='400' height='400' fill='url(#ag)'/>
  <rect width='400' height='400' fill='url(#glow)'/>
  <g opacity='0.06' stroke='#c9a84c' stroke-width='0.5'>
    ${Array.from({ length: 13 }, (_, i) => `<line x1='${i * 30}' y1='0' x2='${i * 30}' y2='400'/><line x1='0' y1='${i * 30}' x2='400' y2='${i * 30}'/>`).join("")}
  </g>
  <circle cx='200' cy='160' r='72' fill='rgba(201,168,76,0.18)'/>
  <circle cx='200' cy='160' r='56' fill='rgba(201,168,76,0.32)'/>
  <text x='200' y='190' font-size='80' text-anchor='middle' fill='rgba(255,255,255,0.9)' font-family='serif'>✍︎</text>
  <rect x='80' y='260' width='240' height='60' rx='10' fill='rgba(201,168,76,0.12)' stroke='rgba(201,168,76,0.35)'/>
  <text x='200' y='285' font-family='Fraunces, Georgia, serif' font-size='22' font-weight='800' text-anchor='middle' fill='#f0d080'>Vishnu Raghav</text>
  <text x='200' y='305' font-family='Plus Jakarta Sans, sans-serif' font-size='12' text-anchor='middle' fill='rgba(255,255,255,0.65)'>Author · Educator · Life Coach</text>
  <text x='200' y='345' font-family='Plus Jakarta Sans, sans-serif' font-size='11' text-anchor='middle' fill='rgba(201,168,76,0.55)'>vishnuraghav.in</text>
</svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
