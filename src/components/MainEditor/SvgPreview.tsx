import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { useAnimationStore } from '@/stores/animationStore';
import { SVGRendererManager } from '@/lib/SVGRendererManager';

const SAMPLE_SVGS = [{ name: 'Phone Call', path: '/sampleSvg/phone-call.svg' }];

interface SvgPreviewProps {}

export function SvgPreview({}: SvgPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const {
    svgContent,
    svgUri,
    svgName,
    setSvgContent,
    setSvgUri,
    setSvgName,
    clearSvg,
  } = useAnimationStore();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedSampleSvg, setSelectedSampleSvg] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const hasSvg = Boolean(svgUri || svgContent);
  // Dispose renderer manager on unmount
  useEffect(() => {
    return () => SVGRendererManager.dispose();
  }, []);

  // Load SVG content
  useEffect(() => {
    const loadSvgContent = async () => {
      if (!uploadedFile && !selectedSampleSvg) return;

      setIsLoading(true);
      try {
        if (uploadedFile) {
          const content = await uploadedFile.text();
          const uri = URL.createObjectURL(uploadedFile);
          setSvgContent(content);
          setSvgUri(uri);
          setSvgName(uploadedFile.name);
        } else if (selectedSampleSvg) {
          const response = await fetch(selectedSampleSvg);
          const content = await response.text();
          setSvgContent(content);
          setSvgUri(selectedSampleSvg);
          const name =
            selectedSampleSvg.split('/').pop()?.replace('.svg', '') || '';
          setSvgName(name);
        }
      } catch (error) {
        console.error('Error loading SVG:', error);
        clearSvg();
      } finally {
        setIsLoading(false);
      }
    };

    loadSvgContent();
  }, [
    uploadedFile,
    selectedSampleSvg,
    setSvgContent,
    setSvgUri,
    setSvgName,
    clearSvg,
  ]);

  // Cleanup object URL when component unmounts or SVG changes
  useEffect(() => {
    return () => {
      if (uploadedFile && svgUri && svgUri.startsWith('blob:')) {
        URL.revokeObjectURL(svgUri);
      }
    };
  }, [uploadedFile, svgUri]);

  return (
    <div className="h-full bg-muted/10 flex items-center justify-center">
      {hasSvg ? (
        <div className="flex flex-col items-center justify-center h-full p-4 w-full">
          {/* Header with file name and clear button */}
          <div className="flex items-center justify-between w-full mb-4">
            <span className="text-muted-foreground font-medium truncate flex-1">
              {svgName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUploadedFile(null);
                setSelectedSampleSvg(null);
                clearSvg();
              }}
              className="text-muted-foreground hover:text-foreground ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* SVG Content in Iframe */}
          <div className="flex-1 flex items-center justify-center w-full">
            {isLoading ? (
              <div className="text-muted-foreground">Loading SVG...</div>
            ) : svgContent ? (
              <iframe
                ref={iframeRef}
                src="/svg-renderer.html"
                className="w-full h-full border-0 bg-transparent"
                title="SVG Animation Renderer"
                onLoad={() => {
                  if (iframeRef.current) {
                    SVGRendererManager.init(iframeRef.current);
                  }
                }}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="text-muted-foreground">Failed to load SVG</div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-4 max-w-md">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <span className="text-muted-foreground font-medium mb-4 text-center">
            Upload an SVG file to get started
          </span>
          <input
            type="file"
            accept=".svg"
            onChange={e => setUploadedFile(e.target.files?.[0] || null)}
            className="hidden"
            id="svg-upload"
          />
          <Button asChild className="mb-6">
            <label htmlFor="svg-upload" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Select SVG File
            </label>
          </Button>

          {/* Sample SVGs */}
          <div className="w-full">
            <span className="text-sm text-muted-foreground mb-3 block text-center">
              Or choose from samples:
            </span>
            <div className="space-y-2 flex flex-col items-center justify-center">
              {SAMPLE_SVGS.map(svg => (
                <div
                  key={svg.path}
                  className="border-2 border-muted-foreground p-2 rounded-md flex-col items-center justify-center"
                  onClick={() => setSelectedSampleSvg(svg.path)}
                >
                  <img src={svg.path} alt={svg.name} className=" h-full w-10" />
                  <span className="text-sm text-muted-foreground">
                    {svg.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
