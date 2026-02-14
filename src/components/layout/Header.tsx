
"use client"

import useSWR from "swr"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListVideo, LogOut, Moon, Sun, Settings } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import Link from "next/link"
import { MobileSidebar } from "@/components/layout/MobileSidebar"
import { SettingsPanel } from "@/components/settings/SettingsPanel"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Header() {
    const { data: session } = useSession()
    const { theme, setTheme } = useTheme()
    const { selectedPlaylistId, setSelectedPlaylistId } = useAppStore()
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newPlaylistName, setNewPlaylistName] = useState("")
    const [isCreating, setIsCreating] = useState(false)

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return

        setIsCreating(true)
        try {
            const res = await fetch("/api/playlists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newPlaylistName })
            })

            if (res.ok) {
                const newPlaylist = await res.json()
                // Refresh playlists or mutate SWR?
                // mutate('/api/playlists') would be ideal if we import useSWRConfig or just re-fetch
                // For simplicity, force reload or let user select it manually next time fetch happens?
                // Let's reload page for now or just close dialog.
                // Better UX: select the new playlist immediately.
                setSelectedPlaylistId(newPlaylist.id)
                setIsCreateOpen(false)
                setNewPlaylistName("")
                // Ideally trigger SWR revalidatio here
                window.location.reload() // Quick fix to refresh list for now
            }
        } catch (error) {
            console.error("Failed to create playlist", error)
        } finally {
            setIsCreating(false)
        }
    }

    const { data: playlists, error } = useSWR('/api/playlists', fetcher)

    // Auto-select first playlist if none selected
    useEffect(() => {
        if (!selectedPlaylistId && playlists && playlists.length > 0) {
            setSelectedPlaylistId(playlists[0].id)
        }
    }, [playlists, selectedPlaylistId, setSelectedPlaylistId])

    const currentPlaylist = playlists?.find((p: any) => p.id === selectedPlaylistId)

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden">
                <div className="flex h-14 items-center px-4 gap-3">
                    <div className="flex items-center gap-2 font-semibold text-lg md:text-xl shrink-0">
                        <MobileSidebar />
                        <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => useAppStore.getState().toggleSidebar()}>
                            <ListVideo className="h-6 w-6 text-primary" />
                        </Button>
                        <span className="hidden md:inline">YT Summarizer</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full max-w-[200px] justify-between">
                                    <span className="truncate">{currentPlaylist ? currentPlaylist.snippet.title : "Select Playlist"}</span>
                                    <ListVideo className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[200px] h-[300px] overflow-y-auto">
                                <DropdownMenuItem onSelect={() => setIsCreateOpen(true)} className="text-primary font-medium cursor-pointer bg-primary/10 mb-1">
                                    + Create New Playlist
                                </DropdownMenuItem>
                                {playlists?.map((playlist: any) => (
                                    <DropdownMenuItem
                                        key={playlist.id}
                                        onClick={() => setSelectedPlaylistId(playlist.id)}
                                    >
                                        {playlist.snippet.title}
                                    </DropdownMenuItem>
                                ))}
                                {(!playlists || playlists.length === 0) && (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                        No playlists found
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
                            <Settings className="h-5 w-5" />
                            <span className="sr-only">Settings</span>
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => signOut()}>
                            <LogOut className="h-4 w-4" />
                            <span className="sr-only">Sign out</span>
                        </Button>
                    </div>
                </div>
            </header>

            <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Playlist</DialogTitle>
                        <DialogDescription>
                            Create a new private playlist on YouTube to organize your videos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                placeholder="My Helper Playlist"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim() || isCreating}>
                            {isCreating ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
