import { create } from 'zustand';
import { svgAnimator } from '@/agent/SVGAnimator';

const STORAGE_KEY = 'svg-motion:chat:messages:v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

type SerializableMessage = Omit<Message, 'timestamp'> & { timestamp: string };

function loadMessagesFromStorage(): Message[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SerializableMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
}

function saveMessagesToStorage(messages: Message[]): void {
  if (!isBrowser()) return;
  try {
    const serializable: SerializableMessage[] = messages.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // ignore write errors
  }
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  sendMessage: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: loadMessagesFromStorage(),
  isLoading: false,
  error: null,

  addMessage: message => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    set(state => {
      const updated = [...state.messages, newMessage];
      saveMessagesToStorage(updated);
      return { messages: updated };
    });
  },

  setLoading: loading => {
    set({ isLoading: loading });
  },

  setError: error => {
    set({ error });
  },

  clearMessages: () => {
    saveMessagesToStorage([]);
    set({ messages: [], error: null });
  },

  sendMessage: async (content: string) => {
    const { addMessage, setLoading, setError } = get();

    // Add user message
    addMessage({ content, role: 'user' });

    setLoading(true);
    setError(null);

    try {
      await svgAnimator.start();
      // For UX, reflect that agent processed the message
      addMessage({
        content: 'Generated animations from your request.',
        role: 'assistant',
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  },
}));
