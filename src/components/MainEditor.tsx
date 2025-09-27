import { useState, useEffect } from 'react'
import { Header } from './MainEditor/Header'
import { MainContent } from './MainEditor/MainContent'
import { ApiKeyDialog } from './ApiKeyDialog'
import { useThemeStore } from '@/stores/themeStore'

export function MainEditor() {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [svgFile, setSvgFile] = useState<File | null>(null)
  const [selectedSampleSvg, setSelectedSampleSvg] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>('')
  const { theme } = useThemeStore()

  useEffect(() => {
    // Load API key from localStorage on component mount
    const savedApiKey = localStorage.getItem('openrouter-api-key')
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
  }, [])

  useEffect(() => {
    // Apply theme class to document element
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSvgFile(file)
    setSelectedSampleSvg(null) // Clear sample SVG when uploading a file
  }

  const handleSampleSvgSelect = (svgPath: string) => {
    setSelectedSampleSvg(svgPath)
    setSvgFile(null) // Clear uploaded file when selecting sample
  }

  const handleClearSvg = () => {
    setSvgFile(null)
    setSelectedSampleSvg(null)
  }

  const handleApiKeySubmit = (newApiKey: string) => {
    localStorage.setItem('openrouter-api-key', newApiKey)
    setApiKey(newApiKey)
    setShowApiKeyDialog(false)
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      <Header onSettingsClick={() => setShowApiKeyDialog(true)} />
      
      <MainContent
        svgFile={svgFile}
        selectedSampleSvg={selectedSampleSvg}
        onFileChange={handleFileChange}
        onSampleSvgSelect={handleSampleSvgSelect}
        onClearSvg={handleClearSvg}
      />

      {/* API Key Dialog */}
      <ApiKeyDialog 
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        onSubmit={handleApiKeySubmit}
      />
    </div>
  )
}
