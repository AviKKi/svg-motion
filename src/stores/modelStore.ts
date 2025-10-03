import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type QuantizationType =
    | 'int4'
    | 'int8'
    | 'fp4'
    | 'fp6'
    | 'fp8'
    | 'fp16'
    | 'bf16'
    | 'fp32'
    | 'unknown';

export type SortType = 'price' | 'throughput' | 'latency';

export interface ProviderRoutingPreferences {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: 'allow' | 'deny';
    only?: string[];
    ignore?: string[];
    quantizations?: QuantizationType[];
    sort?: SortType;
    max_price?: {
        prompt?: number | string;
        completion?: number | string;
        image?: number | string;
        audio?: number | string;
        request?: number | string;
    };
}

interface ModelSettings {
    modelId: string;
    temperature: number;
    providerPreferences: ProviderRoutingPreferences;
}

interface ModelState {
    settings: ModelSettings;
    updateModelId: (modelId: string) => void;
    updateTemperature: (temperature: number) => void;
    updateMaxPrice: (completion: number) => void;
    updateQuantizations: (quantizations: QuantizationType[]) => void;
    updateSort: (sort: SortType | undefined) => void;
    resetToDefaults: () => void;
}

const defaultSettings: ModelSettings = {
    modelId: 'qwen/qwen3-coder:nitro',
    temperature: 0.2,
    providerPreferences: {
        quantizations: ['fp8'],
        max_price: { completion: 4 },
        // sort: 'throughput', // optional; ':nitro' already prioritizes throughput
    },
};

export const useModelStore = create<ModelState>()(
    persist(
        (set, get) => ({
            settings: defaultSettings,

            updateModelId: (modelId: string) => {
                set(state => ({
                    settings: {
                        ...state.settings,
                        modelId,
                    },
                }));
            },

            updateTemperature: (temperature: number) => {
                set(state => ({
                    settings: {
                        ...state.settings,
                        temperature,
                    },
                }));
            },

            updateMaxPrice: (completion: number) => {
                set(state => ({
                    settings: {
                        ...state.settings,
                        providerPreferences: {
                            ...state.settings.providerPreferences,
                            max_price: {
                                ...state.settings.providerPreferences.max_price,
                                completion,
                            },
                        },
                    },
                }));
            },

            updateQuantizations: (quantizations: QuantizationType[]) => {
                set(state => ({
                    settings: {
                        ...state.settings,
                        providerPreferences: {
                            ...state.settings.providerPreferences,
                            quantizations,
                        },
                    },
                }));
            },

            updateSort: (sort: SortType | undefined) => {
                set(state => ({
                    settings: {
                        ...state.settings,
                        providerPreferences: {
                            ...state.settings.providerPreferences,
                            sort,
                        },
                    },
                }));
            },

            resetToDefaults: () => {
                set({ settings: { ...defaultSettings } });
            },
        }),
        {
            name: 'model-settings-storage',
        }
    )
);