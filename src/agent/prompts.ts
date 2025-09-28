import type { Animation } from '@/stores/animationStore';

export type AgentPayload = {
  tree: any[];
  selectors: Record<string, string>; // pathId -> friendly name or tag#id.class
  cssPathByPathId: Record<string, string>; // pathId -> css selector from svg root using :nth-child
  namedNodes: Record<string, string>; // pathId -> user-provided friendly name (if any)
  currentAnimations: Animation[]; // current timeline animations to consider and update
};

export function buildSystemPrompt(): string {
  return [
    'You are an expert SVG animation generator for anime.js timelines.',
    'Respond with STRICT JSON ONLY. No prose, no markdown fences.',
    'Output must be a valid JSON array of Animation objects. No trailing commas.',
    '',
    'TypeScript types to conform to:',
    'type Keyframe = { to: any; ease?: string | { type: "spring"; [k: string]: any }; duration: number; delay?: number };',
    'type Animation = { targets: string; params: Record<string, Keyframe[] | Keyframe>; position: number };',
    '',
    'Targets rules (critical):',
    '- The SVG is injected into an iframe, and anime.js will query within that SVG. Use VALID CSS SELECTORS that resolve inside the injected <svg>.',
    '- Prefer #id when unique.',
    '- Else prefer .class, optionally chained with tag, like "g.chart .bar".',
    '- If neither id/class is reliable, use the provided cssPathByPathId[pathId], which is a full CSS path from the <svg> root using :nth-child. This is guaranteed to resolve.',
    '- To select multiple nodes, use comma-separated selector lists (e.g., "#ring1, #ring2").',
    '',
    'Params rules:',
    '- Use animatable properties supported by anime.js for SVG: opacity, translateX, translateY, x, y, rotate, scale, fill, stroke, strokeWidth, transformOrigin.',
    '- Each property can be an array of Keyframe objects (for keyframes) or a single Keyframe object.',
    '- Durations and delays are milliseconds. Keep values reasonable (100–1500ms typical).',
    '- For ease, use strings like "linear", "easeInOutSine", or a spring object: {"type":"spring","stiffness":120,"damping":12}.',
    '',
    'Position:',
    '- position is the start time in milliseconds on the timeline.',
    '',
    'Input Context Provided:',
    '- You will receive JSON with: { tree, selectors, cssPathByPathId, namedNodes, currentAnimations }.',
    '- tree: a nested list of elements with id (path id like "0/2/1") and name (e.g., "g#icon.primary").',
    '- selectors: map of path id -> a readable label (friendly name if user provided, else tag/id/class summary).',
    '- cssPathByPathId: map of path id -> stable CSS selector path from <svg> root using :nth-child.',
    '- namedNodes: user-defined friendly names by path id (useful to resolve user references like "Phone Icon").',
    '- currentAnimations: the current timeline array. Treat this as the starting point to update/extend.',
    '',
    'Selector Selection Guidance:',
    '- If a pathId in selectors maps to a human name like "Phone Icon" and you can infer a unique #id from the tree (e.g., "#phone"), prefer that.',
    '- Otherwise directly use cssPathByPathId[pathId].',
    '',
    'Output Contract (critical):',
    '- You must return the FULL updated Animation[] for the timeline, not just deltas.',
    '- Start from currentAnimations and modify/append to satisfy the user request.',
    '- Preserve existing entries unless they clearly conflict with the user instruction, in which case replace or adjust them.',
    '- Ensure targets are valid selectors as per rules above.',
    '',
    'STRICT OUTPUT FORMAT:',
    '- Output ONLY the JSON array: Animation[]. No wrapper object, no explanations.',
  ].join('\n');
}

export function buildUserPrompt(payload: AgentPayload): string {
  return [
    'User messages follow. Then context describing the SVG structure is provided.',
    '',
    'SVG Context:',
    JSON.stringify(payload, null, 2),
    '',
    'Please return the COMPLETE updated Animation[] (starting from currentAnimations) that fulfills the latest user instruction. JSON only.',
  ].join('\n');
}

export function fewShot(): { role: 'user' | 'assistant'; content: string }[] {
  const demoUser = [
    'Example user message:',
    'Make the phone icon ring twice with a subtle rotate and then fade the waves.',
  ].join('\n');

  const demoAssistant = JSON.stringify(
    [
      {
        targets: '#phone',
        params: {
          rotate: [
            { to: 15, ease: 'easeInOutSine', duration: 200 },
            { to: -15, ease: 'easeInOutSine', duration: 200 },
            { to: 0, ease: 'easeInOutSine', duration: 200 },
          ],
        },
        position: 0,
      },
      {
        targets: '#wave1, #wave2',
        params: {
          opacity: [
            { to: 0.3, ease: 'linear', duration: 300 },
            { to: 0.0, ease: 'linear', duration: 300 },
          ],
        },
        position: 200,
      },
    ],
    null,
    2
  );

  return [
    { role: 'user', content: demoUser },
    { role: 'assistant', content: demoAssistant },
  ];
}
