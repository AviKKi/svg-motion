import { type TimelineColors } from './timelineColors';
import {
  TIMELINE_DURATION,
  TIMELINE_BAR_HEIGHT,
  PLAYHEAD_SIZE,
} from './constants';

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

export {
  drawGridLines,
  drawTimelineBar,
  drawTimeLabels,
  drawTickMarks,
  drawPlayhead,
  drawTimeline,
};
