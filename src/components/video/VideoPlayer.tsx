
"use client"

import { useEffect, useRef, useCallback } from "react"
import { useAppStore } from "@/store/useAppStore"

interface VideoPlayerProps {
    videoId: string
}

/**
 * YouTube video player with programmatic seek support.
 * Uses the YouTube IFrame Player API so we can call seekTo()
 * when timestamps are clicked in the summary.
 */
export function VideoPlayer({ videoId }: VideoPlayerProps) {
    const playerRef = useRef<YT.Player | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const seekToTime = useAppStore((s) => s.seekToTime)
    const setSeekToTime = useAppStore((s) => s.setSeekToTime)

    // Load the YouTube IFrame API script once
    useEffect(() => {
        if (typeof window === "undefined") return
        if ((window as any).YT?.Player) return // already loaded

        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        tag.async = true
        const firstScript = document.getElementsByTagName("script")[0]
        firstScript?.parentNode?.insertBefore(tag, firstScript)
    }, [])

    // Create/recreate the player when videoId changes
    useEffect(() => {
        if (typeof window === "undefined") return

        function createPlayer() {
            if (!containerRef.current) return

            // Destroy previous player
            if (playerRef.current) {
                try {
                    playerRef.current.destroy()
                } catch { /* ignore */ }
                playerRef.current = null
            }

            playerRef.current = new YT.Player(containerRef.current, {
                videoId,
                width: "100%",
                height: "100%",
                playerVars: {
                    rel: 0,
                    modestbranding: 1,
                    playsinline: 1,
                },
            })
        }

        if ((window as any).YT?.Player) {
            createPlayer()
        } else {
            // Wait for API to load
            ; (window as any).onYouTubeIframeAPIReady = createPlayer
        }

        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy()
                } catch { /* ignore */ }
                playerRef.current = null
            }
        }
    }, [videoId])

    // Handle seekToTime changes from the store
    const handleSeek = useCallback((time: number) => {
        if (playerRef.current?.seekTo) {
            playerRef.current.seekTo(time, true)
            playerRef.current.playVideo?.()
        }
    }, [])

    useEffect(() => {
        if (seekToTime !== null) {
            handleSeek(seekToTime)
            setSeekToTime(null) // reset after seeking
        }
    }, [seekToTime, handleSeek, setSeekToTime])

    return (
        <div className="rounded-lg overflow-hidden border bg-black aspect-video w-full max-w-3xl mx-auto shadow-lg">
            <div ref={containerRef} className="w-full h-full" />
        </div>
    )
}
