// Helper function to convert OKLCH to hex
function oklchToHex(l: number, c: number, h: number): string {
  // Convert OKLCH to OKLab
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // Convert OKLab to linear RGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l_cubed = l_ * l_ * l_;
  const m_cubed = m_ * m_ * m_;
  const s_cubed = s_ * s_ * s_;

  let r =
    +4.0767416621 * l_cubed - 3.3077115913 * m_cubed + 0.2309699292 * s_cubed;
  let g =
    -1.2684380046 * l_cubed + 2.6097574011 * m_cubed - 0.3413193965 * s_cubed;
  let b_rgb =
    -0.0041960863 * l_cubed - 0.7034186147 * m_cubed + 1.707614701 * s_cubed;

  // Apply gamma correction (linear RGB to sRGB)
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b_rgb =
    b_rgb > 0.0031308
      ? 1.055 * Math.pow(b_rgb, 1 / 2.4) - 0.055
      : 12.92 * b_rgb;

  // Clamp to 0-1 range
  r = Math.max(0, Math.min(1, r));
  g = Math.max(0, Math.min(1, g));
  b_rgb = Math.max(0, Math.min(1, b_rgb));

  // Convert to 0-255 range and format as hex
  const rHex = Math.round(r * 255)
    .toString(16)
    .padStart(2, '0');
  const gHex = Math.round(g * 255)
    .toString(16)
    .padStart(2, '0');
  const bHex = Math.round(b_rgb * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

export type TimelineColors = {
  gridMajor: string;
  gridMinor: string;
  bar: string;
  label: string;
  tick: string;
  playhead: string;
  playheadHandle: string;
  shadow: string;
  keyframeLine: string;
  keyframeDiamond: string;
  keyframeLabel: string;
  background: string;
};

export const lightColors: TimelineColors = {
  gridMajor: '#e5e7eb', // gray-200
  gridMinor: '#e5e7eb80', // gray-200 @ 0.5
  bar: '#d1d5db', // gray-300
  label: '#6b7280', // gray-500
  tick: '#9ca3af', // gray-400
  playhead: '#111827', // gray-900
  playheadHandle: '#111827', // gray-900
  shadow: 'rgba(0, 0, 0, 0.1)',
  keyframeLine: '#7a40ed', // blue-500
  keyframeDiamond: '#7a40ed', // blue-600
  keyframeLabel: '#7a40ed', // blue-700
  background: oklchToHex(0.968, 0.007, 247.896), // --muted light theme: oklch(0.968 0.007 247.896)
};

export const darkColors: TimelineColors = {
  gridMajor: '#27272a', // zinc-800-ish
  gridMinor: '#27272a80', // zinc-800 @ 0.5
  bar: '#3f3f46', // zinc-700
  label: '#a1a1aa', // zinc-400
  tick: '#71717a', // zinc-500
  playhead: '#e5e7eb', // gray-200
  playheadHandle: '#111827', // gray-200
  shadow: 'rgba(0, 0, 0, 0.35)',
  keyframeLine: '#60a5fa', // blue-400
  keyframeDiamond: '#3b82f6', // blue-500
  keyframeLabel: '#93c5fd', // blue-300
  background: oklchToHex(0.279, 0.041, 260.031), // --muted dark theme: oklch(0.279 0.041 260.031)
};
