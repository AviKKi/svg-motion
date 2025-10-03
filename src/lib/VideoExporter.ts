/**
 * Video Encoder for MP4/WebM Export
 * 
 * This module handles encoding canvas frames into video files using
 * modern web APIs like WebCodecs and MediaRecorder.
 */

import type { ExportOptions, ExportProgress } from './VirtualAnimationRenderer';
import type { CanvasFrame } from './CanvasFrameCompositor';

export interface VideoEncoderConfig {
    codec: string;
    width: number;
    height: number;
    bitrate: number;
    framerate: number;
    keyFrameInterval?: number;
}

/**
 * Modern video encoder using WebCodecs API (preferred when available)
 */
export class WebCodecsVideoEncoder {
    private encoder?: VideoEncoder;
    private config: VideoEncoderConfig;
    private chunks: Uint8Array[] = [];
    private webCodecsSupported: boolean;

    constructor(options: ExportOptions) {
        this.webCodecsSupported = this.checkWebCodecsSupport();
        this.config = this.createConfig(options);
    }

    private checkWebCodecsSupport(): boolean {
        return typeof VideoEncoder !== 'undefined' &&
            typeof VideoFrame !== 'undefined';
    }

    private createConfig(options: ExportOptions): VideoEncoderConfig {
        const bitrate = this.calculateBitrate(options);

        return {
            codec: options.format === 'mp4' ? 'avc1.42E01E' : 'vp09.00.10.08', // H.264 or VP9
            width: options.width,
            height: options.height,
            bitrate,
            framerate: options.fps,
            keyFrameInterval: Math.floor(options.fps * 2) // Keyframe every 2 seconds
        };
    }

    private calculateBitrate(options: ExportOptions): number {
        const pixels = options.width * options.height;
        const quality = options.quality || 0.8;

        // Base bitrate calculation (bits per pixel per second)
        let bpp: number;
        if (pixels <= 480 * 270) bpp = 0.1; // Low res
        else if (pixels <= 1280 * 720) bpp = 0.15; // HD
        else if (pixels <= 1920 * 1080) bpp = 0.2; // Full HD
        else bpp = 0.25; // 4K+

        return Math.floor(pixels * bpp * options.fps * quality);
    }

    async initialize(): Promise<void> {
        if (!this.webCodecsSupported) {
            throw new Error('WebCodecs is not supported in this browser');
        }

        return new Promise((resolve, reject) => {
            this.encoder = new VideoEncoder({
                output: (chunk) => {
                    this.chunks.push(new Uint8Array(chunk.byteLength));
                    chunk.copyTo(this.chunks[this.chunks.length - 1]);
                },
                error: (error) => {
                    reject(new Error(`Video encoding error: ${error.message}`));
                }
            });

            try {
                this.encoder.configure({
                    codec: this.config.codec,
                    width: this.config.width,
                    height: this.config.height,
                    bitrate: this.config.bitrate,
                    framerate: this.config.framerate
                });
                resolve();
            } catch (error) {
                reject(new Error(`Failed to configure video encoder: ${error}`));
            }
        });
    }

    async encodeFrame(canvasFrame: CanvasFrame): Promise<void> {
        if (!this.encoder) {
            throw new Error('Encoder not initialized');
        }

        const timestamp = canvasFrame.timestamp * 1000; // Convert to microseconds

        const videoFrame = new VideoFrame(canvasFrame.canvas, {
            timestamp,
            duration: (1000 / this.config.framerate) * 1000 // Frame duration in microseconds
        });

        try {
            this.encoder.encode(videoFrame, { keyFrame: canvasFrame.frameNumber % this.config.keyFrameInterval! === 0 });
        } finally {
            videoFrame.close();
        }
    }

    async finalize(): Promise<Uint8Array> {
        if (!this.encoder) {
            throw new Error('Encoder not initialized');
        }

        return new Promise((resolve, reject) => {
            this.encoder!.flush()
                .then(() => {
                    // Combine all chunks
                    const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                    const result = new Uint8Array(totalLength);
                    let offset = 0;

                    for (const chunk of this.chunks) {
                        result.set(chunk, offset);
                        offset += chunk.length;
                    }

                    resolve(result);
                })
                .catch(reject);
        });
    }

    checkSupported(): boolean {
        return this.webCodecsSupported;
    }

    dispose(): void {
        this.encoder?.close();
        this.chunks = [];
    }
}

/**
 * Fallback video encoder using MediaRecorder API
 */
export class MediaRecorderVideoEncoder {
    private mediaRecorder?: MediaRecorder;
    private stream?: MediaStream;
    private chunks: Blob[] = [];
    private canvas: HTMLCanvasElement;
    private options: ExportOptions;

    constructor(canvas: HTMLCanvasElement, options: ExportOptions) {
        this.canvas = canvas;
        this.options = options;
    }

    async initialize(): Promise<void> {
        // Create a media stream from the canvas
        this.stream = this.canvas.captureStream(this.options.fps);

        if (!this.stream) {
            throw new Error('Failed to capture canvas stream');
        }

        // Determine MIME type based on format
        const mimeType = this.options.format === 'mp4'
            ? 'video/mp4; codecs="avc1.42E01E"'
            : 'video/webm; codecs="vp9"';

        // Check if the MIME type is supported
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            const fallbackType = this.options.format === 'mp4'
                ? 'video/webm' // Fallback to WebM if MP4 not supported
                : 'video/webm; codecs="vp8"'; // Fallback to VP8

            if (!MediaRecorder.isTypeSupported(fallbackType)) {
                throw new Error('No supported video encoding formats available');
            }
        }

        // Configure MediaRecorder
        const options: MediaRecorderOptions = {
            mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm'
        };

        // Add bitrate if quality is specified
        if (this.options.quality) {
            const bitrate = this.calculateBitrate();
            options.videoBitsPerSecond = bitrate;
        }

        this.mediaRecorder = new MediaRecorder(this.stream, options);

        // Set up event handlers
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.chunks.push(event.data);
            }
        };

        return Promise.resolve();
    }

    private calculateBitrate(): number {
        const pixels = this.options.width * this.options.height;
        const quality = this.options.quality || 0.8;
        const bpp = pixels <= 1280 * 720 ? 0.15 : 0.2; // bits per pixel per second

        return Math.floor(pixels * bpp * this.options.fps * quality);
    }

    async startRecording(): Promise<void> {
        if (!this.mediaRecorder) {
            throw new Error('MediaRecorder not initialized');
        }

        this.chunks = [];
        this.mediaRecorder.start(100); // Collect data every 100ms
    }

    async stopRecording(): Promise<Blob> {
        if (!this.mediaRecorder) {
            throw new Error('MediaRecorder not initialized');
        }

        return new Promise((resolve, reject) => {
            this.mediaRecorder!.onstop = () => {
                const blob = new Blob(this.chunks, {
                    type: this.options.format === 'mp4' ? 'video/mp4' : 'video/webm'
                });
                resolve(blob);
            };

            this.mediaRecorder!.onerror = (event) => {
                reject(new Error(`MediaRecorder error: ${(event as any).error}`));
            };

            this.mediaRecorder!.stop();
        });
    }

    dispose(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        this.chunks = [];
    }
}

/**
 * Main video export orchestrator
 */
export class VideoExporter {
    private options: ExportOptions;
    private useWebCodecs: boolean;

    constructor(options: ExportOptions) {
        this.options = options;
        this.useWebCodecs = typeof VideoEncoder !== 'undefined';
    }

    /**
     * Export frames to video file
     */
    async exportVideo(
        frames: AsyncGenerator<CanvasFrame, void, unknown>,
        onProgress?: (progress: ExportProgress) => void
    ): Promise<Blob> {
        if (onProgress) {
            onProgress({
                phase: 'setup',
                progress: 0,
                message: 'Initializing video encoder...'
            });
        }

        if (this.useWebCodecs) {
            return this.exportWithWebCodecs(frames, onProgress);
        } else {
            return this.exportWithMediaRecorder(frames, onProgress);
        }
    }

    private async exportWithWebCodecs(
        frames: AsyncGenerator<CanvasFrame, void, unknown>,
        onProgress?: (progress: ExportProgress) => void
    ): Promise<Blob> {
        const encoder = new WebCodecsVideoEncoder(this.options);

        try {
            await encoder.initialize();

            if (onProgress) {
                onProgress({
                    phase: 'encoding',
                    progress: 0,
                    message: 'Encoding frames with WebCodecs...'
                });
            }

            // Encode all frames
            let frameCount = 0;
            for await (const frame of frames) {
                await encoder.encodeFrame(frame);
                frameCount++;

                if (onProgress && frameCount % 10 === 0) {
                    onProgress({
                        phase: 'encoding',
                        progress: 0.5, // Hard to estimate progress with async generator
                        currentFrame: frameCount,
                        message: `Encoded ${frameCount} frames...`
                    });
                }
            }

            const videoData = await encoder.finalize();

            if (onProgress) {
                onProgress({
                    phase: 'complete',
                    progress: 1,
                    message: 'Video export complete!'
                });
            }

            return new Blob([videoData as any], {
                type: this.options.format === 'mp4' ? 'video/mp4' : 'video/webm'
            });
        } finally {
            encoder.dispose();
        }
    }

    private async exportWithMediaRecorder(
        frames: AsyncGenerator<CanvasFrame, void, unknown>,
        onProgress?: (progress: ExportProgress) => void
    ): Promise<Blob> {
        // For MediaRecorder, we need to create a temporary canvas and animate it
        const canvas = document.createElement('canvas');
        canvas.width = this.options.width;
        canvas.height = this.options.height;
        const ctx = canvas.getContext('2d')!;

        const encoder = new MediaRecorderVideoEncoder(canvas, this.options);

        try {
            await encoder.initialize();
            await encoder.startRecording();

            if (onProgress) {
                onProgress({
                    phase: 'encoding',
                    progress: 0,
                    message: 'Recording with MediaRecorder...'
                });
            }

            // Play back frames at the correct timing
            const frameInterval = 1000 / this.options.fps;
            let frameCount = 0;

            for await (const frame of frames) {
                // Draw frame to canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.putImageData(frame.imageData, 0, 0);

                // Wait for frame timing
                await new Promise(resolve => setTimeout(resolve, frameInterval));

                frameCount++;
                if (onProgress && frameCount % 10 === 0) {
                    onProgress({
                        phase: 'encoding',
                        progress: 0.5,
                        currentFrame: frameCount,
                        message: `Recording frame ${frameCount}...`
                    });
                }
            }

            const videoBlob = await encoder.stopRecording();

            if (onProgress) {
                onProgress({
                    phase: 'complete',
                    progress: 1,
                    message: 'Video export complete!'
                });
            }

            return videoBlob;
        } finally {
            encoder.dispose();
        }
    }

    /**
     * Check what encoding methods are available
     */
    static getAvailableEncoders(): string[] {
        const encoders: string[] = [];

        if (typeof VideoEncoder !== 'undefined') {
            encoders.push('WebCodecs');
        }

        if (typeof MediaRecorder !== 'undefined') {
            encoders.push('MediaRecorder');
        }

        return encoders;
    }

    /**
     * Get supported output formats
     */
    static getSupportedFormats(): string[] {
        const formats: string[] = [];

        // Check WebCodecs support
        if (typeof VideoEncoder !== 'undefined') {
            formats.push('mp4', 'webm');
        }

        // Check MediaRecorder support
        if (typeof MediaRecorder !== 'undefined') {
            if (MediaRecorder.isTypeSupported('video/mp4')) {
                formats.push('mp4');
            }
            if (MediaRecorder.isTypeSupported('video/webm')) {
                formats.push('webm');
            }
        }

        return [...new Set(formats)]; // Remove duplicates
    }
}