export type TimelineColors = {
  gridMajor: string;
  gridMinor: string;
  bar: string;
  label: string;
  tick: string;
  playhead: string;
  playheadHandle: string;
  shadow: string;
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
};
