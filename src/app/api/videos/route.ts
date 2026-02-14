
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * GET /api/videos — list user's videos, optionally filtered by playlistId
 */
export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const playlistId = searchParams.get('playlistId')

    const videos = await prisma.video.findMany({
        where: {
            userId: session.user.id,
            ...(playlistId ? { playlistId } : {}),
        },
        include: {
            videoTags: {
                include: {
                    tag: true,
                },
            },
            summaries: {
                select: {
                    status: true,
                },
            },
        },
        orderBy: { addedAt: 'desc' },
    })

    return NextResponse.json(videos)
}
