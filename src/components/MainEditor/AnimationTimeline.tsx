import { useRef, useEffect, useCallback } from 'react'
import { useAnimationStore } from '../../stores/animationStore'

const TIMELINE_HEIGHT = 80
const TIMELINE_BAR_HEIGHT = 1
const PLAYHEAD_SIZE = 16
const TIMELINE_DURATION = 6000 // 6 seconds in ms
const PIXELS_PER_SECOND = 100 // Scale factor

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  _width: number,
  height: number,
  timelineY: number
) {
  ctx.strokeStyle = '#e5e5e5'
  ctx.lineWidth = 1
  
  for (let i = 0; i <= 6; i++) {
    const x = i * PIXELS_PER_SECOND
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    
    // Draw minor grid lines (0.2s intervals)
    for (let j = 1; j < 5; j++) {
      const minorX = x + (j * PIXELS_PER_SECOND / 5)
      ctx.beginPath()
      ctx.moveTo(minorX, timelineY - 10)
      ctx.lineTo(minorX, timelineY + TIMELINE_BAR_HEIGHT + 10)
      ctx.stroke()
    }
  }
}

/** Divider seperating time markers from the timeline bar */
function drawTimelineBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  timelineY: number
) {
  // Draw timeline bar shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  
  // Draw timeline bar with rounded corners
  ctx.fillStyle = '#d1d5db'
  ctx.beginPath()
  ctx.roundRect(0, timelineY, width, TIMELINE_BAR_HEIGHT, 6)
  ctx.fill()
}

function drawTimeLabels(
  ctx: CanvasRenderingContext2D,
  timelineY: number
) {
  ctx.fillStyle = '#9ca3af'
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  
  for (let i = 0; i <= 6; i++) {
    const x = i * PIXELS_PER_SECOND
    const label = i === 0 ? '0' : `${i}s`
    ctx.fillText(label, x, timelineY + TIMELINE_BAR_HEIGHT + 8)
  }
}

function drawTickMarks(
  ctx: CanvasRenderingContext2D,
  timelineY: number
) {
  ctx.fillStyle = '#9ca3af'
  
  for (let i = 0; i <= 6; i++) {
    const x = i * PIXELS_PER_SECOND
    for (let j = 1; j < 5; j++) {
      const tickX = x + (j * PIXELS_PER_SECOND / 5)
      ctx.beginPath()
      ctx.arc(tickX, timelineY - 4, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timelineY: number,
  currentTime: number
) {
  const playheadX = (currentTime / TIMELINE_DURATION) * width
  
  // Draw playhead line from top to bottom
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(playheadX, 6)
  ctx.lineTo(playheadX, height)
  ctx.stroke()
  
  // Draw playhead handle (pointing downward)
  ctx.fillStyle = '#111111'
  ctx.beginPath()
  ctx.moveTo(playheadX, timelineY - 4)
  ctx.lineTo(playheadX - PLAYHEAD_SIZE / 2, timelineY - 4 - PLAYHEAD_SIZE / 2)
  ctx.lineTo(playheadX + PLAYHEAD_SIZE / 2, timelineY - 4 - PLAYHEAD_SIZE / 2)
  ctx.closePath()
  ctx.fill()
  
  // Add rounded corners to the handle
  ctx.fillStyle = '#111111'
  ctx.beginPath()
  ctx.roundRect(
    playheadX - PLAYHEAD_SIZE / 2, 
    timelineY - 12  - PLAYHEAD_SIZE / 2, 
    PLAYHEAD_SIZE, 
    PLAYHEAD_SIZE / 2, 
    1
  )
  ctx.fill()
}

function drawTimeline(
  canvas: HTMLCanvasElement,
  currentTime: number
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  const timelineY = TIMELINE_BAR_HEIGHT /2
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height)
  
  // Draw all components
  drawGridLines(ctx, width, height, timelineY)
  drawTimelineBar(ctx, width, PLAYHEAD_SIZE + 8)
  drawTimeLabels(ctx, timelineY)
  drawTickMarks(ctx, timelineY)
  drawPlayhead(ctx, width, height, timelineY+25, currentTime)
}

export function AnimationTimeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentTime, seek } = useAnimationStore()

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newTime = (x / canvas.width) * TIMELINE_DURATION
    const clampedTime = Math.max(0, Math.min(TIMELINE_DURATION, newTime))
    
    seek(clampedTime)
  }, [seek])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons === 1) { // Left mouse button is pressed
      handleMouseDown(e)
    }
  }, [handleMouseDown])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      drawTimeline(canvas, currentTime)
    }
  }, [currentTime])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      }
      
      drawTimeline(canvas, currentTime)
    })

    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <div className="h-full border-t bg-gray-50">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        style={{ height: `${TIMELINE_HEIGHT}px` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      />
    </div>
  )
}
