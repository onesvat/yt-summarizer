import { YoutubeTranscript } from "youtube-transcript-plus"
import { prisma } from "@/lib/prisma"

export interface TranscriptSegment {
    text: string
    start: number
    duration: number
}

export interface TranscriptResult {
    video_id: string
    language: string
    transcript: TranscriptSegment[]
}

/**
 * Look up a cached transcript for the given YouTube video ID.
 * Returns null on cache miss.
 */
async function getCachedTranscript(videoId: string): Promise<TranscriptResult | null> {
    const video = await prisma.video.findFirst({
        where: { youtubeId: videoId, transcriptData: { not: null } },
        select: { transcriptData: true },
    })

    if (!video?.transcriptData) return null

    try {
        return JSON.parse(video.transcriptData) as TranscriptResult
    } catch {
        return null
    }
}

/**
 * Persist a transcript to the database so future requests skip the YouTube API.
 */
async function cacheTranscript(videoId: string, result: TranscriptResult): Promise<void> {
    try {
        await prisma.video.updateMany({
            where: { youtubeId: videoId },
            data: { transcriptData: JSON.stringify(result) },
        })
    } catch (error) {
        // Non-fatal — log and continue
        console.error("Failed to cache transcript:", error)
    }
}

/**
 * Fetch transcript for a YouTube video.
 * Checks the database cache first; falls back to YouTube API on miss.
 * Set skipCache=true to force a fresh fetch from YouTube.
 */
export async function fetchTranscript(
    videoId: string,
    lang: string = "en",
    skipCache: boolean = false
): Promise<TranscriptResult> {
    // 1. Check cache
    if (!skipCache) {
        const cached = await getCachedTranscript(videoId)
        if (cached) return cached
    }

    // 2. Fetch from YouTube API
    const attempts: Array<{ lang?: string; label: string }> = [
        { lang, label: lang },
        { lang: undefined, label: "any" },
    ]

    let lastError: Error | null = null

    for (const attempt of attempts) {
        try {
            const opts = attempt.lang ? { lang: attempt.lang } : {}
            const segments = await YoutubeTranscript.fetchTranscript(videoId, opts)

            if (segments.length === 0) continue // skip empty results

            const result: TranscriptResult = {
                video_id: videoId,
                language: segments[0]?.lang || attempt.label,
                transcript: segments.map((seg) => ({
                    text: seg.text,
                    start: seg.offset / 1000,
                    duration: seg.duration / 1000,
                })),
            }

            // 3. Cache for next time
            await cacheTranscript(videoId, result)

            return result
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            const msg = lastError.message.toLowerCase()

            // If transcripts are disabled entirely, don't retry
            if (msg.includes("disabled")) {
                throw new Error("Transcripts are disabled for this video")
            }
        }
    }

    const msg = lastError?.message || "Unknown error"
    if (msg.toLowerCase().includes("not available") || msg.toLowerCase().includes("no transcript")) {
        throw new Error("No transcript found for this video")
    }
    throw new Error(`Failed to fetch transcript: ${msg}`)
}

/**
 * Fetch transcript as a single string with timestamps (used by summarizer).
 */
export async function fetchTranscriptText(videoId: string): Promise<string> {
    const result = await fetchTranscript(videoId)

    return result.transcript
        .map((seg) => {
            const minutes = Math.floor(seg.start / 60)
            const seconds = Math.floor(seg.start % 60)
            return `[${minutes}:${seconds.toString().padStart(2, "0")}] ${seg.text}`
        })
        .join("\n")
}
