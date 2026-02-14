
import { auth } from "@/lib/auth"
import { removePlaylistItem, getPlaylistItemId } from "@/lib/youtube"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, videoId: string }> }
) {
    const { id: playlistId, videoId } = await params
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    try {
        const playlistItemId = await getPlaylistItemId(userId, playlistId, videoId)

        if (playlistItemId) {
            await removePlaylistItem(userId, playlistItemId)
        } else {
            console.warn(`Refusing to delete video ${videoId} from playlist ${playlistId} because it was not found in YouTube playlist.`)
            // Still try to update DB state just in case
        }

        // Mark as removed in DB instead of deleting record
        await prisma.video.update({
            where: {
                youtubeId_userId: {
                    youtubeId: videoId,
                    userId: userId
                }
            },
            data: {
                isRemoved: true,
                playlistId: null // Or keep it to know where it was? Maybe null is better to signify it's not in *that* playlist anymore.
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Failed to remove video from playlist:", error)
        return NextResponse.json({ error: "Failed to remove video" }, { status: 500 })
    }
}
