"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check, AlertCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PROVIDERS = [
    {
        id: "gemini",
        name: "Google Gemini",
        description: "Google's Gemini models",
        models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash-preview-05-20", "gemini-2.5-pro-preview-05-06"],
    },
    {
        id: "openai",
        name: "OpenAI",
        description: "GPT-4o, GPT-4o-mini, etc.",
        models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3-mini"],
    },
    {
        id: "openai-compatible",
        name: "OpenAI Compatible",
        description: "Ollama, LM Studio, vLLM, etc.",
        models: [],
    },
]

interface SettingsPanelProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
    const { data, mutate } = useSWR(open ? "/api/settings" : null, fetcher)

    const [provider, setProvider] = useState("gemini")
    const [model, setModel] = useState("gemini-2.0-flash")
    const [apiKey, setApiKey] = useState("")
    const [baseUrl, setBaseUrl] = useState("")
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState("")

    // Sync from server data
    useEffect(() => {
        if (data && !data.error) {
            setProvider(data.aiProvider || "gemini")
            setModel(data.aiModel || "gemini-2.0-flash")
            setApiKey(data.apiKey || "")
            setBaseUrl(data.baseUrl || "")
        }
    }, [data])

    const selectedProvider = PROVIDERS.find((p) => p.id === provider)

    // When provider changes, set a default model
    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider)
        const prov = PROVIDERS.find((p) => p.id === newProvider)
        if (prov && prov.models.length > 0) {
            setModel(prov.models[0])
        } else {
            setModel("")
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setError("")
        setSaved(false)

        try {
            const res = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aiProvider: provider,
                    aiModel: model,
                    apiKey: apiKey || undefined,
                    baseUrl: baseUrl || undefined,
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to save")
            }

            mutate()
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>AI Settings</DialogTitle>
                    <DialogDescription>
                        Configure your AI provider, model, and API key.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Provider</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {PROVIDERS.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => handleProviderChange(p.id)}
                                    className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 ${provider === p.id
                                        ? "border-primary bg-accent/30 ring-1 ring-primary/20"
                                        : "border-border"
                                        }`}
                                >
                                    <span className="font-medium text-sm">{p.name}</span>
                                    <span className="text-xs text-muted-foreground">{p.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="space-y-2">
                        <Label htmlFor="apiKey" className="text-sm font-medium">API Key</Label>
                        <Input
                            id="apiKey"
                            type="password"
                            placeholder={provider === "openai-compatible" ? "Optional for local models" : "Enter your API key"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        {data?.hasApiKey && apiKey.startsWith("••••••") && (
                            <p className="text-xs text-muted-foreground">
                                API key is set. Enter a new value to change it.
                            </p>
                        )}
                    </div>

                    {/* Base URL (only for OpenAI-compatible) */}
                    {provider === "openai-compatible" && (
                        <div className="space-y-2">
                            <Label htmlFor="baseUrl" className="text-sm font-medium">Base URL</Label>
                            <Input
                                id="baseUrl"
                                type="url"
                                placeholder="http://localhost:11434/v1"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Ollama: http://localhost:11434/v1 — LM Studio: http://localhost:1234/v1
                            </p>
                        </div>
                    )}

                    {/* Model */}
                    <div className="space-y-2">
                        <Label htmlFor="model" className="text-sm font-medium">Model</Label>
                        {selectedProvider && selectedProvider.models.length > 0 ? (
                            <div className="space-y-2">
                                <select
                                    id="model"
                                    value={selectedProvider.models.includes(model) ? model : "custom"}
                                    onChange={(e) => {
                                        if (e.target.value === "custom") {
                                            setModel("")
                                        } else {
                                            setModel(e.target.value)
                                        }
                                    }}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    {selectedProvider.models.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                    <option value="custom">Custom...</option>
                                </select>
                                {!selectedProvider.models.includes(model) && (
                                    <Input
                                        placeholder="Enter custom model name"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                    />
                                )}
                            </div>
                        ) : (
                            <Input
                                id="model"
                                placeholder="e.g. llama3.1, mistral, deepseek-r1"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                            />
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {/* Save */}
                    <Button
                        onClick={handleSave}
                        disabled={saving || !model}
                        className="w-full"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : saved ? (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Saved!
                            </>
                        ) : (
                            "Save Settings"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
