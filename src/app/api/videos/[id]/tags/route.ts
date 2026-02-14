
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * POST /api/videos/[id]/tags — assign a tag to a video
 * id = youtubeId
 * Body: { tagId: string }
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: youtubeId } = await params
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { tagId } = await req.json()
    if (!tagId) {
        return NextResponse.json({ error: "tagId is required" }, { status: 400 })
    }

    const video = await prisma.video.findFirst({
        where: { youtubeId, userId: session.user.id },
    })
    if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    try {
        await prisma.videoTag.create({
            data: { videoId: video.id, tagId },
        })
        return NextResponse.json({ success: true }, { status: 201 })
    } catch (e: any) {
        if (e.code === 'P2002') {
            return NextResponse.json({ error: "Tag already assigned" }, { status: 409 })
        }
        throw e
    }
}

/**
 * DELETE /api/videos/[id]/tags — remove a tag from a video
 * id = youtubeId
 * Query: ?tagId=xxx
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: youtubeId } = await params
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tagId = searchParams.get('tagId')
    if (!tagId) {
        return NextResponse.json({ error: "tagId is required" }, { status: 400 })
    }

    const video = await prisma.video.findFirst({
        where: { youtubeId, userId: session.user.id },
    })
    if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    await prisma.videoTag.deleteMany({
        where: { videoId: video.id, tagId },
    })

    return NextResponse.json({ success: true })
}
