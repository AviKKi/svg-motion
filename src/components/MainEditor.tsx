import { useState, useEffect } from 'react';
import { Header } from './MainEditor/Header';
import { MainContent } from './MainEditor/MainContent';
import { ApiKeyDialog } from './ApiKeyDialog';
import { useThemeStore } from '@/stores/themeStore';

export function MainEditor() {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  // @ts-ignore
  const [apiKey, setApiKey] = useState<string>('');
  const { theme } = useThemeStore();

  useEffect(() => {
    // Load API key from localStorage on component mount
    const savedApiKey = localStorage.getItem('openrouter-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  useEffect(() => {
    // Apply theme class to document element
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // SVG state is managed in the animation store now

  const handleApiKeySubmit = (newApiKey: string) => {
    localStorage.setItem('openrouter-api-key', newApiKey);
    setApiKey(newApiKey);
    setShowApiKeyDialog(false);
  };

  return (
    <div className="h-screen w-screen flex flex-col">
      <Header onSettingsClick={() => setShowApiKeyDialog(true)} />

      <MainContent />

      {/* API Key Dialog */}
      <ApiKeyDialog
        open={showApiKeyDialog}
        onOpenChange={setShowApiKeyDialog}
        onSubmit={handleApiKeySubmit}
      />
    </div>
  );
}
