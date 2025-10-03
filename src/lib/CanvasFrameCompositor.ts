/**
 * Canvas Frame Compositor for MP4 Export
 * 
 * This module handles converting SVG frames to canvas images and managing
 * the frame composition process for video encoding.
 */

import type { FrameData, ExportOptions, ExportProgress } from './VirtualAnimationRenderer';

export interface CanvasFrame {
    imageData: ImageData;
    canvas: HTMLCanvasElement;
    timestamp: number;
    frameNumber: number;
}

/**
 * Manages the conversion of SVG frames to canvas images
 */
export class CanvasFrameCompositor {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private options: ExportOptions;

    constructor(options: ExportOptions) {
        this.options = options;
        this.canvas = document.createElement('canvas');
        this.canvas.width = options.width;
        this.canvas.height = options.height;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D canvas context');
        }
        this.ctx = ctx;

        // Set up canvas for high quality rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    /**
     * Convert SVG content to base64 data URL
     */
    svgToDataURL(svgContent: string): string {
        // Ensure SVG has proper XML declaration and dimensions
        let processedSvg = svgContent;

        if (!processedSvg.includes('<?xml')) {
            processedSvg = '<?xml version="1.0" encoding="UTF-8"?>' + processedSvg;
        }

        // Ensure SVG has explicit dimensions for consistent rendering
        if (!processedSvg.includes('width=') && !processedSvg.includes('height=')) {
            processedSvg = processedSvg.replace(
                '<svg',
                `<svg width="${this.options.width}" height="${this.options.height}"`
            );
        }

        // Encode SVG as base64 data URL
        const base64 = btoa(unescape(encodeURIComponent(processedSvg)));
        return `data:image/svg+xml;base64,${base64}`;
    }

    /**
     * Render a single SVG frame to canvas and return the frame data
     */
    async renderFrame(frameData: FrameData): Promise<CanvasFrame> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                try {
                    // Clear canvas
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                    // Set background (transparent by default)
                    this.ctx.fillStyle = 'transparent';
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                    // Draw SVG image onto canvas
                    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

                    // Get image data
                    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

                    resolve({
                        imageData,
                        canvas: this.canvas,
                        timestamp: frameData.timestamp,
                        frameNumber: frameData.frameNumber
                    });
                } catch (error) {
                    reject(new Error(`Failed to render frame ${frameData.frameNumber}: ${error}`));
                }
            };

            img.onerror = () => {
                reject(new Error(`Failed to load SVG image for frame ${frameData.frameNumber}`));
            };

            // Convert SVG to data URL and load
            const dataURL = this.svgToDataURL(frameData.svgContent);
            img.src = dataURL;
        });
    }

    /**
     * Process multiple frames with progress tracking
     */
    async *renderFrames(
        frameGenerator: Generator<FrameData, void, unknown>,
        onProgress?: (progress: ExportProgress) => void
    ): AsyncGenerator<CanvasFrame, void, unknown> {
        const frames: FrameData[] = [];

        // Collect all frames first to know total count
        for (const frame of frameGenerator) {
            frames.push(frame);
        }

        const totalFrames = frames.length;

        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];

            if (onProgress) {
                onProgress({
                    phase: 'rendering',
                    progress: i / totalFrames,
                    currentFrame: i + 1,
                    totalFrames,
                    message: `Rendering frame ${i + 1} of ${totalFrames}`
                });
            }

            try {
                const canvasFrame = await this.renderFrame(frame);
                yield canvasFrame;
            } catch (error) {
                if (onProgress) {
                    onProgress({
                        phase: 'error',
                        progress: i / totalFrames,
                        currentFrame: i + 1,
                        totalFrames,
                        error: error as Error
                    });
                }
                throw error;
            }
        }
    }

    /**
     * Create a preview image from a specific frame
     */
    async createPreviewImage(frameData: FrameData): Promise<Blob> {
        const canvasFrame = await this.renderFrame(frameData);
        return new Promise((resolve, reject) => {
            canvasFrame.canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create preview image'));
                }
            }, 'image/png');
        });
    }

    /**
     * Get canvas for direct manipulation
     */
    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * Get rendering context for direct manipulation
     */
    getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        // Canvas cleanup happens automatically when object is garbage collected
        // But we can clear the context if needed
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

/**
 * Utility function to estimate video file size
 */
export function estimateVideoSize(
    width: number,
    height: number,
    fps: number,
    durationMs: number,
    format: 'webm' | 'mp4',
    quality: number = 0.8
): number {
    const totalFrames = Math.ceil((durationMs / 1000) * fps);
    const pixelsPerFrame = width * height;

    // Rough estimates based on typical compression ratios
    let bytesPerPixel: number;

    if (format === 'webm') {
        // WebM typically has better compression
        bytesPerPixel = 0.1 * quality;
    } else {
        // MP4 H.264
        bytesPerPixel = 0.15 * quality;
    }

    return totalFrames * pixelsPerFrame * bytesPerPixel;
}

/**
 * Utility function to validate export options
 */
export function validateExportOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.width <= 0 || options.width > 4096) {
        errors.push('Width must be between 1 and 4096 pixels');
    }

    if (options.height <= 0 || options.height > 4096) {
        errors.push('Height must be between 1 and 4096 pixels');
    }

    if (options.fps <= 0 || options.fps > 120) {
        errors.push('FPS must be between 1 and 120');
    }

    if (options.duration <= 0 || options.duration > 300000) { // 5 minutes max
        errors.push('Duration must be between 1ms and 5 minutes');
    }

    if (options.quality !== undefined && (options.quality < 0 || options.quality > 1)) {
        errors.push('Quality must be between 0 and 1');
    }

    // Check if format is supported
    const supportedFormats = ['webm', 'mp4'];
    if (!supportedFormats.includes(options.format)) {
        errors.push(`Format must be one of: ${supportedFormats.join(', ')}`);
    }

    return errors;
}