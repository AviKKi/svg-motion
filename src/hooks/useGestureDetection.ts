import { useCallback, useEffect, useRef } from 'react';

export interface GestureCallbacks {
  onZoom?: (delta: number, centerX?: number) => void;
}

export interface GestureOptions {
  enablePinch?: boolean;
  enableWheel?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

const DEFAULT_OPTIONS: Required<GestureOptions> = {
  enablePinch: true,
  enableWheel: true,
  minZoom: 0.1,
  maxZoom: 10,
};

export function useGestureDetection(
  elementRef: React.RefObject<HTMLElement | null>,
  callbacks: GestureCallbacks,
  options: GestureOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lastTouchDistance = useRef<number | null>(null);
  const isGesturing = useRef(false);

  // Calculate distance between two touches
  const getTouchDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;

    const touch1 = touches[0];
    const touch2 = touches[1];

    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;

    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Get center point between two touches
  const getTouchCenter = useCallback(
    (touches: TouchList): { x: number; y: number } => {
      if (touches.length < 2) return { x: 0, y: 0 };

      const touch1 = touches[0];
      const touch2 = touches[1];

      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    },
    []
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!opts.enablePinch || e.touches.length !== 2) return;

      e.preventDefault();
      isGesturing.current = true;
      lastTouchDistance.current = getTouchDistance(e.touches);
    },
    [opts.enablePinch, getTouchDistance]
  );

  // Handle touch move (pinch zoom)
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!opts.enablePinch || !isGesturing.current || e.touches.length !== 2)
        return;

      e.preventDefault();

      const currentDistance = getTouchDistance(e.touches);
      const lastDistance = lastTouchDistance.current;

      if (lastDistance && currentDistance > 0) {
        const scale = currentDistance / lastDistance;
        const zoomDelta = scale - 1; // Positive for zoom in, negative for zoom out

        // Get center point relative to the element
        const element = elementRef.current;
        if (element && callbacks.onZoom) {
          const rect = element.getBoundingClientRect();
          const center = getTouchCenter(e.touches);
          const centerX = center.x - rect.left;

          callbacks.onZoom(zoomDelta, centerX);
        }
      }

      lastTouchDistance.current = currentDistance;
    },
    [opts.enablePinch, getTouchDistance, getTouchCenter, elementRef, callbacks]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!opts.enablePinch) return;

      if (e.touches.length < 2) {
        isGesturing.current = false;
        lastTouchDistance.current = null;
      }
    },
    [opts.enablePinch]
  );

  // Handle wheel (ctrl + scroll)
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!opts.enableWheel || !e.ctrlKey) return;

      e.preventDefault();

      // Normalize wheel delta across different browsers/devices
      const delta = -e.deltaY / 1000; // Negative because wheel up should zoom in

      // Get mouse position relative to the element
      const element = elementRef.current;
      if (element && callbacks.onZoom) {
        const rect = element.getBoundingClientRect();
        const centerX = e.clientX - rect.left;

        callbacks.onZoom(delta, centerX);
      }
    },
    [opts.enableWheel, elementRef, callbacks]
  );

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Touch events for pinch zoom
    if (opts.enablePinch) {
      element.addEventListener('touchstart', handleTouchStart, {
        passive: false,
      });
      element.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      element.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    // Wheel events for ctrl+scroll zoom
    if (opts.enableWheel) {
      element.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (opts.enablePinch) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      }

      if (opts.enableWheel) {
        element.removeEventListener('wheel', handleWheel);
      }
    };
  }, [
    elementRef,
    opts.enablePinch,
    opts.enableWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
  ]);

  return {
    isGesturing: isGesturing.current,
  };
}
