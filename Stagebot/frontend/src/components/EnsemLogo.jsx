// src/components/EnsemLogo.jsx
// Logo INP Ensem Lorraine en SVG

export default function EnsemLogo({ size = 40 }) {
  return (
    <svg width={size * 2.5} height={size} viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Triangle INP */}
      <polygon points="0,40 10,8 20,40" fill="#1a6bbd" />
      <polygon points="10,8 20,40 30,8" fill="#4a9fd4" />
      {/* INP text */}
      <text x="32" y="22" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700" fill="#1a3a5c">INP</text>
      <text x="32" y="34" fontFamily="Arial, sans-serif" fontSize="7" fill="#6b8caa">LORRAINE</text>
      {/* Ensem text */}
      <text x="72" y="30" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700" fill="#1a6bbd">Ensem</text>
    </svg>
  );
}
