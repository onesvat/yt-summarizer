
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * GET /api/tags — list user's tags
 */
export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tags = await prisma.tag.findMany({
        where: { userId: session.user.id },
        orderBy: { name: 'asc' },
    })

    return NextResponse.json(tags)
}

/**
 * POST /api/tags — create a new tag
 */
export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, color } = await req.json()
    if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    try {
        const tag = await prisma.tag.create({
            data: {
                name,
                color: color || null,
                userId: session.user.id,
            },
        })
        return NextResponse.json(tag, { status: 201 })
    } catch (e: any) {
        if (e.code === 'P2002') {
            return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
        }
        throw e
    }
}

/**
 * DELETE /api/tags?id=xxx — delete a tag
 */
export async function DELETE(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tagId = searchParams.get('id')
    if (!tagId) {
        return NextResponse.json({ error: "Tag ID is required" }, { status: 400 })
    }

    // Verify ownership
    const tag = await prisma.tag.findFirst({
        where: { id: tagId, userId: session.user.id },
    })
    if (!tag) {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 })
    }

    // Delete associated VideoTags first, then the tag
    await prisma.videoTag.deleteMany({ where: { tagId } })
    await prisma.tag.delete({ where: { id: tagId } })

    return NextResponse.json({ success: true })
}
