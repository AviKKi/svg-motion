import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Animation {
  targets: any // animejs.Targets
  params: any // Animatable properties & Tween parameters & Playback settings
  position: number // time in ms
}

interface AnimationState {
  svgUri: string // url of the svg
  svgContent: string // svg code in string
  currentTime: number // ms offset of playhead
  isPlaying: boolean
  animations: Animation[]
  
  // Actions
  setSvgUri: (uri: string) => void
  setSvgContent: (content: string) => void
  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  addAnimation: (animation: Animation) => void
  removeAnimation: (index: number) => void
  updateAnimation: (index: number, animation: Partial<Animation>) => void
  clearAnimations: () => void
  play: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
}

export const useAnimationStore = create<AnimationState>()(
  persist(
    (set, get) => ({
      svgUri: '',
      svgContent: '',
      currentTime: 0,
      isPlaying: false,
      animations: [],

      setSvgUri: (uri: string) => {
        set({ svgUri: uri })
      },

      setSvgContent: (content: string) => {
        set({ svgContent: content })
      },

      setCurrentTime: (time: number) => {
        set({ currentTime: time })
      },

      setIsPlaying: (playing: boolean) => {
        set({ isPlaying: playing })
      },

      addAnimation: (animation: Animation) => {
        set((state) => ({
          animations: [...state.animations, animation]
        }))
      },

      removeAnimation: (index: number) => {
        set((state) => ({
          animations: state.animations.filter((_, i) => i !== index)
        }))
      },

      updateAnimation: (index: number, animation: Partial<Animation>) => {
        set((state) => ({
          animations: state.animations.map((anim, i) => 
            i === index ? { ...anim, ...animation } : anim
          )
        }))
      },

      clearAnimations: () => {
        set({ animations: [] })
      },

      play: () => {
        set({ isPlaying: true })
      },

      pause: () => {
        set({ isPlaying: false })
      },

      stop: () => {
        set({ isPlaying: false, currentTime: 0 })
      },

      seek: (time: number) => {
        set({ currentTime: time })
      },
    }),
    {
      name: 'animation-storage',
      // Only persist certain fields, not the entire state
      partialize: (state) => ({
        svgUri: state.svgUri,
        svgContent: state.svgContent,
        animations: state.animations,
      }),
    }
  )
)
