import { useState, useEffect } from 'react';
import { Header } from './MainEditor/Header';
import { MainContent } from './MainEditor/MainContent';
import { SettingsDialog } from './SettingsDialog';
import { ExportDialog } from './ExportDialog';
import { useThemeStore } from '@/stores/themeStore';

export function MainEditor() {
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const { theme } = useThemeStore();

  useEffect(() => {
    // Apply theme class to document element
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="h-screen w-screen flex flex-col">
      <Header
        onSettingsClick={() => setShowSettingsDialog(true)}
        onExportClick={() => setShowExportDialog(true)}
      />

      <MainContent />

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  );
}
