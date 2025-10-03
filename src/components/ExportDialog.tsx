import { useState, useEffect } from 'react';
import { Download, Film, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnimationStore } from '@/stores/animationStore';
import { MP4ExportManager } from '@/lib/MP4ExportManager';
import type { ExportOptions, ExportProgress } from '@/lib/VirtualAnimationRenderer';

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
    const { svgContent, animations } = useAnimationStore();
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        width: 1280,
        height: 720,
        fps: 30,
        duration: 5000,
        format: 'mp4',
        quality: 0.8
    });

    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
    const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [exportResult, setExportResult] = useState<{ blob: Blob; filename: string } | null>(null);
    const [capabilities, setCapabilities] = useState(MP4ExportManager.getCapabilities());

    useEffect(() => {
        // Initialize with optimal settings based on current animations
        if (animations.length > 0) {
            const optimal = MP4ExportManager.getOptimalSettings(animations);
            setExportOptions(optimal);
        }
    }, [animations]);

    useEffect(() => {
        // Clean up preview URL when component unmounts or preview changes
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handlePreview = async () => {
        if (!svgContent) return;

        try {
            const blob = await MP4ExportManager.prototype.createPreview(
                svgContent,
                animations,
                0, // Preview at start of animation
                exportOptions.width,
                exportOptions.height
            );

            setPreviewBlob(blob);

            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
        } catch (error) {
            console.error('Failed to create preview:', error);
        }
    };

    const handleExport = async () => {
        if (!svgContent || animations.length === 0) return;

        setIsExporting(true);
        setExportProgress(null);
        setExportResult(null);

        try {
            const manager = new MP4ExportManager();
            const result = await manager.exportAnimation(
                svgContent,
                animations,
                exportOptions,
                (progress) => setExportProgress(progress)
            );

            const filename = `svg-animation-${Date.now()}.${exportOptions.format}`;
            setExportResult({ blob: result.blob, filename });

        } catch (error) {
            console.error('Export failed:', error);
            setExportProgress({
                phase: 'error',
                progress: 0,
                error: error as Error,
                message: `Export failed: ${(error as Error).message}`
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownload = () => {
        if (!exportResult) return;

        const url = URL.createObjectURL(exportResult.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportResult.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const estimatedSize = MP4ExportManager.estimateFileSize(exportOptions);
    const canExport = MP4ExportManager.canExport();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5" />
                        Export Animation
                    </DialogTitle>
                    <DialogDescription>
                        Export your SVG animation as MP4 or WebM video file.
                    </DialogDescription>
                </DialogHeader>

                {!canExport.supported ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800 font-medium">Export not supported</p>
                        <p className="text-red-600 text-sm">{canExport.reason}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Export Settings */}
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="width">Width (px)</Label>
                                    <Input
                                        id="width"
                                        type="number"
                                        min="64"
                                        max={capabilities.maxResolution.width}
                                        value={exportOptions.width}
                                        onChange={e => setExportOptions(prev => ({ ...prev, width: Number(e.target.value) }))}
                                        disabled={isExporting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="height">Height (px)</Label>
                                    <Input
                                        id="height"
                                        type="number"
                                        min="64"
                                        max={capabilities.maxResolution.height}
                                        value={exportOptions.height}
                                        onChange={e => setExportOptions(prev => ({ ...prev, height: Number(e.target.value) }))}
                                        disabled={isExporting}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fps">Frame Rate (FPS)</Label>
                                    <Input
                                        id="fps"
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={exportOptions.fps}
                                        onChange={e => setExportOptions(prev => ({ ...prev, fps: Number(e.target.value) }))}
                                        disabled={isExporting}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="quality">Quality (0-1)</Label>
                                    <Input
                                        id="quality"
                                        type="number"
                                        min="0.1"
                                        max="1"
                                        step="0.1"
                                        value={exportOptions.quality || 0.8}
                                        onChange={e => setExportOptions(prev => ({ ...prev, quality: Number(e.target.value) }))}
                                        disabled={isExporting}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="format">Format</Label>
                                <select
                                    id="format"
                                    value={exportOptions.format}
                                    onChange={e => setExportOptions(prev => ({ ...prev, format: e.target.value as 'mp4' | 'webm' }))}
                                    disabled={isExporting}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {capabilities.supportedFormats.map(format => (
                                        <option key={format} value={format}>
                                            {format.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm text-gray-600">
                                    Estimated file size: <span className="font-medium">{formatFileSize(estimatedSize)}</span>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Duration: {(exportOptions.duration / 1000).toFixed(1)}s •
                                    Frames: {Math.ceil((exportOptions.duration / 1000) * exportOptions.fps)}
                                </p>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Preview</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreview}
                                    disabled={isExporting || !svgContent}
                                >
                                    Generate Preview
                                </Button>
                            </div>

                            {previewUrl && (
                                <div className="border rounded-lg p-2 bg-gray-50">
                                    <img
                                        src={previewUrl}
                                        alt="Animation preview"
                                        className="w-full h-auto max-h-48 object-contain rounded"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Export Progress */}
                        {exportProgress && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {exportProgress.phase === 'error' ? 'Error' : 'Exporting...'}
                                    </span>
                                    {exportProgress.phase !== 'error' && (
                                        <span className="text-sm text-gray-500">
                                            {Math.round(exportProgress.progress * 100)}%
                                        </span>
                                    )}
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${exportProgress.phase === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                            }`}
                                        style={{ width: `${exportProgress.progress * 100}%` }}
                                    />
                                </div>

                                <p className="text-sm text-gray-600">
                                    {exportProgress.message}
                                </p>

                                {exportProgress.currentFrame && exportProgress.totalFrames && (
                                    <p className="text-xs text-gray-500">
                                        Frame {exportProgress.currentFrame} of {exportProgress.totalFrames}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Export Result */}
                        {exportResult && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-800 font-medium">Export Complete!</p>
                                        <p className="text-green-600 text-sm">
                                            File size: {formatFileSize(exportResult.blob.size)}
                                        </p>
                                    </div>
                                    <Button onClick={handleDownload} className="flex items-center gap-2">
                                        <Download className="h-4 w-4" />
                                        Download
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-between pt-4">
                            <div className="text-xs text-gray-500">
                                Encoders: {capabilities.availableEncoders.join(', ')}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isExporting}
                                >
                                    {isExporting ? 'Exporting...' : 'Cancel'}
                                </Button>
                                <Button
                                    onClick={handleExport}
                                    disabled={isExporting || !svgContent || animations.length === 0}
                                    className="flex items-center gap-2"
                                >
                                    {isExporting ? (
                                        <>
                                            <Pause className="h-4 w-4" />
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4" />
                                            Export Video
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}