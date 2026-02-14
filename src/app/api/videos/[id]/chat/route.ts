
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { generateChatResponse, getSuggestedQuestions } from "@/lib/ai/chat"

/**
 * GET /api/videos/[id]/chat — get chat history + suggested questions
 * id = youtubeId
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
            chatMessages: { orderBy: { createdAt: 'asc' } },
        },
    })

    if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Get suggested questions if no chat history
    let suggestions: string[] = []
    if (video.chatMessages.length === 0) {
        suggestions = await getSuggestedQuestions(video.id, session.user.id)
    }

    return NextResponse.json({
        messages: video.chatMessages,
        suggestions,
    })
}

/**
 * POST /api/videos/[id]/chat — send a chat message
 * id = youtubeId
 * Body: { message: string }
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

    const { message } = await req.json()
    if (!message) {
        return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const video = await prisma.video.findFirst({
        where: { youtubeId, userId: session.user.id },
    })

    if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Store user message
    await prisma.chatMessage.create({
        data: {
            videoId: video.id,
            role: "user",
            content: message,
        },
    })

    // Generate response
    try {
        const response = await generateChatResponse(video.id, message, session.user.id)

        // Store assistant message
        const assistantMessage = await prisma.chatMessage.create({
            data: {
                videoId: video.id,
                role: "assistant",
                content: response,
            },
        })

        return NextResponse.json({
            message: assistantMessage,
        })
    } catch (error) {
        console.error("Chat error:", error)
        return NextResponse.json(
            { error: "Failed to generate response. " + (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        )
    }
}
