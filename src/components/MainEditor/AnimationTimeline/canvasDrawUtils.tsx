import { type TimelineColors } from './timelineColors';
import { type Animation } from '@/stores/animationStore';
import {
  TIMELINE_DURATION,
  TIMELINE_BAR_HEIGHT,
  PLAYHEAD_SIZE,
} from './constants';

// Helper function to extract duration from animation params
function extractAnimationDuration(animation: Animation): number {
  const params = animation.params;

  // Check for direct duration property
  if (typeof params.duration === 'number') {
    return params.duration;
  }

  // Check for array of keyframes with durations
  if (Array.isArray(params.duration)) {
    return params.duration.reduce(
      (total: number, dur: number) => total + dur,
      0
    );
  }

  // Check for property-specific durations (e.g., rotate: [{ duration: 200 }, { duration: 800 }])
  for (const [, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      const totalDuration = value.reduce((total, keyframe) => {
        if (typeof keyframe === 'object' && keyframe.duration) {
          return total + keyframe.duration;
        }
        return total;
      }, 0);
      if (totalDuration > 0) return totalDuration;
    }
  }

  // Default duration if none found
  return 1000;
}

// Helper function to extract animated properties with their keyframes
function extractAnimatedProperties(animation: Animation): Array<{
  property: string;
  keyframes: Array<{ time: number; duration: number }>;
}> {
  const params = animation.params;
  const properties: Array<{
    property: string;
    keyframes: Array<{ time: number; duration: number }>;
  }> = [];

  // Common animatable properties
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

  for (const prop of animatableProps) {
    if (params[prop] !== undefined) {
      const keyframes: Array<{ time: number; duration: number }> = [];
      const propValue = params[prop];

      if (Array.isArray(propValue)) {
        // Handle array of keyframes
        let currentTime = animation.position || 0;

        propValue.forEach(keyframe => {
          if (typeof keyframe === 'object' && keyframe !== null) {
            const duration = keyframe.duration || 1000;
            const delay = keyframe.delay || 0;

            keyframes.push({
              time: currentTime + delay,
              duration: duration,
            });

            currentTime += delay + duration;
          }
        });
      } else {
        // Handle single value - create a single keyframe
        const duration = params.duration || 1000;
        keyframes.push({
          time: animation.position || 0,
          duration: duration,
        });
      }

      if (keyframes.length > 0) {
        properties.push({
          property: prop,
          keyframes: keyframes,
        });
      }
    }
  }

  return properties.length > 0
    ? properties
    : [
        {
          property: 'animation',
          keyframes: [
            {
              time: animation.position || 0,
              duration: extractAnimationDuration(animation),
            },
          ],
        },
      ];
}

// Draw diamond shape (square rotated 45 degrees)
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fillColor: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4); // Rotate 45 degrees
  ctx.fillStyle = fillColor;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
}

// Helper function to draw text with background
function drawTextWithBackground(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  textColor: string,
  backgroundColor: string,
  padding: number = 2
) {
  // Measure text
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = 12; // Approximate height for 11px font

  // Draw background rectangle
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(
    x - padding,
    y - textHeight / 2 - padding,
    textWidth + padding * 2,
    textHeight + padding * 2
  );

  // Draw text
  ctx.fillStyle = textColor;
  ctx.fillText(text, x, y);

  return {
    left: x - padding,
    right: x + textWidth + padding,
    top: y - textHeight / 2 - padding,
    bottom: y + textHeight / 2 + padding,
  };
}

// Store label positions to break grid lines
interface LabelPosition {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Draw keyframes for animations
function drawKeyframes(
  ctx: CanvasRenderingContext2D,
  width: number,
  timelineY: number,
  animations: Animation[],
  colors: TimelineColors,
  scrollOffset: number = 0,
  virtualWidth: number
): LabelPosition[] {
  const keyframeY = timelineY + TIMELINE_BAR_HEIGHT + 35; // Position below timeline bar
  const diamondSize = 8;
  const lineHeight = 20;
  let currentRowIndex = 0;
  const labelPositions: LabelPosition[] = [];

  animations.forEach(animation => {
    const properties = extractAnimatedProperties(animation);

    properties.forEach(propertyData => {
      const { property, keyframes } = propertyData;
      const currentKeyframeY = keyframeY + currentRowIndex * lineHeight;

      // Draw each keyframe segment for this property
      keyframes.forEach((keyframe, keyframeIndex) => {
        const startTime = keyframe.time;
        const endTime = startTime + keyframe.duration;

        // Calculate pixel positions
        const startX =
          (startTime / TIMELINE_DURATION) * virtualWidth - scrollOffset;
        const endX =
          (endTime / TIMELINE_DURATION) * virtualWidth - scrollOffset;

        // Only draw if keyframe is visible in viewport
        if (endX >= -50 && startX <= width + 50) {
          // Draw line connecting start and end
          ctx.strokeStyle = colors.keyframeLine;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(startX, currentKeyframeY);
          ctx.lineTo(endX, currentKeyframeY);
          ctx.stroke();

          // Draw start diamond
          drawDiamond(
            ctx,
            startX,
            currentKeyframeY,
            diamondSize,
            colors.keyframeDiamond
          );

          // Draw end diamond
          drawDiamond(
            ctx,
            endX,
            currentKeyframeY,
            diamondSize,
            colors.keyframeDiamond
          );

          // Draw property label only for the first keyframe of each property
          if (keyframeIndex === 0) {
            ctx.font =
              '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            const labelPosition = drawTextWithBackground(
              ctx,
              property,
              startX + diamondSize + 4,
              currentKeyframeY,
              colors.keyframeLabel,
              colors.background,
              3
            );

            labelPositions.push(labelPosition);
          }
        }
      });

      currentRowIndex++;
    });
  });

  return labelPositions;
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timelineY: number,
  colors: TimelineColors,
  scrollOffset: number = 0,
  virtualWidth: number,
  labelPositions: LabelPosition[] = []
) {
  ctx.lineWidth = 1;
  const pixelsPerSecond = virtualWidth / (TIMELINE_DURATION / 1000); // Calculate based on virtual width

  // Calculate visible range based on scroll offset
  const startTime = (scrollOffset / virtualWidth) * TIMELINE_DURATION;
  const endTime = ((scrollOffset + width) / virtualWidth) * TIMELINE_DURATION;

  const startSecond = Math.floor(startTime / 1000);
  const endSecond = Math.ceil(endTime / 1000) + 1;

  // Helper function to check if a line intersects with any label
  const lineIntersectsLabel = (
    lineX: number,
    lineY1: number,
    lineY2: number
  ): LabelPosition | null => {
    for (const label of labelPositions) {
      if (
        lineX >= label.left &&
        lineX <= label.right &&
        lineY1 <= label.bottom &&
        lineY2 >= label.top
      ) {
        return label;
      }
    }
    return null;
  };

  for (let i = startSecond; i <= Math.min(endSecond, 6); i++) {
    const x = i * pixelsPerSecond - scrollOffset;

    // Only draw if line is visible in viewport
    if (x >= -1 && x <= width + 1) {
      // Major line
      ctx.strokeStyle = colors.gridMajor;
      const intersectingLabel = lineIntersectsLabel(x, 0, height);

      if (intersectingLabel) {
        // Draw line in segments, breaking around the label
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, intersectingLabel.top);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, intersectingLabel.bottom);
        ctx.lineTo(x, height);
        ctx.stroke();
      } else {
        // Draw full line
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Minor grid lines (0.2s intervals)
      ctx.strokeStyle = colors.gridMinor;
      for (let j = 1; j < 5; j++) {
        const minorX = x + (j * pixelsPerSecond) / 5;
        if (minorX >= -1 && minorX <= width + 1) {
          const minorIntersectingLabel = lineIntersectsLabel(
            minorX,
            timelineY - 10,
            timelineY + TIMELINE_BAR_HEIGHT + 10
          );

          if (minorIntersectingLabel) {
            // Draw minor line in segments, breaking around the label
            ctx.beginPath();
            ctx.moveTo(minorX, timelineY - 10);
            ctx.lineTo(
              minorX,
              Math.min(
                minorIntersectingLabel.top,
                timelineY + TIMELINE_BAR_HEIGHT + 10
              )
            );
            ctx.stroke();

            if (
              minorIntersectingLabel.bottom <
              timelineY + TIMELINE_BAR_HEIGHT + 10
            ) {
              ctx.beginPath();
              ctx.moveTo(minorX, minorIntersectingLabel.bottom);
              ctx.lineTo(minorX, timelineY + TIMELINE_BAR_HEIGHT + 10);
              ctx.stroke();
            }
          } else {
            // Draw full minor line
            ctx.beginPath();
            ctx.moveTo(minorX, timelineY - 10);
            ctx.lineTo(minorX, timelineY + TIMELINE_BAR_HEIGHT + 10);
            ctx.stroke();
          }
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
  virtualWidth: number,
  animations: Animation[] = []
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const timelineY = TIMELINE_BAR_HEIGHT / 2;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // First, draw keyframes to get label positions
  const labelPositions = drawKeyframes(
    ctx,
    width,
    timelineY,
    animations,
    colors,
    scrollOffset,
    virtualWidth
  );

  // Draw grid lines with label positions to break lines appropriately
  drawGridLines(
    ctx,
    width,
    height,
    timelineY,
    colors,
    scrollOffset,
    virtualWidth,
    labelPositions
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

  // Redraw keyframes on top to ensure they're visible
  drawKeyframes(
    ctx,
    width,
    timelineY,
    animations,
    colors,
    scrollOffset,
    virtualWidth
  );

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

export {
  drawGridLines,
  drawTimelineBar,
  drawTimeLabels,
  drawTickMarks,
  drawPlayhead,
  drawKeyframes,
  drawTimeline,
};
