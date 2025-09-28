import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useAnimationStore } from '@/stores/animationStore';
import { useThemeStore } from '@/stores/themeStore';
import { useGestureDetection } from '@/hooks/useGestureDetection';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { darkColors, lightColors } from './timelineColors';
import { SVGRendererManager } from '@/lib/SVGRendererManager';
import { drawTimeline } from './canvasDrawUtils';
import {
  DEFAULT_ZOOM,
  BASE_VIRTUAL_WIDTH,
  MIN_ZOOM,
  MAX_ZOOM,
  TIMELINE_BAR_HEIGHT,
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
          onClick={() => {
            if (isPlaying) {
              pause();
              SVGRendererManager.pause();
            } else {
              play();
              SVGRendererManager.play();
            }
          }}
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
  const { currentTime, seek, animations, updateAnimation } =
    useAnimationStore();
  const { theme } = useThemeStore();
  const colors = theme === 'dark' ? darkColors : lightColors;

  // Calculate virtual width based on zoom level
  const virtualWidth = BASE_VIRTUAL_WIDTH * zoomLevel;
  // Interactive elements for keyframes
  type InteractiveDiamond = {
    kind: 'start' | 'end';
    animationIndex: number;
    property: string;
    keyframeIndex: number;
    x: number;
    y: number;
    size: number;
  };

  type InteractiveLine = {
    kind: 'line';
    animationIndex: number;
    property: string;
    y: number;
    startX: number;
    endX: number;
  };

  const diamondSize = 8;
  const lineHeight = 20;

  const interactiveElements = useMemo(() => {
    // Build hit targets for diamonds and property lines
    const elements: Array<InteractiveDiamond | InteractiveLine> = [];

    const keyframeBaseY = TIMELINE_BAR_HEIGHT + TIMELINE_BAR_HEIGHT / 2 + 35;
    let currentRowIndex = 0;

    animations.forEach((animation, animationIndex) => {
      const params = animation.params || {};
      const animatableProps = [
        'rotate',
        'scale',
        'translateX',
        'translateY',
        'opacity',
        'x',
        'y',
        'width',
        'height',
      ];

      animatableProps.forEach(property => {
        if (params[property] === undefined) return;

        const currentY = keyframeBaseY + currentRowIndex * lineHeight;
        const propValue = params[property];

        let currentTimeAccum = animation.position || 0;
        let propStartX: number | null = null;

        if (Array.isArray(propValue)) {
          propValue.forEach((keyframe: any, keyframeIndex: number) => {
            if (typeof keyframe !== 'object' || keyframe === null) return;
            const kfDuration: number = keyframe.duration || 1000;
            const kfDelay: number = keyframe.delay || 0;

            const startTime = currentTimeAccum + kfDelay;
            const endTime = startTime + kfDuration;

            const startX =
              (startTime / TIMELINE_DURATION) * virtualWidth - scrollOffset;
            const endX =
              (endTime / TIMELINE_DURATION) * virtualWidth - scrollOffset;

            if (propStartX === null) propStartX = startX;

            elements.push({
              kind: 'line',
              animationIndex,
              property,
              y: currentY,
              startX: Math.min(startX, endX),
              endX: Math.max(startX, endX),
            });

            elements.push({
              kind: 'start',
              animationIndex,
              property,
              keyframeIndex,
              x: startX,
              y: currentY,
              size: diamondSize,
            });
            elements.push({
              kind: 'end',
              animationIndex,
              property,
              keyframeIndex,
              x: endX,
              y: currentY,
              size: diamondSize,
            });

            currentTimeAccum += kfDelay + kfDuration;
          });
        } else {
          // Single keyframe synthesized from duration
          // @ts-ignore
          const kfDuration: number = params.duration || 1000;
          const startTime = animation.position || 0;
          const endTime = startTime + kfDuration;
          const startX =
            (startTime / TIMELINE_DURATION) * virtualWidth - scrollOffset;
          const endX =
            (endTime / TIMELINE_DURATION) * virtualWidth - scrollOffset;
          propStartX = startX;
          elements.push({
            kind: 'line',
            animationIndex,
            property,
            y: currentY,
            startX,
            endX,
          });
          elements.push({
            kind: 'start',
            animationIndex,
            property,
            keyframeIndex: 0,
            x: startX,
            y: currentY,
            size: diamondSize,
          });
          elements.push({
            kind: 'end',
            animationIndex,
            property,
            keyframeIndex: 0,
            x: endX,
            y: currentY,
            size: diamondSize,
          });
        }

        currentRowIndex++;
      });
    });

    return elements;
  }, [animations, virtualWidth, scrollOffset]);

  // Compute total number of keyframe lines across animations
  const totalKeyframeLines = useMemo(() => {
    let count = 0;
    animations.forEach(animation => {
      const params = animation.params || {};
      const animatableProps = [
        'rotate',
        'scale',
        'translateX',
        'translateY',
        'opacity',
        'x',
        'y',
        'width',
        'height',
      ];
      animatableProps.forEach(property => {
        if (params[property] !== undefined) count++;
      });
    });
    return count;
  }, [animations]);

  // Dynamic timeline height: max(minSize, totalLines * lineHeight + topOffset)
  const topOffset = TIMELINE_BAR_HEIGHT + 35;
  const timelineHeight = Math.max(
    TIMELINE_HEIGHT,
    totalKeyframeLines * lineHeight + topOffset
  );
  // Drag state
  const [dragState, setDragState] = useState<
    | null
    | (
        | {
            mode: 'diamond-start' | 'diamond-end';
            element: InteractiveDiamond;
            mouseStartX: number;
            originalParams: any;
            // Times in ms for constraints
            minTime: number; // inclusive
            maxTime: number; // inclusive
            originalStartTime: number;
            originalEndTime: number;
            animationPosition: number;
            originalDuration: number;
            originalNextDelay: number;
          }
        | {
            mode: 'line';
            element: InteractiveLine;
            mouseStartX: number;
            originalParams: any;
            animationPosition: number;
            originalFirstDelay: number; // ms
            totalPropDuration: number; // ms including internal delays
          }
      )
  >(null);

  const pxToMs = useCallback(
    (deltaX: number) => (deltaX / virtualWidth) * TIMELINE_DURATION,
    [virtualWidth]
  );

  const msToX = useCallback(
    (time: number) => (time / TIMELINE_DURATION) * virtualWidth - scrollOffset,
    [virtualWidth, scrollOffset]
  );

  const getPropertyArray = (params: any, property: string): any[] | null => {
    if (!params) return null;
    const value = params[property];
    if (Array.isArray(value)) return value as any[];
    return null;
  };

  const computeKeyframeTimes = (
    animation: any,
    property: string
  ): Array<{
    start: number;
    end: number;
    delay: number;
    duration: number;
  }> => {
    const propArr = getPropertyArray(animation.params, property);
    const out: Array<{
      start: number;
      end: number;
      delay: number;
      duration: number;
    }> = [];
    let t = animation.position || 0;
    if (propArr) {
      for (const kf of propArr) {
        const dly = kf?.delay ?? 0;
        const dur = kf?.duration ?? 1000;
        const start = t + dly;
        const end = start + dur;
        out.push({ start, end, delay: dly, duration: dur });
        t = end;
      }
    } else {
      const dur = animation.params?.duration ?? 1000;
      const start = animation.position || 0;
      out.push({ start, end: start + dur, delay: 0, duration: dur });
    }
    return out;
  };

  const hitTest = (
    x: number,
    y: number
  ): InteractiveDiamond | InteractiveLine | null => {
    // Use canvas-local coordinates directly (drawing uses same baseline)
    // Prefer diamonds over lines when overlapping
    const diamondHit = interactiveElements.find(el => {
      if (el.kind === 'start' || el.kind === 'end') {
        const half = el.size / Math.SQRT2 / 2 + 3; // diamond rotated, approximate radius + padding
        return Math.abs(x - el.x) <= half && Math.abs(y - el.y) <= half;
      }
      return false;
    });
    if (diamondHit) return diamondHit as InteractiveDiamond;

    const lineHit = interactiveElements.find(el => {
      if (el.kind === 'line') {
        const verticalTolerance = 6;
        return (
          y >= el.y - verticalTolerance &&
          y <= el.y + verticalTolerance &&
          x >= Math.min(el.startX, el.endX) &&
          x <= Math.max(el.startX, el.endX)
        );
      }
      return false;
    });
    return (lineHit as InteractiveLine) || null;
  };

  const [isSeeking, setIsSeeking] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      const hit = hitTest(localX, localY);

      if (!hit) {
        // Begin seeking on empty space
        const x = localX + scrollOffset;
        const newTime = (x / virtualWidth) * TIMELINE_DURATION;
        const clampedTime = Math.max(0, Math.min(TIMELINE_DURATION, newTime));
        seek(clampedTime);
        SVGRendererManager.seek(clampedTime);
        setIsSeeking(true);
        return;
      }

      // Prepare dragging state
      if (hit.kind === 'start' || hit.kind === 'end') {
        setIsSeeking(false);
        const element = hit as InteractiveDiamond;
        const animation = animations[element.animationIndex];
        const times = computeKeyframeTimes(animation, element.property);
        const t = times[element.keyframeIndex];
        const prevEnd =
          element.keyframeIndex === 0
            ? animation.position || 0
            : times[element.keyframeIndex - 1].end;
        const nextStart =
          element.keyframeIndex < times.length - 1
            ? times[element.keyframeIndex + 1].start
            : TIMELINE_DURATION;

        const minDuration = 10; // ms minimal segment duration
        let minTime = 0;
        let maxTime = TIMELINE_DURATION;
        if (element.kind === 'start') {
          minTime = prevEnd;
          maxTime = t.end - minDuration;
        } else {
          // end diamond
          minTime = t.start + minDuration;
          maxTime = nextStart;
        }

        // capture original next delay (if next kf exists) so we can compensate when dragging end diamond
        let originalNextDelay = 0;
        const propArrAtDown = getPropertyArray(
          animation.params,
          element.property
        );
        if (propArrAtDown && element.keyframeIndex + 1 < propArrAtDown.length) {
          originalNextDelay =
            propArrAtDown[element.keyframeIndex + 1]?.delay ?? 0;
        }

        setDragState({
          mode: element.kind === 'start' ? 'diamond-start' : 'diamond-end',
          element,
          mouseStartX: localX,
          originalParams: JSON.parse(JSON.stringify(animation.params || {})),
          minTime,
          maxTime,
          originalStartTime: t.start,
          originalEndTime: t.end,
          animationPosition: animation.position || 0,
          originalDuration: t.end - t.start,
          originalNextDelay,
        });
      } else if (hit.kind === 'line') {
        setIsSeeking(false);
        const element = hit as InteractiveLine;
        const animation = animations[element.animationIndex];
        const times = computeKeyframeTimes(animation, element.property);
        const first = times[0];
        const last = times[times.length - 1];
        const totalPropDuration = last.end - (animation.position || 0);
        const firstDelay = first.start - (animation.position || 0);
        setDragState({
          mode: 'line',
          element,
          mouseStartX: localX,
          originalParams: JSON.parse(JSON.stringify(animation.params || {})),
          animationPosition: animation.position || 0,
          originalFirstDelay: firstDelay,
          totalPropDuration,
        });
      }
    },
    [animations, computeKeyframeTimes, msToX, seek, scrollOffset, virtualWidth]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      if (dragState) {
        const deltaX = localX - dragState.mouseStartX;
        const deltaMs = pxToMs(deltaX);
        const animIdx = (dragState as any).element.animationIndex;
        const property = (dragState as any).element.property;
        const originalParams = dragState.originalParams;
        const paramsClone = JSON.parse(JSON.stringify(originalParams));

        const applyUpdate = (newParams: any) => {
          updateAnimation(animIdx, { params: newParams });
        };

        if (
          dragState.mode === 'diamond-start' ||
          dragState.mode === 'diamond-end'
        ) {
          const element = (dragState as any).element as InteractiveDiamond;
          const newTimeRaw =
            (dragState.mode === 'diamond-start'
              ? dragState.originalStartTime
              : dragState.originalEndTime) + deltaMs;
          const newTime = Math.max(
            dragState.minTime,
            Math.min(dragState.maxTime, newTimeRaw)
          );

          const propArr = getPropertyArray(paramsClone, property);
          if (!propArr) {
            // single-value property: modify duration when moving end, or position/duration when moving start
            // const anim = animations[animIdx];
            if (dragState.mode === 'diamond-end') {
              const newDur = Math.max(
                1,
                Math.round(newTime - dragState.originalStartTime)
              );
              paramsClone.duration = newDur;
            } else {
              // move start: adjust duration to keep end fixed
              const endFixed = dragState.originalEndTime;
              const newDur = Math.max(1, Math.round(endFixed - newTime));
              // We emulate delay via position for single value; keep params as is, but cannot change position via updateAnimation here (we avoid as per spec)
              // Instead, we change duration only; moving start is not supported for single value beyond duration change.
              paramsClone.duration = newDur;
            }
            applyUpdate(paramsClone);
            return;
          }

          const kf = propArr[element.keyframeIndex] || {};
          const prevEnd =
            element.keyframeIndex === 0
              ? dragState.animationPosition
              : computeKeyframeTimes(
                  {
                    params: paramsClone,
                    position: dragState.animationPosition,
                  },
                  property
                )[element.keyframeIndex - 1].end;

          const startFixed = dragState.originalStartTime;
          const endFixed = dragState.originalEndTime;

          if (dragState.mode === 'diamond-start') {
            const newDelay = Math.max(0, Math.round(newTime - prevEnd));
            const newDuration = Math.max(1, Math.round(endFixed - newTime));
            kf.delay = newDelay;
            kf.duration = newDuration;
          } else {
            // end diamond moves: update duration only, and compensate next delay to keep next start fixed
            const newDuration = Math.max(1, Math.round(newTime - startFixed));
            const deltaDur = newDuration - (dragState as any).originalDuration;
            kf.duration = newDuration;
            const propArrLocal = propArr as any[];
            if (element.keyframeIndex + 1 < propArrLocal.length) {
              const nextKf = propArrLocal[element.keyframeIndex + 1] || {};
              const newNextDelay = Math.max(
                0,
                Math.round(
                  ((dragState as any).originalNextDelay ?? 0) - deltaDur
                )
              );
              nextKf.delay = newNextDelay;
              propArrLocal[element.keyframeIndex + 1] = nextKf;
            }
          }
          propArr[element.keyframeIndex] = kf;
          paramsClone[property] = propArr;
          applyUpdate(paramsClone);
        } else if (dragState.mode === 'line') {
          // Shift whole property line by changing first delay only
          const firstStartOriginal =
            dragState.animationPosition + dragState.originalFirstDelay;
          const newFirstStart = Math.max(
            dragState.animationPosition,
            Math.min(
              TIMELINE_DURATION - dragState.totalPropDuration,
              firstStartOriginal + deltaMs
            )
          );
          const newFirstDelay = Math.max(
            0,
            Math.round(newFirstStart - dragState.animationPosition)
          );

          const propArr = getPropertyArray(paramsClone, property);
          if (propArr) {
            if (!propArr[0]) propArr[0] = {};
            propArr[0].delay = newFirstDelay;
            paramsClone[property] = propArr;
          } else {
            // single value: change position equivalent via adding a synthetic delay is not possible; skip
          }
          applyUpdate(paramsClone);
        }
        return;
      }

      if (!dragState && isSeeking && e.buttons === 1) {
        const x = localX + scrollOffset;
        const newTime = (x / virtualWidth) * TIMELINE_DURATION;
        const clampedTime = Math.max(0, Math.min(TIMELINE_DURATION, newTime));
        seek(clampedTime);
        SVGRendererManager.seek(clampedTime);
        return;
      }

      // Update hover cursor
      const hit = hitTest(localX, localY);
      const canvasEl = canvasRef.current;
      if (canvasEl) {
        if (hit) {
          if ((hit as any).kind === 'line') {
            canvasEl.style.cursor = 'grab';
          } else {
            canvasEl.style.cursor = 'ew-resize';
          }
        } else {
          canvasEl.style.cursor = 'pointer';
        }
      }
    },
    [
      TIMELINE_DURATION,
      dragState,
      pxToMs,
      scrollOffset,
      seek,
      updateAnimation,
      animations,
      interactiveElements,
      isSeeking,
      virtualWidth,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setIsSeeking(false);
    const canvasEl = canvasRef.current;
    if (canvasEl) canvasEl.style.cursor = 'pointer';
  }, []);

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
      drawTimeline(
        canvas,
        currentTime,
        colors,
        scrollOffset,
        virtualWidth,
        animations
      );
    }
  }, [currentTime, theme, scrollOffset, virtualWidth, animations]);

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

      drawTimeline(
        canvas,
        currentTime,
        colors,
        scrollOffset,
        virtualWidth,
        animations
      );
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [currentTime, theme, scrollOffset, virtualWidth, canvasWidth, animations]);

  return (
    <div className="h-full border-t border-border bg-muted">
      <TimelineHeader />
      <div
        ref={scrollContainerRef}
        className="relative w-full overflow-x-auto overflow-y-auto"
        style={{ height: `${timelineHeight}px` }}
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
            height: `${timelineHeight}px`,
            width: `${Math.min(canvasWidth, window.innerWidth)}px`,
            maxWidth: `${canvasWidth}px`,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}
