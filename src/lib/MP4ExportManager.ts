/**
 * Main MP4 Export Manager
 * 
 * This module orchestrates the entire export process, coordinating between
 * the virtual animation renderer, canvas compositor, and video encoder.
 */

import { VirtualAnimationRenderer, type ExportOptions, type ExportProgress } from './VirtualAnimationRenderer';
import { CanvasFrameCompositor, validateExportOptions, estimateVideoSize } from './CanvasFrameCompositor';
import { VideoExporter } from './VideoExporter';
import type { Animation } from '@/stores/animationStore';

export interface MP4ExportResult {
    blob: Blob;
    size: number;
    duration: number;
    frameCount: number;
    options: ExportOptions;
}

export interface MP4ExportCapabilities {
    supportedFormats: string[];
    availableEncoders: string[];
    maxResolution: { width: number; height: number };
    recommendedSettings: ExportOptions;
}

/**
 * Main class for exporting SVG animations to MP4/WebM
 */
export class MP4ExportManager {
    private virtualRenderer?: VirtualAnimationRenderer;
    private canvasCompositor?: CanvasFrameCompositor;
    private videoExporter?: VideoExporter;
    private isExporting: boolean = false;

    /**
     * Export SVG animation to video file
     */
    async exportAnimation(
        svgContent: string,
        animations: Animation[],
        options: ExportOptions,
        onProgress?: (progress: ExportProgress) => void
    ): Promise<MP4ExportResult> {
        if (this.isExporting) {
            throw new Error('Export already in progress');
        }

        // Validate options
        const validationErrors = validateExportOptions(options);
        if (validationErrors.length > 0) {
            throw new Error(`Invalid export options: ${validationErrors.join(', ')}`);
        }

        this.isExporting = true;

        try {
            if (onProgress) {
                onProgress({
                    phase: 'setup',
                    progress: 0,
                    message: 'Initializing export process...'
                });
            }

            // Initialize components
            this.virtualRenderer = new VirtualAnimationRenderer(svgContent, animations);
            this.canvasCompositor = new CanvasFrameCompositor(options);
            this.videoExporter = new VideoExporter(options);

            const totalDuration = this.virtualRenderer.getTotalDuration();
            const frameCount = this.virtualRenderer.getFrameCount(options.fps);

            if (onProgress) {
                onProgress({
                    phase: 'setup',
                    progress: 0.2,
                    message: `Preparing ${frameCount} frames for ${(totalDuration / 1000).toFixed(1)}s animation...`
                });
            }

            // Generate frames from virtual renderer
            const frameGenerator = this.virtualRenderer.generateFrames(options.fps);

            // Convert frames to canvas images
            const canvasFrames = this.canvasCompositor.renderFrames(
                frameGenerator,
                (progress) => {
                    if (onProgress) {
                        onProgress({
                            ...progress,
                            progress: 0.2 + (progress.progress * 0.6) // Map to 20-80% of total progress
                        });
                    }
                }
            );

            if (onProgress) {
                onProgress({
                    phase: 'encoding',
                    progress: 0.8,
                    message: 'Encoding video...'
                });
            }

            // Encode to video
            const videoBlob = await this.videoExporter.exportVideo(
                canvasFrames,
                (progress) => {
                    if (onProgress) {
                        onProgress({
                            ...progress,
                            progress: 0.8 + (progress.progress * 0.2) // Map to 80-100% of total progress
                        });
                    }
                }
            );

            if (onProgress) {
                onProgress({
                    phase: 'complete',
                    progress: 1,
                    message: 'Export complete!'
                });
            }

            return {
                blob: videoBlob,
                size: videoBlob.size,
                duration: totalDuration,
                frameCount,
                options
            };

        } catch (error) {
            if (onProgress) {
                onProgress({
                    phase: 'error',
                    progress: 0,
                    error: error as Error,
                    message: `Export failed: ${(error as Error).message}`
                });
            }
            throw error;
        } finally {
            this.cleanup();
            this.isExporting = false;
        }
    }

    /**
     * Create a preview frame from the animation
     */
    async createPreview(
        svgContent: string,
        animations: Animation[],
        timeMs: number = 0,
        width: number = 400,
        height: number = 300
    ): Promise<Blob> {
        const renderer = new VirtualAnimationRenderer(svgContent, animations);
        const compositor = new CanvasFrameCompositor({
            width,
            height,
            fps: 30,
            duration: 1000,
            format: 'webm'
        });

        try {
            renderer.seekToTime(timeMs);
            const frameData = {
                svgContent: renderer.getCurrentSVGContent(),
                timestamp: timeMs,
                frameNumber: 0
            };

            return await compositor.createPreviewImage(frameData);
        } finally {
            compositor.dispose();
        }
    }

    /**
     * Get export capabilities of the current browser
     */
    static getCapabilities(): MP4ExportCapabilities {
        const supportedFormats = VideoExporter.getSupportedFormats();
        const availableEncoders = VideoExporter.getAvailableEncoders();

        // Determine max resolution based on capabilities
        let maxResolution = { width: 1920, height: 1080 };

        // If WebCodecs is available, we can handle higher resolutions
        if (availableEncoders.includes('WebCodecs')) {
            maxResolution = { width: 3840, height: 2160 }; // 4K
        }

        // Generate recommended settings
        const recommendedSettings: ExportOptions = {
            width: 1280,
            height: 720,
            fps: 30,
            duration: 5000,
            format: supportedFormats.includes('mp4') ? 'mp4' : 'webm',
            quality: 0.8
        };

        return {
            supportedFormats,
            availableEncoders,
            maxResolution,
            recommendedSettings
        };
    }

    /**
     * Estimate file size for given options
     */
    static estimateFileSize(options: ExportOptions): number {
        return estimateVideoSize(
            options.width,
            options.height,
            options.fps,
            options.duration,
            options.format,
            options.quality || 0.8
        );
    }

    /**
     * Validate if export is possible with current browser
     */
    static canExport(): { supported: boolean; reason?: string } {
        const capabilities = this.getCapabilities();

        if (capabilities.availableEncoders.length === 0) {
            return {
                supported: false,
                reason: 'No video encoders available in this browser'
            };
        }

        if (capabilities.supportedFormats.length === 0) {
            return {
                supported: false,
                reason: 'No supported video formats available'
            };
        }

        // Check for required APIs
        if (typeof HTMLCanvasElement === 'undefined') {
            return {
                supported: false,
                reason: 'Canvas API not available'
            };
        }

        if (typeof DOMParser === 'undefined') {
            return {
                supported: false,
                reason: 'DOM parsing not available'
            };
        }

        return { supported: true };
    }

    /**
     * Get optimal export settings for the animation
     */
    static getOptimalSettings(
        animations: Animation[],
        targetFileSize?: number
    ): ExportOptions {
        const capabilities = this.getCapabilities();
        const recommended = capabilities.recommendedSettings;

        // Calculate animation duration
        let maxDuration = 0;
        for (const animation of animations) {
            for (const paramKey of Object.keys(animation.params)) {
                const paramSteps = animation.params[paramKey];
                let animationEnd = animation.position;

                for (const step of paramSteps) {
                    animationEnd += (step.delay || 0) + step.duration;
                }

                maxDuration = Math.max(maxDuration, animationEnd);
            }
        }

        if (maxDuration === 0) maxDuration = 3000; // Default 3 seconds

        const settings: ExportOptions = {
            ...recommended,
            duration: maxDuration
        };

        // Adjust for target file size if specified
        if (targetFileSize) {
            const estimatedSize = this.estimateFileSize(settings);

            if (estimatedSize > targetFileSize) {
                // Reduce quality to fit target size
                const ratio = targetFileSize / estimatedSize;
                settings.quality = Math.max(0.3, (settings.quality || 0.8) * ratio);

                // If still too large, reduce resolution
                const newEstimate = this.estimateFileSize(settings);
                if (newEstimate > targetFileSize) {
                    const scale = Math.sqrt(targetFileSize / newEstimate);
                    settings.width = Math.floor(settings.width * scale);
                    settings.height = Math.floor(settings.height * scale);
                }
            }
        }

        return settings;
    }

    /**
     * Cancel ongoing export
     */
    cancel(): void {
        if (this.isExporting) {
            this.cleanup();
            this.isExporting = false;
        }
    }

    /**
     * Check if export is currently in progress
     */
    isCurrentlyExporting(): boolean {
        return this.isExporting;
    }

    private cleanup(): void {
        this.canvasCompositor?.dispose();
        this.canvasCompositor = undefined;

        this.virtualRenderer = undefined;
        this.videoExporter = undefined;
    }
}