import { Settings, Download, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/themeStore';

interface HeaderProps {
  onSettingsClick: () => void;
  onExportClick: () => void;
}

export function Header({ onSettingsClick, onExportClick }: HeaderProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4">
      <h1 className="text-xl font-semibold">SVG Motion</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onSettingsClick}>
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={onExportClick}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
