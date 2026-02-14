
"use client"

import useSWR from "swr"
import { useAppStore } from "@/store/useAppStore"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { VideoFilters } from "@/components/video/VideoFilters"
import { cn, parseDuration, formatDuration } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { PlayCircle, CheckCircle2, Trash2, RotateCcw, MoreVertical, FolderInput } from "lucide-react"
import { useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { BulkActionBar } from "@/components/video/BulkActionBar"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Sidebar() {
    const {
        selectedPlaylistId,
        selectedVideoId,
        setSelectedVideoId,
        searchQuery,
        readFilter,
        tagFilter,
        showRemoved,
        videoMeta,
        setVideoMetaBatch,
        sortOrder,
        selectedVideoIds,
        toggleVideoSelection,
        setVideoSelection,
        clearSelection
    } = useAppStore()

    const { data: videoData, isLoading, mutate: mutateVideos } = useSWR(
        selectedPlaylistId ? `/api/playlists/${selectedPlaylistId}/videos` : null,
        fetcher
    )

    const { data: playlists } = useSWR('/api/playlists', fetcher)

    // Fetch video metadata from DB
    const { data: dbVideos, mutate: mutateDbVideos } = useSWR(
        selectedPlaylistId ? `/api/videos?playlistId=${selectedPlaylistId}` : null,
        fetcher
    )

    // Sync DB metadata to store
    useEffect(() => {
        if (dbVideos && Array.isArray(dbVideos)) {
            const metas: Record<string, any> = {}
            dbVideos.forEach((v: any) => {
                metas[v.youtubeId] = {
                    isRead: v.isRead,
                    isRemoved: v.isRemoved,
                    tags: v.videoTags?.map((vt: any) => vt.tag) || [],
                    summaryStatus: v.summaries?.[0]?.status,
                    duration: v.duration,
                    publishedAt: v.publishedAt
                }
            })
            setVideoMetaBatch(metas)
        }
    }, [dbVideos, setVideoMetaBatch])

    const handleMoveVideo = async (videoId: string, targetPlaylistId: string) => {
        try {
            await fetch(`/api/playlists/${targetPlaylistId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoIds: [videoId],
                    sourcePlaylistId: selectedPlaylistId
                })
            })
            mutateVideos()
            mutateDbVideos() // Refresh DB state to clear isRemoved if it was somehow set, or update
        } catch (error) {
            console.error("Failed to move video", error)
        }
    }

    const handleRemoveVideo = async (videoId: string) => {
        if (!confirm("Are you sure you want to remove this video from the playlist?")) return

        try {
            await fetch(`/api/playlists/${selectedPlaylistId}/videos/${videoId}`, {
                method: 'DELETE'
            })
            mutateVideos()
            mutateDbVideos()
        } catch (error) {
            console.error("Failed to remove video", error)
        }
    }

    const videos = videoData?.items || []

    // Filter videos
    const filteredVideos = useMemo(() => {
        return videos.filter((video: any) => {
            const videoId = video.snippet?.resourceId?.videoId
            const title = video.snippet?.title || ""
            const channel = video.snippet?.videoOwnerChannelTitle || ""
            const meta = videoMeta[videoId]

            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                if (!title.toLowerCase().includes(q) && !channel.toLowerCase().includes(q)) {
                    return false
                }
            }

            // Read filter
            if (readFilter === 'read' && !meta?.isRead) return false
            if (readFilter === 'unread' && meta?.isRead) return false

            // Removed filter
            if (!showRemoved && meta?.isRemoved) return false

            // Tag filter
            if (tagFilter && meta?.tags) {
                if (!meta.tags.some((t: any) => t.id === tagFilter)) return false
            } else if (tagFilter && !meta?.tags) {
                return false
            }

            return true
        }).sort((a: any, b: any) => {
            const idA = a.snippet?.resourceId?.videoId
            const idB = b.snippet?.resourceId?.videoId
            const metaA = videoMeta[idA]
            const metaB = videoMeta[idB]

            // Default 'added' uses original API order (index)
            if (sortOrder === 'added') return 0

            if (sortOrder === 'newest') {
                const dateA = metaA?.publishedAt ? new Date(metaA.publishedAt).getTime() : 0
                const dateB = metaB?.publishedAt ? new Date(metaB.publishedAt).getTime() : 0
                return dateB - dateA
            }

            if (sortOrder === 'oldest') {
                const dateA = metaA?.publishedAt ? new Date(metaA.publishedAt).getTime() : 0
                const dateB = metaB?.publishedAt ? new Date(metaB.publishedAt).getTime() : 0
                return dateA - dateB
            }

            if (sortOrder === 'duration_asc') {
                const durA = parseDuration(metaA?.duration)
                const durB = parseDuration(metaB?.duration)
                return durA - durB
            }

            if (sortOrder === 'duration_desc') {
                const durA = parseDuration(metaA?.duration)
                const durB = parseDuration(metaB?.duration)
                return durB - durA
            }

            return 0
        })
    }, [videos, searchQuery, readFilter, showRemoved, tagFilter, videoMeta, sortOrder])

    if (!selectedPlaylistId) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
                <PlayCircle className="mb-4 h-12 w-12 opacity-20" />
                <p>Select a playlist from the header to view videos.</p>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col border-r bg-muted/10 min-h-0">
            <VideoFilters />

            <div className="px-4 py-2 font-semibold text-xs text-muted-foreground border-b flex justify-between items-center bg-muted/20">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-primary/50 text-primary focus:ring-primary/40 cursor-pointer"
                        checked={filteredVideos.length > 0 && filteredVideos.every((v: any) => selectedVideoIds.includes(v.snippet.resourceId.videoId))}
                        onChange={(e) => {
                            if (e.target.checked) {
                                const allIds = filteredVideos.map((v: any) => v.snippet.resourceId.videoId)
                                useAppStore.getState().setVideoSelection([...new Set([...selectedVideoIds, ...allIds])])
                            } else {
                                useAppStore.getState().clearSelection()
                            }
                        }}
                    />
                    <span>{filteredVideos.length} of {videos.length} Videos</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="flex flex-col gap-0.5 p-1.5">
                    {isLoading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex gap-3 p-2.5">
                                <Skeleton className="h-14 w-24 rounded-md shrink-0" />
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <Skeleton className="h-3.5 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))
                    ) : (
                        filteredVideos.map((video: any) => {
                            const videoId = video.snippet.resourceId.videoId
                            const title = video.snippet.title
                            const channel = video.snippet.videoOwnerChannelTitle
                            const thumbnail = video.snippet.thumbnails?.default?.url
                            const meta = videoMeta[videoId]
                            const isRead = meta?.isRead
                            const isRemoved = meta?.isRemoved
                            const tags = meta?.tags || []

                            return (
                                <div
                                    key={video.id}
                                    className={cn(
                                        "flex gap-3 rounded-lg p-2.5 text-left text-sm transition-all hover:bg-accent group relative",
                                        selectedVideoId === videoId && "bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/20",
                                        isRead && selectedVideoId !== videoId && "opacity-60",
                                        isRemoved && "opacity-40"
                                    )}
                                >
                                    {/* Selection Checkbox */}
                                    <div className={cn(
                                        "absolute left-2 top-1/2 -translate-y-1/2 z-10",
                                        selectedVideoIds.includes(videoId) ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"
                                    )}>
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-primary text-primary focus:ring-primary/40 cursor-pointer"
                                            checked={selectedVideoIds.includes(videoId)}
                                            onChange={(e) => {
                                                e.stopPropagation()
                                                toggleVideoSelection(videoId)
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>

                                    {/* Action Menu */}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <FolderInput className="mr-2 h-4 w-4" />
                                                        <span>Move to...</span>
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent className="max-h-[200px] overflow-y-auto w-[200px]">
                                                        {playlists?.filter((p: any) => p.id !== selectedPlaylistId).map((playlist: any) => (
                                                            <DropdownMenuItem
                                                                key={playlist.id}
                                                                onSelect={() => handleMoveVideo(videoId, playlist.id)}
                                                            >
                                                                {playlist.snippet.title}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        {(!playlists || playlists.filter((p: any) => p.id !== selectedPlaylistId).length === 0) && (
                                                            <div className="p-2 text-xs text-muted-foreground text-center">
                                                                No other playlists
                                                            </div>
                                                        )}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onSelect={() => handleRemoveVideo(videoId)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Remove from Watchlist</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <button
                                        onClick={() => setSelectedVideoId(videoId)}
                                        className="flex gap-3 w-full text-left"
                                    >
                                        <div className={cn(
                                            "relative shrink-0 overflow-hidden rounded-md w-24 h-[54px] bg-muted transition-all",
                                            (selectedVideoIds.includes(videoId)) && "ml-6" // Shift content when selected or hovering (optional, but keep simple for now)
                                        )}>
                                            {thumbnail && (
                                                <img
                                                    src={thumbnail}
                                                    alt={title}
                                                    className="h-full w-full object-cover"
                                                />
                                            )}
                                            {isRead && (
                                                <div className="absolute top-0.5 right-0.5">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 drop-shadow" />
                                                </div>
                                            )}
                                            {isRemoved && (
                                                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-0.5 overflow-hidden w-full min-w-0">
                                            <div className="font-medium line-clamp-2 leading-tight text-[13px]">
                                                {title}
                                            </div>
                                            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                <div className="truncate">{channel}</div>
                                                <div className="shrink-0">{formatDuration(meta?.duration)}</div>
                                            </div>
                                            {tags.length > 0 && (
                                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                    {tags.map((tag: any) => (
                                                        <Badge
                                                            key={tag.id}
                                                            variant="secondary"
                                                            className="text-[9px] px-1 py-0 h-4"
                                                            style={tag.color ? { backgroundColor: tag.color + '30', color: tag.color, borderColor: tag.color + '50' } : {}}
                                                        >
                                                            {tag.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            )
                        })
                    )}
                    {!isLoading && filteredVideos.length === 0 && videos.length > 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No videos match your filters.
                        </div>
                    )}

                </div>
            </div>
            <BulkActionBar />
        </div>
    )
}
