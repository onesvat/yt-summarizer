
"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TagBadge } from "@/components/tags/TagBadge"
import { Plus, Loader2 } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TAG_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
]

interface TagManagerProps {
    videoId: string
    videoTags: { id: string; name: string; color: string | null }[]
    onUpdate: () => void
}

export function TagManager({ videoId, videoTags, onUpdate }: TagManagerProps) {
    const { data: allTags, mutate: mutateTags } = useSWR('/api/tags', fetcher)
    const [newTagName, setNewTagName] = useState("")
    const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])
    const [isCreating, setIsCreating] = useState(false)
    const [showCreate, setShowCreate] = useState(false)

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return
        setIsCreating(true)
        try {
            await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTagName.trim(), color: selectedColor }),
            })
            setNewTagName("")
            setShowCreate(false)
            mutateTags()
        } catch (err) {
            console.error("Failed to create tag:", err)
        } finally {
            setIsCreating(false)
        }
    }

    const handleAssignTag = async (tagId: string) => {
        try {
            await fetch(`/api/videos/${videoId}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagId }),
            })
            onUpdate()
        } catch (err) {
            console.error("Failed to assign tag:", err)
        }
    }

    const handleRemoveTag = async (tagId: string) => {
        try {
            await fetch(`/api/videos/${videoId}/tags?tagId=${tagId}`, {
                method: 'DELETE',
            })
            onUpdate()
        } catch (err) {
            console.error("Failed to remove tag:", err)
        }
    }

    const handleDeleteTag = async (tagId: string) => {
        try {
            await fetch(`/api/tags?id=${tagId}`, { method: 'DELETE' })
            mutateTags()
            onUpdate()
        } catch (err) {
            console.error("Failed to delete tag:", err)
        }
    }

    const assignedIds = new Set(videoTags.map(t => t.id))
    const availableTags = (allTags || []).filter((t: any) => !assignedIds.has(t.id))

    return (
        <div className="space-y-3">
            {/* Currently assigned tags */}
            {videoTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {videoTags.map(tag => (
                        <TagBadge
                            key={tag.id}
                            name={tag.name}
                            color={tag.color}
                            onRemove={() => handleRemoveTag(tag.id)}
                        />
                    ))}
                </div>
            )}

            {/* Available tags to assign */}
            {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {availableTags.map((tag: any) => (
                        <Button
                            key={tag.id}
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs px-2 gap-1"
                            style={tag.color ? { borderColor: tag.color + '60', color: tag.color } : {}}
                            onClick={() => handleAssignTag(tag.id)}
                        >
                            <Plus className="h-3 w-3" />
                            {tag.name}
                        </Button>
                    ))}
                </div>
            )}

            {/* Create new tag */}
            {showCreate ? (
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Tag name"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            className="h-8 text-sm flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                        />
                        <Button onClick={handleCreateTag} disabled={isCreating} size="sm" className="h-8">
                            {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                        </Button>
                    </div>
                    <div className="flex gap-1">
                        {TAG_COLORS.map(color => (
                            <button
                                key={color}
                                className={`h-5 w-5 rounded-full border-2 transition-transform ${selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setSelectedColor(color)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => setShowCreate(true)}
                >
                    <Plus className="h-3 w-3" />
                    New tag
                </Button>
            )}
        </div>
    )
}
