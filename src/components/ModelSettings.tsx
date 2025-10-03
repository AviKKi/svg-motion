import { useState, useEffect } from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useModelStore, type QuantizationType, type SortType } from '@/stores/modelStore';

interface ModelSettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ModelSettings({ open, onOpenChange }: ModelSettingsProps) {
    const { settings, updateModelId, updateTemperature, updateMaxPrice, updateQuantizations, updateSort, resetToDefaults } = useModelStore();

    // Local state for form fields
    const [modelId, setModelId] = useState(settings.modelId);
    const [temperature, setTemperature] = useState(settings.temperature);
    const [maxPrice, setMaxPrice] = useState(settings.providerPreferences.max_price?.completion || 4);
    const [selectedQuantizations, setSelectedQuantizations] = useState<QuantizationType[]>(
        settings.providerPreferences.quantizations || ['fp8']
    );
    const [sortBy, setSortBy] = useState<SortType | undefined>(settings.providerPreferences.sort);

    // Update local state when store changes
    useEffect(() => {
        setModelId(settings.modelId);
        setTemperature(settings.temperature);
        setMaxPrice(settings.providerPreferences.max_price?.completion || 4);
        setSelectedQuantizations(settings.providerPreferences.quantizations || ['fp8']);
        setSortBy(settings.providerPreferences.sort);
    }, [settings]);

    const quantizationOptions: QuantizationType[] = [
        'int4', 'int8', 'fp4', 'fp6', 'fp8', 'fp16', 'bf16', 'fp32'
    ];

    const sortOptions: SortType[] = ['price', 'throughput', 'latency'];

    const handleSave = () => {
        updateModelId(modelId);
        updateTemperature(temperature);
        updateMaxPrice(Number(maxPrice));
        updateQuantizations(selectedQuantizations);
        updateSort(sortBy);
        onOpenChange(false);
    };

    const handleReset = () => {
        resetToDefaults();
    };

    const handleQuantizationChange = (quantization: QuantizationType, checked: boolean) => {
        if (checked) {
            setSelectedQuantizations(prev => [...prev, quantization]);
        } else {
            setSelectedQuantizations(prev => prev.filter(q => q !== quantization));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Model Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure AI model settings including model selection, pricing limits, and performance preferences.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Model ID */}
                    <div className="grid gap-2">
                        <Label htmlFor="model-id">Model ID</Label>
                        <Input
                            id="model-id"
                            type="text"
                            placeholder="e.g., qwen/qwen3-coder:nitro"
                            value={modelId}
                            onChange={e => setModelId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            The AI model to use. ":nitro" suffix prioritizes throughput.
                        </p>
                    </div>

                    {/* Temperature */}
                    <div className="grid gap-2">
                        <Label htmlFor="temperature">Temperature</Label>
                        <Input
                            id="temperature"
                            type="number"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={e => setTemperature(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Controls randomness (0.0 = deterministic, 2.0 = very creative)
                        </p>
                    </div>

                    {/* Max Price */}
                    <div className="grid gap-2">
                        <Label htmlFor="max-price">Max Price ($/M tokens)</Label>
                        <Input
                            id="max-price"
                            type="number"
                            min="0"
                            step="0.1"
                            value={maxPrice}
                            onChange={e => setMaxPrice(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Maximum price per million output tokens. Helps control costs.
                        </p>
                    </div>

                    {/* Quantizations */}
                    <div className="grid gap-2">
                        <Label>Quantization Preferences</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {quantizationOptions.map(quantization => (
                                <label key={quantization} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedQuantizations.includes(quantization)}
                                        onChange={e => handleQuantizationChange(quantization, e.target.checked)}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{quantization}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Model precision formats. Lower precision (e.g., fp8) is faster but less accurate.
                        </p>
                    </div>

                    {/* Sort */}
                    <div className="grid gap-2">
                        <Label htmlFor="sort">Sort Providers By</Label>
                        <select
                            id="sort"
                            value={sortBy || ''}
                            onChange={e => setSortBy(e.target.value as SortType || undefined)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">Default (none)</option>
                            {sortOptions.map(option => (
                                <option key={option} value={option}>
                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                            How to prioritize model providers. Default lets ":nitro" handle optimization.
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Reset to Defaults
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            Save Settings
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}