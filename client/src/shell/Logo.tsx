/** Emblème ORBE : un astre doré et son orbite. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="ORBE">
      <defs>
        <radialGradient id="orbe-b"><stop offset="0" stopColor="#1F2956" /><stop offset="1" stopColor="#090C20" /></radialGradient>
        <radialGradient id="orbe-s" cx=".38" cy=".34" r=".75"><stop offset="0" stopColor="#FFECAA" /><stop offset=".5" stopColor="#F2C14E" /><stop offset="1" stopColor="#BE6E28" /></radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30.7" fill="url(#orbe-b)" />
      <g transform="rotate(-28 32 32)"><path d="M8.3 32a23.7 8.6 0 0 1 47.4 0" fill="none" stroke="#7FD1FF" strokeWidth="1.6" /></g>
      <circle cx="32" cy="32" r="13.8" fill="url(#orbe-s)" />
      <g transform="rotate(-28 32 32)"><path d="M55.7 32a23.7 8.6 0 0 1-47.4 0" fill="none" stroke="#7FD1FF" strokeWidth="1.6" /><circle cx="50" cy="38.4" r="2.6" fill="#EEF1FA" /></g>
    </svg>
  );
}
