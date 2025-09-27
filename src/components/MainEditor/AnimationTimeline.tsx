import { useRef, useEffect, useCallback, useState } from 'react';
import { useAnimationStore } from '../../stores/animationStore';
import { useThemeStore } from '../../stores/themeStore';
import { useGestureDetection } from '../../hooks/useGestureDetection';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIMELINE_HEIGHT = 80;
const TIMELINE_BAR_HEIGHT = 1;
const PLAYHEAD_SIZE = 16;
const TIMELINE_DURATION = 6000; // 6 seconds in ms
const BASE_VIRTUAL_WIDTH = 2000; // Base virtual width for scrolling
const MIN_ZOOM = 0.1; // 10x zoom out
const MAX_ZOOM = 5.0; // 5x zoom in
const DEFAULT_ZOOM = 1.0;

function formatTime(timeMs: number): string {
  const totalMs = Math.floor(timeMs);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = Math.floor((totalMs % 1000) / 10); // Show only 2 decimal places for ms

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;
}

type TimelineColors = {
  gridMajor: string;
  gridMinor: string;
  bar: string;
  label: string;
  tick: string;
  playhead: string;
  playheadHandle: string;
  shadow: string;
};

const lightColors: TimelineColors = {
  gridMajor: '#e5e7eb', // gray-200
  gridMinor: '#e5e7eb80', // gray-200 @ 0.5
  bar: '#d1d5db', // gray-300
  label: '#6b7280', // gray-500
  tick: '#9ca3af', // gray-400
  playhead: '#111827', // gray-900
  playheadHandle: '#111827', // gray-900
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const darkColors: TimelineColors = {
  gridMajor: '#27272a', // zinc-800-ish
  gridMinor: '#27272a80', // zinc-800 @ 0.5
  bar: '#3f3f46', // zinc-700
  label: '#a1a1aa', // zinc-400
  tick: '#71717a', // zinc-500
  playhead: '#e5e7eb', // gray-200
  playheadHandle: '#111827', // gray-200
  shadow: 'rgba(0, 0, 0, 0.35)',
};

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timelineY: number,
  colors: TimelineColors,
  scrollOffset: number = 0,
  virtualWidth: number
) {
  ctx.lineWidth = 1;
  const pixelsPerSecond = virtualWidth / (TIMELINE_DURATION / 1000); // Calculate based on virtual width

  // Calculate visible range based on scroll offset
  const startTime = (scrollOffset / virtualWidth) * TIMELINE_DURATION;
  const endTime = ((scrollOffset + width) / virtualWidth) * TIMELINE_DURATION;

  const startSecond = Math.floor(startTime / 1000);
  const endSecond = Math.ceil(endTime / 1000) + 1;

  for (let i = startSecond; i <= Math.min(endSecond, 6); i++) {
    const x = i * pixelsPerSecond - scrollOffset;

    // Only draw if line is visible in viewport
    if (x >= -1 && x <= width + 1) {
      // Major line
      ctx.strokeStyle = colors.gridMajor;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Minor grid lines (0.2s intervals)
      ctx.strokeStyle = colors.gridMinor;
      for (let j = 1; j < 5; j++) {
        const minorX = x + (j * pixelsPerSecond) / 5;
        if (minorX >= -1 && minorX <= width + 1) {
          ctx.beginPath();
          ctx.moveTo(minorX, timelineY - 10);
          ctx.lineTo(minorX, timelineY + TIMELINE_BAR_HEIGHT + 10);
          ctx.stroke();
        }
      }
    }
  }
}

/** Divider seperating time markers from the timeline bar */
function drawTimelineBar(
  ctx: CanvasRenderingContext2D,
  _width: number,
  timelineY: number,
  colors: TimelineColors,
  scrollOffset: number = 0,
  virtualWidth: number
) {
  // Draw timeline bar shadow
  ctx.fillStyle = colors.shadow;

  // Draw timeline bar with rounded corners - extend beyond viewport to avoid gaps
  ctx.fillStyle = colors.bar;
  ctx.beginPath();
  ctx.roundRect(-scrollOffset, timelineY, virtualWidth, TIMELINE_BAR_HEIGHT, 6);
  ctx.fill();
}

function drawTimeLabels(
  ctx: CanvasRenderingContext2D,
  width: number,
  timelineY: number,
  colors: TimelineColors,
  scrollOffset: number = 0,
  virtualWidth: number
) {
  ctx.fillStyle = colors.label;
  ctx.font =
    '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const pixelsPerSecond = virtualWidth / (TIMELINE_DURATION / 1000); // Calculate based on virtual width

  // Calculate visible range based on scroll offset
  const startTime = (scrollOffset / virtualWidth) * TIMELINE_DURATION;
  const endTime = ((scrollOffset + width) / virtualWidth) * TIMELINE_DURATION;

  const startSecond = Math.floor(startTime / 1000);
  const endSecond = Math.ceil(endTime / 1000) + 1;

  for (let i = startSecond; i <= Math.min(endSecond, 6); i++) {
    const x = i * pixelsPerSecond - scrollOffset;

    // Only draw if label is visible in viewport
    if (x >= -50 && x <= width + 50) {
      // Extra margin for text
      const label = i === 0 ? '0' : `${i}s`;
      ctx.fillText(label, x, timelineY + TIMELINE_BAR_HEIGHT + 8);
    }
  }
}

function drawTickMarks(
  ctx: CanvasRenderingContext2D,
  width: number,
  timelineY: number,
  colors: TimelineColors,
  scrollOffset: number = 0,
  virtualWidth: number
) {
  ctx.fillStyle = colors.tick;
  const pixelsPerSecond = virtualWidth / (TIMELINE_DURATION / 1000); // Calculate based on virtual width

  // Calculate visible range based on scroll offset
  const startTime = (scrollOffset / virtualWidth) * TIMELINE_DURATION;
  const endTime = ((scrollOffset + width) / virtualWidth) * TIMELINE_DURATION;

  const startSecond = Math.floor(startTime / 1000);
  const endSecond = Math.ceil(endTime / 1000) + 1;

  for (let i = startSecond; i <= Math.min(endSecond, 6); i++) {
    const x = i * pixelsPerSecond - scrollOffset;

    for (let j = 1; j < 5; j++) {
      const tickX = x + (j * pixelsPerSecond) / 5;

      // Only draw if tick is visible in viewport
      if (tickX >= -10 && tickX <= width + 10) {
        ctx.beginPath();
        ctx.arc(tickX, timelineY - 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timelineY: number,
  currentTime: number,
  colors: TimelineColors,
  scrollOffset: number = 0,
  virtualWidth: number
) {
  const playheadX =
    (currentTime / TIMELINE_DURATION) * virtualWidth - scrollOffset;

  // Only draw playhead if it's visible in viewport
  if (playheadX >= -PLAYHEAD_SIZE && playheadX <= width + PLAYHEAD_SIZE) {
    // Draw playhead line from top to bottom
    ctx.strokeStyle = colors.playhead;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playheadX, 6);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Draw playhead handle (pointing downward)
    ctx.fillStyle = colors.playheadHandle;
    ctx.beginPath();
    ctx.moveTo(playheadX, timelineY - 4);
    ctx.lineTo(
      playheadX - PLAYHEAD_SIZE / 2,
      timelineY - 4 - PLAYHEAD_SIZE / 2
    );
    ctx.lineTo(
      playheadX + PLAYHEAD_SIZE / 2,
      timelineY - 4 - PLAYHEAD_SIZE / 2
    );
    ctx.closePath();
    ctx.fill();

    // Add rounded corners to the handle
    ctx.fillStyle = colors.playheadHandle;
    ctx.beginPath();
    ctx.roundRect(
      playheadX - PLAYHEAD_SIZE / 2,
      timelineY - 18 - PLAYHEAD_SIZE / 2,
      PLAYHEAD_SIZE,
      PLAYHEAD_SIZE / 2 + 8,
      3
    );
    ctx.fill();
  }
}

function drawTimeline(
  canvas: HTMLCanvasElement,
  currentTime: number,
  colors: TimelineColors,
  scrollOffset: number = 0,
  virtualWidth: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const timelineY = TIMELINE_BAR_HEIGHT / 2;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw all components with scroll offset
  drawGridLines(
    ctx,
    width,
    height,
    timelineY,
    colors,
    scrollOffset,
    virtualWidth
  );
  drawTimelineBar(
    ctx,
    width,
    PLAYHEAD_SIZE + 8,
    colors,
    scrollOffset,
    virtualWidth
  );
  drawTimeLabels(ctx, width, timelineY, colors, scrollOffset, virtualWidth);
  drawTickMarks(ctx, width, timelineY, colors, scrollOffset, virtualWidth);
  drawPlayhead(
    ctx,
    width,
    height,
    timelineY + 25,
    currentTime,
    colors,
    scrollOffset,
    virtualWidth
  );
}

export function AnimationTimeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth);
  const { currentTime, isPlaying, seek, play, pause } = useAnimationStore();
  const { theme } = useThemeStore();
  const colors = theme === 'dark' ? darkColors : lightColors;

  // Calculate virtual width based on zoom level
  const virtualWidth = BASE_VIRTUAL_WIDTH * zoomLevel;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollOffset; // Account for scroll offset
      const newTime = (x / virtualWidth) * TIMELINE_DURATION;
      const clampedTime = Math.max(0, Math.min(TIMELINE_DURATION, newTime));

      seek(clampedTime);
    },
    [seek, scrollOffset, virtualWidth]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.buttons === 1) {
        // Left mouse button is pressed
        handleMouseDown(e);
      }
    },
    [handleMouseDown]
  );

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    setScrollOffset(scrollLeft);
  }, []);

  // Handle zoom events
  const handleZoom = useCallback(
    (zoomDelta: number, centerX?: number) => {
      setZoomLevel(prevZoom => {
        const newZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, prevZoom + zoomDelta)
        );

        // If we have a center point, adjust scroll to zoom around that point
        if (centerX !== undefined && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const oldVirtualWidth = BASE_VIRTUAL_WIDTH * prevZoom;
          const newVirtualWidth = BASE_VIRTUAL_WIDTH * newZoom;

          // Calculate the time position at the zoom center
          const timeAtCenter =
            ((scrollOffset + centerX) / oldVirtualWidth) * TIMELINE_DURATION;

          // Calculate new scroll position to keep the same time at the center
          const newScrollOffset =
            (timeAtCenter / TIMELINE_DURATION) * newVirtualWidth - centerX;

          // Update scroll position after a brief delay to allow virtual width update
          setTimeout(() => {
            container.scrollLeft = Math.max(0, newScrollOffset);
          }, 0);
        }

        return newZoom;
      });
    },
    [scrollOffset]
  );

  // Initialize gesture detection
  useGestureDetection(
    scrollContainerRef as React.RefObject<HTMLElement>,
    { onZoom: handleZoom },
    { minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM }
  );

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setCanvasWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawTimeline(canvas, currentTime, colors, scrollOffset, virtualWidth);
    }
  }, [currentTime, theme, scrollOffset, virtualWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      // Limit canvas width to window width or container width, whichever is smaller
      const effectiveWidth = Math.min(canvasWidth, rect.width);

      canvas.width = effectiveWidth * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${effectiveWidth}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }

      drawTimeline(canvas, currentTime, colors, scrollOffset, virtualWidth);
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [currentTime, theme, scrollOffset, virtualWidth, canvasWidth]);

  return (
    <div className="h-full border-t border-border bg-muted">
      <div className="flex items-center justify-between py-2 border-b border-border px-2">
        <div className="flex items-center gap-3">
          <Button
            className="h-7 w-7"
            size="icon"
            onClick={() => (isPlaying ? pause() : play())}
          >
            {isPlaying ? (
              <Pause width={14} height={14} />
            ) : (
              <Play width={14} height={14} />
            )}
          </Button>
          <div className="text-sm font-mono text-muted-foreground">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        className="relative w-full overflow-x-auto overflow-y-hidden"
        style={{ height: `${TIMELINE_HEIGHT}px` }}
        onScroll={handleScroll}
      >
        {/* Virtual scrolling div to enable horizontal scrolling */}
        <div
          style={{
            width: `${virtualWidth}px`,
            height: '1px',
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 h-full cursor-pointer"
          style={{
            height: `${TIMELINE_HEIGHT}px`,
            width: `${Math.min(canvasWidth, window.innerWidth)}px`,
            maxWidth: `${canvasWidth}px`,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        />
      </div>
    </div>
  );
}
