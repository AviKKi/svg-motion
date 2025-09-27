import { useRef, useEffect, useCallback, useState } from 'react';
import { useAnimationStore } from '@/stores/animationStore';
import { useThemeStore } from '@/stores/themeStore';
import { useGestureDetection } from '@/hooks/useGestureDetection';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { darkColors, lightColors } from './timelineColors';
import { drawTimeline } from './canvasDrawUtils';
import {
  DEFAULT_ZOOM,
  BASE_VIRTUAL_WIDTH,
  MIN_ZOOM,
  MAX_ZOOM,
  TIMELINE_DURATION,
  TIMELINE_HEIGHT,
} from './constants';

function formatTime(timeMs: number): string {
  const totalMs = Math.floor(timeMs);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = Math.floor((totalMs % 1000) / 10); // Show only 2 decimal places for ms

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;
}

function TimelineHeader() {
  const { currentTime, isPlaying, play, pause } = useAnimationStore();
  return (
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
  );
}

export function AnimationTimeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [canvasWidth, setCanvasWidth] = useState(window.innerWidth);
  const { currentTime, seek } = useAnimationStore();
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
      <TimelineHeader />
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
