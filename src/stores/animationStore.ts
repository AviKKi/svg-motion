// Spring configurations are now passed as plain objects to be serializable
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Animation {
  targets: any; // animejs.Targets
  params: any; // Animatable properties & Tween parameters & Playback settings
  position: number; // time in ms
}

interface AnimationStoreState {
  svgUri: string; // url of the svg
  svgContent: string; // svg code in string
  svgName: string; // display name of the svg
  currentTime: number; // ms offset of playhead
  isPlaying: boolean;
  animations: Animation[];
}

interface AnimationState extends AnimationStoreState {
  // Actions
  setSvgUri: (uri: string) => void;
  setSvgContent: (content: string) => void;
  setSvgName: (name: string) => void;
  clearSvg: () => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  addAnimation: (animation: Animation) => void;
  removeAnimation: (index: number) => void;
  updateAnimation: (index: number, animation: Partial<Animation>) => void;
  clearAnimations: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
}

// const initialState: AnimationStoreState = {
//   svgUri: '',
//   svgContent: '',
//   svgName: '',
//   currentTime: 0,
//   isPlaying: false,
//   animations: [],
// }
/**
 * 
 * here are a few updates, based on format of
animation, a single animation can have multiple types of animation, x, rotate, y etc.

It is grouped based on selector not a single animation type; so with single animation you can draw multiple rows

Also for a single property along with start and end, we can have any number of keyframes as this is 
 */
// Quick-swappable test state to validate animation plumbing
export const testState: AnimationStoreState = {
  svgUri: '/sampleSvg/phone-call.svg',
  svgContent:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-phone-call"><path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
  svgName: 'phone-call',
  currentTime: 0,
  isPlaying: false,
  animations: [
    {
      targets: '.feather-phone-call',
      params: {
        rotate: [
          { to: 0, ease: 'inOut(3)', duration: 200 },
          { to: 360, ease: { type: 'spring', stiffness: 300 } },
        ],
        x: [
          { to: 0, duration: 200, delay: 200 },
          { to: 100, duration: 200, delay: 200 },
        ],
      },
      position: 0,
    },
  ],
};
export const useAnimationStore = create<AnimationState>()(
  persist(
    (set, _get) => ({
      ...testState,

      setSvgUri: (uri: string) => {
        set({ svgUri: uri });
      },

      setSvgContent: (content: string) => {
        set({ svgContent: content });
      },

      setSvgName: (name: string) => {
        set({ svgName: name });
      },

      clearSvg: () => {
        set({ svgUri: '', svgContent: '', svgName: '' });
      },

      setCurrentTime: (time: number) => {
        set({ currentTime: time });
      },

      setIsPlaying: (playing: boolean) => {
        set({ isPlaying: playing });
      },

      addAnimation: (animation: Animation) => {
        set(state => ({
          animations: [...state.animations, animation],
        }));
      },

      removeAnimation: (index: number) => {
        set(state => ({
          animations: state.animations.filter((_, i) => i !== index),
        }));
      },

      updateAnimation: (index: number, animation: Partial<Animation>) => {
        set(state => ({
          animations: state.animations.map((anim, i) =>
            i === index ? { ...anim, ...animation } : anim
          ),
        }));
      },

      clearAnimations: () => {
        set({ animations: [] });
      },

      play: () => {
        set({ isPlaying: true });
      },

      pause: () => {
        set({ isPlaying: false });
      },

      stop: () => {
        set({ isPlaying: false, currentTime: 0 });
      },

      seek: (time: number) => {
        set({ currentTime: time });
      },
    }),
    {
      name: 'animation-storage',
      // Only persist certain fields, not the entire state
      partialize: state => ({
        svgUri: state.svgUri,
        svgContent: state.svgContent,
        svgName: state.svgName,
        animations: state.animations,
      }),
    }
  )
);
