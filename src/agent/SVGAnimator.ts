import { agentPlug, type AgentPlug } from './SVGAnimatorConnector';
import { parseSvgToTree } from '@/utils/svgToTree';
import type { Animation } from '@/stores/animationStore';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, type ModelMessage } from 'ai';
import {
  buildSystemPrompt,
  buildUserPrompt,
  fewShot,
  type AgentPayload,
} from './prompts';

// Model and routing configuration
type ProviderRoutingPreferences = {
  order?: string[];
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  data_collection?: 'allow' | 'deny';
  only?: string[];
  ignore?: string[];
  quantizations?: (
    | 'int4'
    | 'int8'
    | 'fp4'
    | 'fp6'
    | 'fp8'
    | 'fp16'
    | 'bf16'
    | 'fp32'
    | 'unknown'
  )[];
  sort?: 'price' | 'throughput' | 'latency';
  max_price?: {
    prompt?: number | string;
    completion?: number | string;
    image?: number | string;
    audio?: number | string;
    request?: number | string;
  };
};
const MODEL_ID = 'qwen/qwen3-coder:nitro';
const PROVIDER_PREFERENCES: ProviderRoutingPreferences = {
  quantizations: ['fp8'], // 'fp16', 'bf16', 'fp32'],
  max_price: { completion: 4 },
  // sort: 'throughput', // optional; ':nitro' already prioritizes throughput
};
const DEFAULT_TEMPERATURE = 0.2;

const AnimatorAgentEvents = {
  DONE: 'DONE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
} as const;

class EventEmitter {
  private subscribers: ((
    event: keyof typeof AnimatorAgentEvents,
    payload?: any
  ) => void)[];
  constructor() {
    this.subscribers = [];
  }
  public subscribe(callback: (payload: any) => void) {
    this.subscribers.push(callback);
  }
  protected emit(event: keyof typeof AnimatorAgentEvents, payload?: any) {
    this.subscribers.forEach(subscriber => subscriber(event, payload));
  }
}

class SVGAnimator extends EventEmitter {
  // keeping placeholders in case future extensions are needed
  // @ts-ignore @todo build a planning phase later
  private aim: string;
  // @todo build chat history compression/summarization logic in future
  // private chatHistory: { role: 'user' | 'assistant'; content: string }[];
  // @todo build a project context in future
  // private projectContext: string;
  /** used to pull data from the stores */
  private pullPlug: AgentPlug;
  private model: string;

  constructor() {
    super();
    this.aim = '';
    // this.chatHistory = [];
    // this.projectContext = '';
    this.pullPlug = agentPlug;
    this.model = MODEL_ID;
  }

  private normalizeName(input: string): string {
    return String(input)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  private extractIdFromDisplayName(name: string): string | null {
    const match = String(name).match(/#([A-Za-z_][\w\-:\.]*)/);
    return match ? match[1] : null;
  }

  private buildNameIndex(payload: AgentPayload): {
    nameToPaths: Map<string, string[]>;
    idSet: Set<string>;
  } {
    const nameToPaths = new Map<string, string[]>();
    const idSet = new Set<string>();

    for (const [pathId, displayName] of Object.entries(
      payload.selectors || {}
    )) {
      const normalized = this.normalizeName(displayName);
      if (normalized) {
        const arr = nameToPaths.get(normalized) || [];
        arr.push(pathId);
        nameToPaths.set(normalized, arr);
      }
      const idFromName = this.extractIdFromDisplayName(displayName);
      if (idFromName) idSet.add(idFromName);
    }

    // Also index explicit namedNodes (in case selectors changed format later)
    for (const [pathId, friendly] of Object.entries(payload.namedNodes || {})) {
      const normalized = this.normalizeName(friendly);
      if (!normalized) continue;
      const arr = nameToPaths.get(normalized) || [];
      if (!arr.includes(pathId)) arr.push(pathId);
      nameToPaths.set(normalized, arr);
    }

    return { nameToPaths, idSet };
  }

  private resolveTargets(
    animations: Animation[],
    payload: AgentPayload
  ): Animation[] {
    const { nameToPaths, idSet } = this.buildNameIndex(payload);
    const cssPathByPathId = payload.cssPathByPathId || {};

    const mapToken = (token: string): string[] => {
      const t = token.trim();
      if (!t) return [];
      if (t === 'svg') return [t];

      const looksLikeComplexCss = /[\.>:\[\]]/.test(t);
      const isHash = t.startsWith('#');
      const hasSpace = /\s/.test(t);

      // If it's a simple valid id selector (e.g., #phone) and that id exists, keep as-is
      if (isHash && !hasSpace) {
        const rawId = t.slice(1);
        if (idSet.has(rawId)) return [t];
        // If id does not exist in SVG, fall through to name resolution
      }

      // Complex CSS (class, child, attribute) → trust model output
      if (looksLikeComplexCss && !isHash) {
        return [t];
      }

      // Treat token (with or without leading #) as a friendly name
      const friendly = isHash ? t.slice(1).trim() : t;
      const normalized = this.normalizeName(friendly);
      const paths = nameToPaths.get(normalized);
      if (paths && paths.length) {
        const selectors = paths
          .map(p => cssPathByPathId[p])
          .filter(Boolean) as string[];
        if (selectors.length) return selectors;
      }

      // Last resort: keep original token so downstream can attempt to resolve
      return [t];
    };

    return animations.map(anim => {
      try {
        const raw = anim.targets || '';
        const tokens = String(raw)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const mapped = tokens.flatMap(tok => mapToken(tok));
        // De-duplicate while preserving order
        const seen = new Set<string>();
        const unique = mapped.filter(sel => {
          if (seen.has(sel)) return false;
          seen.add(sel);
          return true;
        });
        return { ...anim, targets: unique.join(', ') };
      } catch {
        return anim;
      }
    });
  }

  private buildContext() {
    const svg = this.pullPlug.getSVGCode();
    const namedNodes = this.pullPlug.getNamedNodes();
    const currentAnimations = this.pullPlug.getAnimations();
    const tree = parseSvgToTree(svg);

    // Build a concise selectors map (path -> display name)
    const selectors: Record<string, string> = {};
    const cssPathByPathId: Record<string, string> = {};
    const visit = (nodes: any[], parentCssPath: string) => {
      for (const n of nodes) {
        const displayName = namedNodes[n.id] ?? n.name;
        selectors[n.id] = displayName;
        const selfIndex = Number(n.id.split('/').slice(-1)[0]);
        const segment = `${parentCssPath} > :nth-child(${selfIndex + 1})`;
        cssPathByPathId[n.id] = segment;
        if (n.children && n.children.length) visit(n.children, segment);
      }
    };
    if (tree && tree.length) {
      cssPathByPathId[tree[0].id] = 'svg';
      if (tree[0].children && tree[0].children.length) {
        tree[0].children.forEach((child: any) => visit([child], 'svg'));
      }
    }
    return {
      tree,
      selectors,
      cssPathByPathId,
      namedNodes,
      currentAnimations,
    } as AgentPayload;
  }

  private async callLLM(payload: any): Promise<any> {
    const apiKey = localStorage.getItem('openrouter-api-key') || '';
    if (!apiKey) {
      throw new Error('OpenRouter API key not set');
    }

    const openrouter = createOpenRouter({ apiKey });
    const history = this.pullPlug.getChatHistory();
    const messages: ModelMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
      ...fewShot(),
      ...history,
      { role: 'user', content: buildUserPrompt(payload) },
    ];
    const model = openrouter.chat(this.model, {
      provider: PROVIDER_PREFERENCES,
    });
    const response = await streamText({
      model,
      messages,
      temperature: DEFAULT_TEMPERATURE,
    });
    await response.consumeStream();
    return response.text;
  }

  // @todo build a planning phase later
  // private async plan() {}
  public async start() {
    try {
      const payload = this.buildContext();

      const raw = await this.callLLM(payload);
      // The model is instructed to return pure JSON. Attempt to parse.
      let animations: Animation[] = [];
      try {
        animations = JSON.parse(raw);
      } catch (_) {
        // Some models may wrap JSON in markdown; try to extract
        const match = String(raw).match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (match) {
          animations = JSON.parse(match[1]);
        } else {
          throw new Error('Failed to parse model JSON');
        }
      }

      // Post-process targets to resolve friendly names into stable selectors
      const processed = this.resolveTargets(animations, payload);

      // Push into store
      this.pullPlug.setAnimations(processed);
      this.emit(AnimatorAgentEvents.DONE, { ok: true });
    } catch (err) {
      console.error(err);
      this.emit(AnimatorAgentEvents.DONE, {
        ok: false,
        error: (err as Error).message,
      });
    }
  }
  public reset() {
    this.aim = '';
  }
}

export const svgAnimator = new SVGAnimator();

export default SVGAnimator;
