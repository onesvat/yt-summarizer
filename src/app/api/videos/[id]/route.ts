
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * PATCH /api/videos/[id] — update video state (isRead, isRemoved)
 * id = youtubeId
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: youtubeId } = await params
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { isRead, isRemoved } = body

    const video = await prisma.video.findFirst({
        where: { youtubeId, userId: session.user.id },
    })

    if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const updated = await prisma.video.update({
        where: { id: video.id },
        data: {
            ...(isRead !== undefined ? { isRead, readAt: isRead ? new Date() : null } : {}),
            ...(isRemoved !== undefined ? { isRemoved } : {}),
        },
    })

    return NextResponse.json(updated)
}

/**
 * GET /api/videos/[id] — get single video by youtubeId
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: youtubeId } = await params
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const video = await prisma.video.findFirst({
        where: { youtubeId, userId: session.user.id },
        include: {
            summaries: true,
            videoTags: { include: { tag: true } },
            chatMessages: { orderBy: { createdAt: 'asc' } },
        },
    })

    if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(video)
}
