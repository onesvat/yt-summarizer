
"use client"

import useSWR from "swr"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { formatTimestamp } from "@/lib/utils"
import { Clock, AlertCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface TranscriptViewProps {
    videoId: string
}

export function TranscriptView({ videoId }: TranscriptViewProps) {
    const { data, error, isLoading } = useSWR(
        `/api/videos/${videoId}/transcript`,
        fetcher
    )

    if (isLoading) {
        return (
            <div className="space-y-3 p-4">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="h-4 w-12 shrink-0" />
                        <Skeleton className="h-4 flex-1" />
                    </div>
                ))}
            </div>
        )
    }

    if (error || data?.error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                    {data?.error || "Failed to load transcript"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    Make sure the transcript service is running on port 8001
                </p>
            </div>
        )
    }

    const transcript = data?.transcript || []

    if (transcript.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                No transcript available for this video.
            </div>
        )
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-1">
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Language: {data?.language || "unknown"}</span>
                    <span className="text-xs">({transcript.length} segments)</span>
                </div>
                {transcript.map((segment: any, index: number) => (
                    <div
                        key={index}
                        className="flex gap-3 py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors group"
                    >
                        <span className="text-xs text-muted-foreground font-mono shrink-0 w-12 pt-0.5 group-hover:text-primary transition-colors">
                            {formatTimestamp(segment.start)}
                        </span>
                        <p className="text-sm leading-relaxed">{segment.text}</p>
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}
