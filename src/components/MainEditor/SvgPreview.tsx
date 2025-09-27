import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useAnimationStore } from '@/stores/animationStore'

const SAMPLE_SVGS = [
  { name: 'Phone Call', path: '/sampleSvg/phone-call.svg' }
]

interface SvgPreviewProps {
  svgFile: File | null
  selectedSampleSvg: string | null
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSampleSvgSelect: (svgPath: string) => void
  onClearSvg: () => void
}

export function SvgPreview({ 
  svgFile, 
  selectedSampleSvg, 
  onFileChange, 
  onSampleSvgSelect, 
  onClearSvg 
}: SvgPreviewProps) {
  const { svgContent, svgUri, setSvgContent, setSvgUri } = useAnimationStore()
  const [isLoading, setIsLoading] = useState(false)
  const hasSvg = svgFile || selectedSampleSvg

  useEffect(() => {
    const loadSvgContent = async () => {
      if (!hasSvg) {
        setSvgContent('')
        setSvgUri('')
        return
      }

      setIsLoading(true)
      try {
        if (svgFile) {
          // Read uploaded SVG file
          const content = await svgFile.text()
          const uri = URL.createObjectURL(svgFile)
          setSvgContent(content)
          setSvgUri(uri)
        } else if (selectedSampleSvg) {
          // Fetch sample SVG
          const response = await fetch(selectedSampleSvg)
          const content = await response.text()
          setSvgContent(content)
          setSvgUri(selectedSampleSvg)
        }
      } catch (error) {
        console.error('Error loading SVG:', error)
        setSvgContent('')
        setSvgUri('')
      } finally {
        setIsLoading(false)
      }
    }

    loadSvgContent()
  }, [svgFile, selectedSampleSvg, hasSvg, setSvgContent, setSvgUri])

  // Cleanup object URL when component unmounts or SVG changes
  useEffect(() => {
    return () => {
      if (svgFile && svgUri && svgUri.startsWith('blob:')) {
        URL.revokeObjectURL(svgUri)
      }
    }
  }, [svgFile, svgUri])

  return (
    <div className="h-full bg-muted/10 flex items-center justify-center">
      {hasSvg ? (
        <div className="flex flex-col items-center justify-center h-full p-4 w-full">
          {/* Header with file name and clear button */}
          <div className="flex items-center justify-between w-full mb-4">
            <span className="text-muted-foreground font-medium truncate flex-1">
              {svgFile ? svgFile.name : selectedSampleSvg?.split('/').pop()?.replace('.svg', '')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSvg}
              className="text-muted-foreground hover:text-foreground ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* SVG Content */}
          <div className="flex-1 flex items-center justify-center w-full">
            {isLoading ? (
              <div className="text-muted-foreground">Loading SVG...</div>
            ) : svgContent ? (
              <div 
                className="max-w-full max-h-full flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svgContent }}
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
            onChange={onFileChange}
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
              {SAMPLE_SVGS.map((svg) => (
                <div
                  key={svg.path}
                  className="border-2 border-muted-foreground p-2 rounded-md flex-col items-center justify-center"
                  onClick={() => onSampleSvgSelect(svg.path)}
                >
                  <img src={svg.path} alt={svg.name} className=" h-full w-10" />
                  <span className="text-sm text-muted-foreground">{svg.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
