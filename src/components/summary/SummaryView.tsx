
"use client"

import useSWR from "swr"
import { useState, useEffect, useCallback, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MermaidBlock } from "@/components/summary/MermaidBlock"
import { useAppStore } from "@/store/useAppStore"
import type { Components } from "react-markdown"
import {
    Sparkles,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Zap,
    Plus,
    Play,
    Trash2,
    Languages,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Summary {
    id: string
    status: string
    markdown: string | null
    category: string | null
    provider: string | null
    providerModel: string | null
    model: string | null
    passesCompleted: number
    errorMessage: string | null
    createdAt: string
    updatedAt: string
    translations?: string | null // JSON string
}

interface SummaryViewProps {
    videoId: string
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function summaryLabel(s: Summary) {
    const model = s.providerModel || s.model || "unknown"
    const date = formatDate(s.createdAt)
    return `${model} — ${date}`
}

export function SummaryView({ videoId }: SummaryViewProps) {
    const { data, error, isLoading, mutate } = useSWR(
        `/api/videos/${videoId}/summary`,
        fetcher,
        {
            refreshInterval: (data) => {
                if (!data?.summaries) return 0
                return data.summaries.some((s: Summary) => s.status === "processing") ? 3000 : 0
            },
        }
    )
    const [isGenerating, setIsGenerating] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [viewLanguage, setViewLanguage] = useState("en") // Current viewing language
    const setSeekToTime = useAppStore((s) => s.setSeekToTime)

    const summaries: Summary[] = data?.summaries || []

    // Auto-select newest summary on load
    useEffect(() => {
        if (summaries.length > 0 && (!selectedId || !summaries.find((s) => s.id === selectedId))) {
            setSelectedId(summaries[0].id)
        }
    }, [summaries, selectedId])

    const selected = summaries.find((s) => s.id === selectedId) || null
    const processingOne = summaries.find((s) => s.status === "processing")

    // Derived state for display content
    const displayContent = useMemo(() => {
        if (!selected) return ""
        if (viewLanguage === "en") return selected.markdown || ""

        // Check for translation
        try {
            if (selected.translations) {
                const map = JSON.parse(selected.translations)
                return map[viewLanguage] || selected.markdown || ""
            }
        } catch (e) {
            console.error("Failed to parse translations", e)
        }
        return selected.markdown || ""
    }, [selected, viewLanguage])

    const hasTranslation = useCallback((summary: Summary | null, lang: string) => {
        if (!summary || lang === "en") return true
        try {
            return summary.translations && JSON.parse(summary.translations)[lang]
        } catch { return false }
    }, [])

    const handleLanguageChange = async (lang: string) => {
        setViewLanguage(lang)
        if (lang === "en") return

        // If translation missing, fetch it
        if (selected && !hasTranslation(selected, lang)) {
            setIsTranslating(true)
            try {
                const res = await fetch(`/api/videos/${videoId}/summary/translate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        summaryId: selected.id,
                        targetLanguage: lang
                    })
                })
                const json = await res.json()
                if (json.error) throw new Error(json.error)

                // Update SWR cache locally to avoid re-fetch delay
                mutate((currentData: any) => {
                    if (!currentData?.summaries) return currentData
                    const updatedSummaries = currentData.summaries.map((s: Summary) => {
                        if (s.id === selected.id) {
                            const prevTrans = s.translations ? JSON.parse(s.translations) : {}
                            return {
                                ...s,
                                translations: JSON.stringify({
                                    ...prevTrans,
                                    [lang]: json.markdown
                                })
                            }
                        }
                        return s
                    })
                    return { ...currentData, summaries: updatedSummaries }
                }, false) // Don't revalidate immediately

            } catch (err) {
                console.error("Translation failed:", err)
                // Revert to English if failed? Or show error?
                // For now, keep selected lang but content will show English fallback
            } finally {
                setIsTranslating(false)
            }
        }
    }

    const handleGenerateNew = async () => {
        setIsGenerating(true)
        setViewLanguage("en") // Reset to English for new generation
        try {
            const res = await fetch(`/api/videos/${videoId}/summary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetLanguage: "en" }) // Always start with EN
            })
            const json = await res.json()
            if (json.summaryId) {
                setSelectedId(json.summaryId)
            }
            mutate()
        } catch (err) {
            console.error("Failed to start summarization:", err)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleTimestampClick = useCallback(
        (seconds: number) => {
            setSeekToTime(seconds)
            window.scrollTo({ top: 0, behavior: "smooth" })
        },
        [setSeekToTime]
    )

    /**
     * Markdown Components (Simplified for brevity, same logic)
     */
    const markdownComponents: Components = {
        code(props) {
            const { children, className, ...rest } = props
            const match = /language-(\w+)/.exec(className || "")
            if (match?.[1] === "mermaid") return <MermaidBlock chart={String(children).replace(/\n$/, "")} />
            if (!className) return <code className="rounded bg-primary/10 px-1.5 py-0.5 text-primary text-[0.85em] font-mono" {...rest}>{children}</code>
            return <code className={className} {...rest}>{children}</code>
        },
        a(props) {
            const { href, children, ...rest } = props
            if (href?.startsWith("yt:")) {
                const timeStr = href.substring(3)
                let seconds = 0
                if (timeStr.includes(":")) {
                    const parts = timeStr.split(":").map(Number)
                    seconds = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2]
                } else {
                    seconds = parseInt(timeStr, 10)
                }
                if (!isNaN(seconds)) {
                    return (
                        <button
                            onClick={() => handleTimestampClick(seconds)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 text-xs font-mono transition-colors cursor-pointer border border-primary/20 hover:border-primary/40 no-underline"
                            title={`Jump to ${children}`}
                        >
                            <Play className="h-2.5 w-2.5 fill-current" />
                            {children}
                        </button>
                    )
                }
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
        },
        blockquote(props) {
            return <blockquote className="border-l-4 border-primary/40 bg-primary/5 rounded-r-lg pl-4 pr-4 py-3 my-4 italic text-muted-foreground not-italic [&>p]:mb-0">{props.children}</blockquote>
        },
        table(props) {
            return <div className="my-4 overflow-x-auto rounded-lg border border-border/50"><table className="w-full text-sm" {...props} /></div>
        },
        th(props) {
            return <th className="bg-muted/50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b" {...props} />
        },
        td(props) {
            return <td className="px-4 py-2.5 border-b border-border/30" {...props} />
        },
        h2(props) { return <h2 className="text-xl font-bold mt-8 mb-4 pb-2 border-b border-border/30 first:mt-0" {...props} /> },
        h3(props) { return <h3 className="text-lg font-semibold mt-6 mb-3" {...props} /> },
        ul(props) { return <ul className="my-3 ml-1 space-y-1.5 list-disc list-outside pl-5" {...props} /> },
        ol(props) { return <ol className="my-3 ml-1 space-y-1.5 list-decimal list-outside pl-5" {...props} /> },
        hr() { return <hr className="my-8 border-border/40" /> },
    }

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }

    // No summaries yet
    if (summaries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 min-h-[300px]">
                <div className="text-center space-y-4">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-1">Generate AI Summary</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Get a deep, structured summary of this video using AI.
                        </p>
                    </div>
                    <Button onClick={handleGenerateNew} disabled={isGenerating} size="lg" className="gap-2">
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {isGenerating ? "Starting..." : "Generate Summary"}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-4">
                {/* Controls */}
                <div className="flex items-center gap-2 mb-4">
                    <select
                        value={selectedId || ""}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring truncate"
                    >
                        {summaries.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.status === "processing" ? "⏳ " : s.status === "failed" ? "❌ " : "✅ "}
                                {summaryLabel(s)}
                            </option>
                        ))}
                    </select>

                    <div className="relative">
                        <Languages className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <select
                            value={viewLanguage}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            disabled={isTranslating}
                            className="h-9 min-w-[110px] pl-9 pr-3 rounded-md border border-input bg-transparent text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring appearance-none"
                        >
                            <option value="en">English</option>
                            <option value="tr">Türkçe</option>
                        </select>
                        {isTranslating && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleGenerateNew}
                        disabled={isGenerating || !!processingOne}
                        variant="outline"
                        size="sm"
                        className="gap-1 shrink-0"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New
                    </Button>
                </div>

                {/* Processing State */}
                {selected && selected.status === "processing" && (
                    <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
                        <div className="text-center space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Generating Summary...</h3>
                                <p className="text-sm text-muted-foreground">
                                    {selected.passesCompleted === 0 && "Analyzing structure..."}
                                    {selected.passesCompleted === 1 && "Creating deep summary..."}
                                    {selected.passesCompleted >= 2 && "Finalizing..."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Failed State */}
                {selected && selected.status === "failed" && (
                    <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
                        <div className="text-center space-y-4">
                            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Summarization Failed</h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    {selected.errorMessage || "An unknown error occurred"}
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1.5"
                                onClick={async () => {
                                    await fetch(`/api/videos/${videoId}/summary?summaryId=${selected.id}`, { method: 'DELETE' })
                                    mutate()
                                }}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Drop Failed
                            </Button>
                        </div>
                    </div>
                )}

                {/* Content */}
                {selected && selected.status === "completed" && (
                    <div className="pb-8">
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <Badge variant="secondary" className="gap-1 text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                Completed
                            </Badge>
                            {selected.category && (
                                <Badge variant="outline" className="text-xs capitalize">
                                    {selected.category.replace(/_/g, " ")}
                                </Badge>
                            )}
                            {viewLanguage !== 'en' && (
                                <Badge variant="default" className="text-xs uppercase bg-blue-600 hover:bg-blue-700">
                                    {viewLanguage}
                                </Badge>
                            )}
                            {(selected.providerModel || selected.model) && (
                                <Badge variant="outline" className="text-xs gap-1">
                                    <Zap className="h-3 w-3" />
                                    {selected.providerModel || selected.model}
                                </Badge>
                            )}
                        </div>

                        {isTranslating ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p>Translating to {viewLanguage === 'tr' ? 'Turkish' : viewLanguage}...</p>
                            </div>
                        ) : (
                            <article className="prose dark:prose-invert prose-sm max-w-none prose-headings:scroll-mt-4 prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg prose-pre:my-4 prose-a:text-primary prose-img:rounded-lg">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                    components={markdownComponents}
                                >
                                    {displayContent}
                                </ReactMarkdown>
                            </article>
                        )}
                    </div>
                )}
            </div>
        </ScrollArea>
    )
}

