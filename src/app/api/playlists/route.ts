
import { auth } from "@/lib/auth"
import { getUserPlaylists } from "@/lib/youtube"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const playlists = await getUserPlaylists(session.user.id)
        // Filter out Watch Later if it somehow appears (it shouldn't with mine=true usually, or unrelated)
        // But YouTube API might not return it anyway.
        return NextResponse.json(playlists)
    } catch (error) {
        console.error("Failed to fetch playlists:", error)
        return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { title, privacyStatus } = body

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 })
        }

        const { createPlaylist } = await import("@/lib/youtube")
        const newPlaylist = await createPlaylist(session.user.id, title, privacyStatus || 'private')

        return NextResponse.json(newPlaylist)
    } catch (error) {
        console.error("Failed to create playlist:", error)
        return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 })
    }
}
