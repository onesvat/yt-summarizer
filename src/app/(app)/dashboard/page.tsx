
"use client"

import { useAppStore } from "@/store/useAppStore"
import { MainPanel } from "@/components/layout/MainPanel"

export default function DashboardPage() {
    const { selectedVideoId } = useAppStore()

    if (!selectedVideoId) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/5">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Welcome to YT Summarizer</h2>
                    <p>Select a playlist and a video to get started.</p>
                </div>
            </div>
        )
    }

    return <MainPanel videoId={selectedVideoId} />
}
