/**
 * Connects animator agent with stores and UI
 */
import { useAnimationStore, type Animation } from '@/stores/animationStore';
import { useChatStore } from '@/stores/chatStore';

/**
 * used by agent to pull data
 */
export interface AgentPlug {
  getChatHistory: () => { role: 'user' | 'assistant'; content: string }[];
  getSVGCode: () => string;
  getAnimations: () => Animation[];
  getNamedNodes: () => Record<string, string>;
  setAnimations: (animations: Animation[]) => void;
}

export const agentPlug: AgentPlug = {
  getChatHistory: () => {
    const raw = useChatStore.getState().messages;
    return raw.map(m => ({ role: m.role, content: m.content }));
  },
  getSVGCode: () => {
    return useAnimationStore.getState().svgContent;
  },
  getAnimations: () => {
    return useAnimationStore.getState().animations;
  },
  getNamedNodes: () => {
    return useAnimationStore.getState().namedNodes;
  },
  setAnimations: (animations: Animation[]) => {
    return useAnimationStore.getState().setAnimations(animations);
  },
};
