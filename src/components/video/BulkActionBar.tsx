
"use client"

import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { X, Play, Loader2, CheckCircle2, Trash2, FolderInput, MoreVertical } from "lucide-react"
import { useBulkActions } from "@/hooks/useBulkActions"
import { useEffect, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
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

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function BulkActionBar() {
    const { selectedVideoIds, clearSelection, selectedPlaylistId } = useAppStore()
    const { isGenerating, progress, stats, generateSummaries, cancelGeneration } = useBulkActions()
    const [showResults, setShowResults] = useState(false)
    const { mutate } = useSWRConfig()

    const { data: playlists } = useSWR('/api/playlists', fetcher)

    if (selectedVideoIds.length === 0 && !isGenerating && !showResults) return null

    const handleGenerate = async () => {
        setShowResults(false)
        await generateSummaries(selectedVideoIds)
        setShowResults(true)
    }

    const handleClear = () => {
        clearSelection()
        setShowResults(false)
    }

    const handleBulkMove = async (targetPlaylistId: string) => {
        try {
            await fetch(`/api/playlists/${targetPlaylistId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoIds: selectedVideoIds,
                    sourcePlaylistId: selectedPlaylistId
                })
            })
            mutate((key: any) => typeof key === 'string' && key.startsWith('/api/playlists'))
            mutate((key: any) => typeof key === 'string' && key.startsWith('/api/videos'))
            clearSelection()
        } catch (error) {
            console.error("Failed to move videos", error)
        }
    }

    const handleBulkRemove = async () => {
        if (!confirm(`Are you sure you want to remove ${selectedVideoIds.length} videos from the playlist?`)) return

        try {
            // Processing sequentially or parallel? Parallel is faster but might hit rate limits?
            // Let's do parallel with Promise.all for now, expecting typical batch size < 50
            await Promise.all(selectedVideoIds.map(videoId =>
                fetch(`/api/playlists/${selectedPlaylistId}/videos/${videoId}`, {
                    method: 'DELETE'
                })
            ))
            mutate((key: any) => typeof key === 'string' && key.startsWith('/api/playlists'))
            mutate((key: any) => typeof key === 'string' && key.startsWith('/api/videos'))
            clearSelection()
        } catch (error) {
            console.error("Failed to remove videos", error)
        }
    }

    return (
        <div className="absolute bottom-4 left-4 right-4 z-50">
            <div className="bg-background border rounded-lg shadow-lg p-3 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-md text-xs">
                            {selectedVideoIds.length} Selected
                        </div>
                        {isGenerating && (
                            <span className="text-xs text-muted-foreground animate-pulse">
                                Processing {stats.completed + stats.failed + 1} of {stats.total}...
                            </span>
                        )}
                        {!isGenerating && showResults && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                Done ({stats.completed} success, {stats.failed} failed)
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isGenerating && (
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5">
                                            <FolderInput className="h-3.5 w-3.5" />
                                            Move
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {playlists?.filter((p: any) => p.id !== selectedPlaylistId).map((playlist: any) => (
                                            <DropdownMenuItem
                                                key={playlist.id}
                                                onSelect={() => handleBulkMove(playlist.id)}
                                            >
                                                {playlist.snippet.title}
                                            </DropdownMenuItem>
                                        ))}
                                        {(!playlists || playlists.filter((p: any) => p.id !== selectedPlaylistId).length === 0) && (
                                            <div className="p-2 text-xs text-muted-foreground text-center">
                                                No other playlists
                                            </div>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBulkRemove}
                                    className="h-8 gap-1.5 text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remove
                                </Button>

                                <div className="w-px h-4 bg-border mx-1" />

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClear}
                                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleGenerate}
                                    className="h-8 gap-1.5"
                                >
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                    Generate Summaries
                                </Button>
                            </>
                        )}

                        {isGenerating && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={cancelGeneration}
                                className="h-8 gap-1.5"
                            >
                                <X className="h-3.5 w-3.5" />
                                Stop
                            </Button>
                        )}
                    </div>
                </div>

                {isGenerating && (
                    <Progress value={progress} className="h-1" />
                )}
            </div>
        </div>
    )
}
