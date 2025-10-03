import { useState, useEffect } from 'react';
import { Settings, Key, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModelSettingsForm } from './ModelSettingsForm';

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        // Load API key from localStorage when dialog opens
        if (open) {
            const savedApiKey = localStorage.getItem('openrouter-api-key') || '';
            setApiKey(savedApiKey);
        }
    }, [open]);

    const handleApiKeySubmit = () => {
        if (apiKey.trim()) {
            localStorage.setItem('openrouter-api-key', apiKey.trim());
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure your API settings and AI model preferences.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="api" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="api" className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            API Key
                        </TabsTrigger>
                        <TabsTrigger value="model" className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            Model Settings
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="api" className="space-y-4">
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="api-key">OpenRouter API Key</Label>
                                <Input
                                    id="api-key"
                                    type="password"
                                    placeholder="Enter your OpenRouter API key"
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    onBlur={handleApiKeySubmit}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Your API key is required to use AI-powered SVG animations. It's stored locally in your browser.
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="model" className="space-y-4">
                        <ModelSettingsForm />
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}