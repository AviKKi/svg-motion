/**
 * Virtual Animation Renderer for MP4 Export
 * 
 * This module provides a headless animation system that can:
 * 1. Parse SVG content and animations
 * 2. Seek through animation frames in a virtual DOM
 * 3. Generate frame data without browser rendering overhead
 * 4. Convert frames to canvas images for video encoding
 */

import type { Animation } from '@/stores/animationStore';

export interface ExportOptions {
    width: number;
    height: number;
    fps: number;
    duration: number; // in milliseconds
    format: 'webm' | 'mp4';
    quality?: number; // 0-1, for lossy formats
}

export interface FrameData {
    svgContent: string;
    timestamp: number;
    frameNumber: number;
}

export interface ExportProgress {
    phase: 'setup' | 'rendering' | 'encoding' | 'complete' | 'error';
    progress: number; // 0-1
    currentFrame?: number;
    totalFrames?: number;
    message?: string;
    error?: Error;
}

/**
 * Virtual DOM-based animation renderer that doesn't require actual DOM painting
 */
export class VirtualAnimationRenderer {
    private svgDocument!: Document;
    private svgElement!: SVGSVGElement;
    private animations: Animation[];
    private totalDuration: number = 0;

    constructor(svgContent: string, animations: Animation[]) {
        this.animations = animations;
        this.setupVirtualDOM(svgContent);
        this.calculateTotalDuration();
    }

    private setupVirtualDOM(svgContent: string): void {
        // Create a virtual document that doesn't paint to screen
        const parser = new DOMParser();
        this.svgDocument = parser.parseFromString(svgContent, 'image/svg+xml');
        this.svgElement = this.svgDocument.documentElement as unknown as SVGSVGElement;

        if (!this.svgElement || this.svgElement.tagName !== 'svg') {
            throw new Error('Invalid SVG content provided');
        }

        // Ensure SVG has proper dimensions for export
        if (!this.svgElement.hasAttribute('viewBox') &&
            (!this.svgElement.hasAttribute('width') || !this.svgElement.hasAttribute('height'))) {
            // Set default viewBox if missing
            this.svgElement.setAttribute('viewBox', '0 0 24 24');
        }
    }

    private calculateTotalDuration(): void {
        let maxTime = 0;
        for (const animation of this.animations) {
            for (const paramKey of Object.keys(animation.params)) {
                const paramSteps = animation.params[paramKey];
                let animationEnd = animation.position;

                for (const step of paramSteps) {
                    animationEnd += (step.delay || 0) + step.duration;
                }

                maxTime = Math.max(maxTime, animationEnd);
            }
        }
        this.totalDuration = maxTime || 1000; // Default to 1 second if no animations
    }

    /**
     * Seek to a specific time and apply all animation states virtually
     */
    seekToTime(timeMs: number): void {
        // Reset all elements to initial state first
        this.resetElementStates();

        // Apply each animation's state at the given time
        for (const animation of this.animations) {
            this.applyAnimationAtTime(animation, timeMs);
        }
    }

    private resetElementStates(): void {
        // Reset transform attributes that animations might have modified
        const elements = this.svgElement.querySelectorAll('*');
        elements.forEach(element => {
            // Remove common animation attributes
            element.removeAttribute('transform');
            element.removeAttribute('opacity');
            element.removeAttribute('fill');
            element.removeAttribute('stroke');
            element.removeAttribute('stroke-width');
            element.removeAttribute('r'); // for circles
            element.removeAttribute('rx'); // for rects/ellipses
            element.removeAttribute('ry');
            element.removeAttribute('cx'); // for circles/ellipses
            element.removeAttribute('cy');
            element.removeAttribute('x'); // for rects
            element.removeAttribute('y');
            element.removeAttribute('width');
            element.removeAttribute('height');
        });
    }

    private applyAnimationAtTime(animation: Animation, timeMs: number): void {
        const relativeTime = timeMs - animation.position;
        if (relativeTime < 0) return; // Animation hasn't started yet

        // Get target elements
        const targets = this.resolveTargets(animation.targets);
        if (targets.length === 0) return;

        // Apply each parameter's state at this time
        for (const paramKey of Object.keys(animation.params)) {
            const paramSteps = animation.params[paramKey];
            const currentValue = this.calculateParameterValueAtTime(paramSteps, relativeTime);

            if (currentValue !== null) {
                this.applyParameterToElements(targets, paramKey, currentValue);
            }
        }
    }

    private resolveTargets(targetsStr: string): Element[] {
        try {
            // Handle different target types that anime.js supports
            if (targetsStr === 'svg') {
                return [this.svgElement];
            }

            // CSS selector
            const elements = this.svgElement.querySelectorAll(targetsStr);
            return Array.from(elements);
        } catch (error) {
            console.warn('Failed to resolve targets:', targetsStr, error);
            return [];
        }
    }

    private calculateParameterValueAtTime(steps: Array<{ to: any; ease?: string; duration: number; delay?: number }>, relativeTime: number): any {
        let currentTime = 0;
        let lastValue: any = null;

        for (const step of steps) {
            const stepStart = currentTime + (step.delay || 0);
            const stepEnd = stepStart + step.duration;

            if (relativeTime >= stepStart && relativeTime <= stepEnd) {
                // We're in this step - interpolate
                const stepProgress = (relativeTime - stepStart) / step.duration;
                const easedProgress = this.applyEasing(stepProgress, step.ease || 'linear');

                if (lastValue !== null && typeof step.to === 'number' && typeof lastValue === 'number') {
                    return lastValue + (step.to - lastValue) * easedProgress;
                } else {
                    // For non-numeric values, use step function
                    return easedProgress > 0.5 ? step.to : lastValue;
                }
            } else if (relativeTime > stepEnd) {
                // We've passed this step
                lastValue = step.to;
                currentTime = stepEnd;
            } else {
                // We haven't reached this step yet
                break;
            }
        }

        return lastValue;
    }

    private applyEasing(progress: number, easing: string): number {
        // Simple easing functions - could be expanded
        switch (easing) {
            case 'linear':
                return progress;
            case 'easeInOut':
            case 'easeInOutSine':
                return 0.5 * (1 - Math.cos(progress * Math.PI));
            case 'easeIn':
                return progress * progress;
            case 'easeOut':
                return 1 - (1 - progress) * (1 - progress);
            default:
                return progress; // fallback to linear
        }
    }

    private applyParameterToElements(elements: Element[], paramKey: string, value: any): void {
        elements.forEach(element => {
            switch (paramKey) {
                case 'opacity':
                    element.setAttribute('opacity', String(value));
                    break;
                case 'rotate':
                    this.applyTransform(element, 'rotate', `${value}deg`);
                    break;
                case 'translateX':
                case 'x':
                    this.applyTransform(element, 'translateX', `${value}px`);
                    break;
                case 'translateY':
                case 'y':
                    this.applyTransform(element, 'translateY', `${value}px`);
                    break;
                case 'scale':
                    this.applyTransform(element, 'scale', String(value));
                    break;
                case 'fill':
                    element.setAttribute('fill', String(value));
                    break;
                case 'stroke':
                    element.setAttribute('stroke', String(value));
                    break;
                case 'r': // radius for circles
                    element.setAttribute('r', String(value));
                    break;
                // Add more parameters as needed
                default:
                    // Try to set as attribute directly
                    element.setAttribute(paramKey, String(value));
            }
        });
    }

    private applyTransform(element: Element, transformType: string, value: string): void {
        const currentTransform = element.getAttribute('transform') || '';

        // Parse existing transforms
        const transforms = this.parseTransformString(currentTransform);
        transforms[transformType] = value;

        // Rebuild transform string
        const transformString = Object.entries(transforms)
            .map(([type, val]) => `${type}(${val})`)
            .join(' ');

        element.setAttribute('transform', transformString);
    }

    private parseTransformString(transformStr: string): Record<string, string> {
        const transforms: Record<string, string> = {};
        const regex = /(\w+)\s*\(([^)]+)\)/g;
        let match;

        while ((match = regex.exec(transformStr)) !== null) {
            transforms[match[1]] = match[2];
        }

        return transforms;
    }

    /**
     * Get the current SVG content as a string at the current animation state
     */
    getCurrentSVGContent(): string {
        return new XMLSerializer().serializeToString(this.svgElement);
    }

    /**
     * Generate all frames for the animation
     */
    *generateFrames(fps: number): Generator<FrameData, void, unknown> {
        const frameInterval = 1000 / fps; // ms per frame
        const totalFrames = Math.ceil(this.totalDuration / frameInterval);

        for (let frame = 0; frame <= totalFrames; frame++) {
            const timestamp = frame * frameInterval;
            this.seekToTime(timestamp);

            yield {
                svgContent: this.getCurrentSVGContent(),
                timestamp,
                frameNumber: frame
            };
        }
    }

    getTotalDuration(): number {
        return this.totalDuration;
    }

    getFrameCount(fps: number): number {
        return Math.ceil(this.totalDuration / (1000 / fps));
    }
}