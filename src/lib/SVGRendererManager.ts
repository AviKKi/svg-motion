import { useAnimationStore } from '@/stores/animationStore';
import { shallow } from 'zustand/shallow';

type NullableWindow = Window | null;

class _SVGRendererManager {
  private iframeWindow: NullableWindow = null;
  private isReady: boolean = false;
  private unsubscribeFns: Array<() => void> = [];
  private boundOnMessage = (e: MessageEvent) => this.onMessage(e);

  init(iframe: HTMLIFrameElement) {
    this.dispose();
    this.iframeWindow = iframe?.contentWindow ?? null;
    window.addEventListener('message', this.boundOnMessage);
    this.setupStoreSubscriptions();
    // Proactively handshake in case we missed initial ready event
    this.postMessage({ type: 'get-state' });
  }

  dispose() {
    window.removeEventListener('message', this.boundOnMessage);
    this.unsubscribeFns.forEach(fn => fn());
    this.unsubscribeFns = [];
    this.iframeWindow = null;
    this.isReady = false;
  }

  private postMessage(message: any) {
    this.iframeWindow?.postMessage(message, '*');
  }

  private onMessage(event: MessageEvent) {
    if (event.source !== this.iframeWindow) return;
    const { type, currentTime, path } = event.data || {};

    switch (type) {
      case 'iframe-ready': {
        this.isReady = true;
        this.pushInitialState();
        break;
      }

      case 'state-response': {
        this.isReady = true;
        this.pushInitialState();
        break;
      }

      case 'time-update': {
        const { isPlaying, setCurrentTime } = useAnimationStore.getState();
        if (isPlaying) {
          setCurrentTime(currentTime);
        }
        break;
      }

      case 'play-state-changed': {
        // Source of truth remains the store; ignore renderer-originated state changes
        break;
      }

      case 'svg-element-selected': {
        const { setSelectedSvgPath } = useAnimationStore.getState();
        setSelectedSvgPath(path ?? null);
        break;
      }
    }
  }

  private setupStoreSubscriptions() {
    const store = useAnimationStore;

    // Push animations to renderer when they change
    this.unsubscribeFns.push(
      store.subscribe(
        s => s.animations,
        animations => {
          if (this.isReady) {
            this.postMessage({ type: 'set-animations', data: { animations } });
          }
        },
        { equalityFn: shallow }
      )
    );

    // Push svg content when it changes
    this.unsubscribeFns.push(
      store.subscribe(
        s => s.svgContent,
        content => {
          if (this.isReady && content) {
            this.postMessage({ type: 'set-svg-content', data: { content } });
          }
        }
      )
    );

    // Control play/pause
    this.unsubscribeFns.push(
      store.subscribe(
        s => s.isPlaying,
        isPlaying => {
          if (this.isReady) {
            this.postMessage({ type: isPlaying ? 'play' : 'pause' });
          }
        }
      )
    );

    // Sync selection both ways: when the app selection changes, instruct iframe to select
    this.unsubscribeFns.push(
      store.subscribe(
        s => s.selectedSvgPath,
        selectedPath => {
          console.log('selectedPath', selectedPath);
          if (this.isReady) {
            this.postMessage({
              type: 'select-svg-path',
              data: { path: selectedPath },
            });
          }
        }
      )
    );
  }

  private pushInitialState() {
    const state = useAnimationStore.getState();
    if (state.svgContent) {
      this.postMessage({
        type: 'set-svg-content',
        data: { content: state.svgContent },
      });
    }
    if (state.animations && state.animations.length > 0) {
      this.postMessage({
        type: 'set-animations',
        data: { animations: state.animations },
      });
    }
    this.postMessage({ type: state.isPlaying ? 'play' : 'pause' });
  }

  seek(time: number) {
    if (!this.isReady) return;
    this.postMessage({ type: 'seek', data: { time } });
  }

  play() {
    if (!this.isReady) return;
    this.postMessage({ type: 'play' });
  }

  pause() {
    if (!this.isReady) return;
    this.postMessage({ type: 'pause' });
  }
}

export const SVGRendererManager = new _SVGRendererManager();
