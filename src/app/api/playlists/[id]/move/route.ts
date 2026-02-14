
import { auth } from "@/lib/auth"
import { addPlaylistItem, removePlaylistItem, getPlaylistItemId } from "@/lib/youtube"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: targetPlaylistId } = await params
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { videoIds, sourcePlaylistId } = body

        if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
            return NextResponse.json({ error: "videoIds array is required" }, { status: 400 })
        }

        console.log(`[API] Moving videos ${videoIds.join(',')} from ${sourcePlaylistId} to ${targetPlaylistId}`)

        const userId = session.user.id
        const results = []

        for (const videoId of videoIds) {
            try {
                // 1. Add to new playlist
                await addPlaylistItem(userId, targetPlaylistId, videoId)

                // 2. Remove from source playlist if provided
                if (sourcePlaylistId) {
                    const playlistItemId = await getPlaylistItemId(userId, sourcePlaylistId, videoId)
                    if (playlistItemId) {
                        await removePlaylistItem(userId, playlistItemId)
                    }
                }

                // 3. Update database to reflect new playlist
                await prisma.video.update({
                    where: {
                        youtubeId_userId: {
                            youtubeId: videoId,
                            userId: userId
                        }
                    },
                    data: {
                        playlistId: targetPlaylistId,
                        isRemoved: false // Ensure it's not marked as removed in the new playlist
                    }
                })

                results.push({ videoId, status: "success" })

            } catch (error) {
                console.error(`Failed to move video ${videoId}:`, error)
                results.push({ videoId, status: "failed", error: "Failed to move video" })
            }
        }

        return NextResponse.json({ results })

    } catch (error) {
        console.error("Failed to move videos:", error)
        return NextResponse.json({ error: "Failed to move videos" }, { status: 500 })
    }
}
