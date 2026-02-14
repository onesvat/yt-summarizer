
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { VideoPlayer } from "@/components/video/VideoPlayer"
import { SummaryView } from "@/components/summary/SummaryView"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { TranscriptView } from "@/components/video/TranscriptView"
import { TagManager } from "@/components/tags/TagManager"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import useSWR from "swr"
import {
    BookOpen,
    MessageSquare,
    FileText,
    Tags,
    Eye,
    EyeOff,
    Trash2,
    RotateCcw,
    ChevronUp,
    ChevronDown,
} from "lucide-react"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface MainPanelProps {
    videoId: string
}

export function MainPanel({ videoId }: MainPanelProps) {
    const {
        videoMeta,
        setVideoMeta,
        isVideoPlayerOpen,
        toggleVideoPlayer
    } = useAppStore()

    // Local state for tags, not persisted for now as per plan
    const [showTags, setShowTags] = useState(false)

    const meta = videoMeta[videoId]

    const { data: dbVideo, mutate: mutateVideo } = useSWR(
        `/api/videos/${videoId}`,
        fetcher
    )

    const handleToggleRead = async () => {
        const newIsRead = !meta?.isRead
        setVideoMeta(videoId, { isRead: newIsRead })
        await fetch(`/api/videos/${videoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: newIsRead }),
        })
        mutateVideo()
    }

    const handleToggleRemoved = async () => {
        const newIsRemoved = !meta?.isRemoved
        setVideoMeta(videoId, { isRemoved: newIsRemoved })
        await fetch(`/api/videos/${videoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRemoved: newIsRemoved }),
        })
        mutateVideo()
    }

    const videoTags = dbVideo?.videoTags?.map((vt: any) => vt.tag) || meta?.tags || []

    return (
        <div className="flex h-full flex-col">
            {/* Video Player (collapsible) */}
            <div className="border-b">
                <button
                    onClick={toggleVideoPlayer}
                    className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
                >
                    <span className="font-medium">{dbVideo?.title || "Video Player"}</span>
                    {isVideoPlayerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isVideoPlayerOpen && (
                    <div className="px-4 pb-3">
                        <VideoPlayer videoId={videoId} />
                    </div>
                )}
            </div>

            {/* Actions bar */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b flex-wrap">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleToggleRead}
                >
                    {meta?.isRead ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {meta?.isRead ? "Mark unread" : "Mark read"}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleToggleRemoved}
                >
                    {meta?.isRemoved ? <RotateCcw className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                    {meta?.isRemoved ? "Restore" : "Remove"}
                </Button>
                <Button
                    variant={showTags ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowTags(!showTags)}
                >
                    <Tags className="h-3 w-3" />
                    Tags
                </Button>
            </div>

            {/* Tag manager (collapsible) */}
            {showTags && (
                <div className="px-4 py-3 border-b bg-muted/20">
                    <TagManager
                        videoId={videoId}
                        videoTags={videoTags}
                        onUpdate={() => mutateVideo()}
                    />
                </div>
            )}

            {/* Tabbed content */}
            <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 pt-2 border-b">
                    <TabsList>
                        <TabsTrigger value="summary" className="gap-1.5 text-xs">
                            <BookOpen className="h-3.5 w-3.5" />
                            Summary
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="gap-1.5 text-xs">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Chat
                        </TabsTrigger>
                        <TabsTrigger value="transcript" className="gap-1.5 text-xs">
                            <FileText className="h-3.5 w-3.5" />
                            Transcript
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="summary" className="flex-1 overflow-hidden p-0 m-0">
                    <SummaryView videoId={videoId} />
                </TabsContent>

                <TabsContent value="chat" className="flex-1 overflow-hidden p-0 m-0">
                    <ChatPanel videoId={videoId} />
                </TabsContent>

                <TabsContent value="transcript" className="flex-1 overflow-hidden p-0 m-0">
                    <TranscriptView videoId={videoId} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
