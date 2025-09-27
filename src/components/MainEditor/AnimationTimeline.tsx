import { useRef, useEffect, useCallback, useState } from 'react';
import { useAnimationStore } from '../../stores/animationStore';
import { useThemeStore } from '../../stores/themeStore';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TIMELINE_HEIGHT = 80;
const TIMELINE_BAR_HEIGHT = 1;
const PLAYHEAD_SIZE = 16;
const TIMELINE_DURATION = 6000; // 6 seconds in ms
const VIRTUAL_WIDTH = 2000; // Total virtual width for scrolling

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
  scrollOffset: number = 0
) {
  ctx.lineWidth = 1;
  const pixelsPerSecond = VIRTUAL_WIDTH / (TIMELINE_DURATION / 1000); // Calculate based on virtual width

  // Calculate visible range based on scroll offset
  const startTime = (scrollOffset / VIRTUAL_WIDTH) * TIMELINE_DURATION;
  const endTime = ((scrollOffset + width) / VIRTUAL_WIDTH) * TIMELINE_DURATION;

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
  scrollOffset: number = 0
) {
  // Draw timeline bar shadow
  ctx.fillStyle = colors.shadow;

  // Draw timeline bar with rounded corners - extend beyond viewport to avoid gaps
  ctx.fillStyle = colors.bar;
  ctx.beginPath();
  ctx.roundRect(
    -scrollOffset,
    timelineY,
    VIRTUAL_WIDTH,
    TIMELINE_BAR_HEIGHT,
    6
  );
  ctx.fill();
}

function drawTimeLabels(
  ctx: CanvasRenderingContext2D,
  width: number,
  timelineY: number,
  colors: TimelineColors,
  scrollOffset: number = 0
) {
  ctx.fillStyle = colors.label;
  ctx.font =
    '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const pixelsPerSecond = VIRTUAL_WIDTH / (TIMELINE_DURATION / 1000); // Calculate based on virtual width

  // Calculate visible range based on scroll offset
  const startTime = (scrollOffset / VIRTUAL_WIDTH) * TIMELINE_DURATION;
  const endTime = ((scrollOffset + width) / VIRTUAL_WIDTH) * TIMELINE_DURATION;

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
  scrollOffset: number = 0
) {
  ctx.fillStyle = colors.tick;
  const pixelsPerSecond = VIRTUAL_WIDTH / (TIMELINE_DURATION / 1000); // Calculate based on virtual width

  // Calculate visible range based on scroll offset
  const startTime = (scrollOffset / VIRTUAL_WIDTH) * TIMELINE_DURATION;
  const endTime = ((scrollOffset + width) / VIRTUAL_WIDTH) * TIMELINE_DURATION;

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
  scrollOffset: number = 0
) {
  const playheadX =
    (currentTime / TIMELINE_DURATION) * VIRTUAL_WIDTH - scrollOffset;

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
  scrollOffset: number = 0
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const timelineY = TIMELINE_BAR_HEIGHT / 2;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw all components with scroll offset
  drawGridLines(ctx, width, height, timelineY, colors, scrollOffset);
  drawTimelineBar(ctx, width, PLAYHEAD_SIZE + 8, colors, scrollOffset);
  drawTimeLabels(ctx, width, timelineY, colors, scrollOffset);
  drawTickMarks(ctx, width, timelineY, colors, scrollOffset);
  drawPlayhead(
    ctx,
    width,
    height,
    timelineY + 25,
    currentTime,
    colors,
    scrollOffset
  );
}

export function AnimationTimeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { currentTime, isPlaying, seek, play, pause } = useAnimationStore();
  const { theme } = useThemeStore();
  const colors = theme === 'dark' ? darkColors : lightColors;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollOffset; // Account for scroll offset
      const newTime = (x / VIRTUAL_WIDTH) * TIMELINE_DURATION;
      const clampedTime = Math.max(0, Math.min(TIMELINE_DURATION, newTime));

      seek(clampedTime);
    },
    [seek, scrollOffset]
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      drawTimeline(canvas, currentTime, colors, scrollOffset);
    }
  }, [currentTime, theme, scrollOffset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }

      drawTimeline(canvas, currentTime, colors, scrollOffset);
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [currentTime, theme, scrollOffset]);

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
            width: `${VIRTUAL_WIDTH}px`,
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
            width: '100%',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        />
      </div>
    </div>
  );
}
