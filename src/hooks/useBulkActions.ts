
import { useState, useCallback } from "react"
import { useSWRConfig } from "swr"

interface BulkActionStats {
    total: number
    completed: number
    failed: number
    skipped: number
}

interface UseBulkActionsReturn {
    isGenerating: boolean
    progress: number // 0-100
    currentVideoId: string | null
    stats: BulkActionStats
    generateSummaries: (videoIds: string[], targetLanguage?: string) => Promise<void>
    cancelGeneration: () => void
}

export function useBulkActions(): UseBulkActionsReturn {
    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null)
    const [stats, setStats] = useState<BulkActionStats>({ total: 0, completed: 0, failed: 0, skipped: 0 })
    const [abortController, setAbortController] = useState<AbortController | null>(null)
    const { mutate } = useSWRConfig()

    const cancelGeneration = useCallback(() => {
        if (abortController) {
            abortController.abort()
            setAbortController(null)
        }
        setIsGenerating(false)
        setCurrentVideoId(null)
    }, [abortController])

    const generateSummaries = useCallback(async (videoIds: string[], targetLanguage: string = "en") => {
        if (videoIds.length === 0) return

        setIsGenerating(true)
        setProgress(0)
        setStats({ total: videoIds.length, completed: 0, failed: 0, skipped: 0 })

        const controller = new AbortController()
        setAbortController(controller)

        try {
            for (let i = 0; i < videoIds.length; i++) {
                if (controller.signal.aborted) break

                const videoId = videoIds[i]
                setCurrentVideoId(videoId)

                try {
                    let summaryId: string | null = null

                    // Try to start summarization, handle 409 (already processing)
                    let startRes = await fetch(`/api/videos/${videoId}/summary`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ targetLanguage }),
                        signal: controller.signal
                    })

                    if (startRes.status === 409) {
                        // Already processing — wait 5s then retry (server will auto-expire stuck ones)
                        await new Promise(resolve => setTimeout(resolve, 5000))
                        startRes = await fetch(`/api/videos/${videoId}/summary`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ targetLanguage }),
                            signal: controller.signal
                        })
                    }

                    if (!startRes.ok) {
                        const errJson = await startRes.json().catch(() => ({}))
                        throw new Error(errJson.error || `Failed to start summary for ${videoId}`)
                    }

                    const startJson = await startRes.json()
                    summaryId = startJson.summaryId

                    if (!summaryId) {
                        throw new Error(`No summaryId returned for ${videoId}`)
                    }

                    // Poll for completion with client-side timeout (10 min)
                    const POLL_TIMEOUT_MS = 10 * 60 * 1000
                    const pollStart = Date.now()
                    let isComplete = false

                    while (!isComplete) {
                        if (controller.signal.aborted) break
                        if (Date.now() - pollStart > POLL_TIMEOUT_MS) {
                            console.warn(`Client-side timeout for ${videoId}, moving on`)
                            setStats(prev => ({ ...prev, failed: prev.failed + 1 }))
                            break
                        }

                        await new Promise(resolve => setTimeout(resolve, 3000))

                        const checkRes = await fetch(`/api/videos/${videoId}/summary`, {
                            signal: controller.signal
                        })
                        const checkJson = await checkRes.json()
                        const summary = checkJson.summaries?.find((s: any) => s.id === summaryId)

                        if (summary) {
                            if (summary.status === 'completed') {
                                isComplete = true
                                setStats(prev => ({ ...prev, completed: prev.completed + 1 }))
                            } else if (summary.status === 'failed') {
                                isComplete = true
                                setStats(prev => ({ ...prev, failed: prev.failed + 1 }))
                            }
                        }
                    }

                    mutate(`/api/videos/${videoId}/summary`)

                } catch (error) {
                    if (controller.signal.aborted) break
                    console.error(`Bulk action error for ${videoId}:`, error)
                    setStats(prev => ({ ...prev, failed: prev.failed + 1 }))
                }

                setProgress(Math.round(((i + 1) / videoIds.length) * 100))
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsGenerating(false)
                setCurrentVideoId(null)
                setAbortController(null)
            }
        }
    }, [mutate])

    return {
        isGenerating,
        progress,
        currentVideoId,
        stats,
        generateSummaries,
        cancelGeneration
    }
}
