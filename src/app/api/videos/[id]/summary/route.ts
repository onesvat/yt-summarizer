
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { runSummarizationPipeline } from "@/lib/ai/summarizer"
import { getUserAISettings } from "@/lib/ai/provider"

/**
 * GET /api/videos/[id]/summary — get ALL summaries for a video
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
            summaries: {
                orderBy: { createdAt: "desc" },
            },
        },
    })

    if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    if (video.summaries.length === 0) {
        return NextResponse.json({ summaries: [], status: "none" })
    }

    return NextResponse.json({
        summaries: video.summaries.map((s) => ({
            id: s.id,
            status: s.status,
            markdown: s.markdown,
            category: s.category,
            provider: s.provider,
            providerModel: s.providerModel,
            model: s.model,
            passesCompleted: s.passesCompleted,
            errorMessage: s.errorMessage,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            translations: s.translations,
        })),
    })
}

/**
 * POST /api/videos/[id]/summary — trigger NEW summarization (never overwrites)
 * id = youtubeId
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

    const body = await req.json().catch(() => ({}))
    const targetLanguage = body.targetLanguage || "en"

    const video = await prisma.video.findFirst({
        where: { youtubeId, userId: session.user.id },
    })

    if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check if any summary is currently processing
    const processing = await prisma.summary.findFirst({
        where: { videoId: video.id, status: "processing" },
    })

    if (processing) {
        const STUCK_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
        const elapsed = Date.now() - new Date(processing.updatedAt).getTime()

        if (elapsed > STUCK_TIMEOUT_MS) {
            // Mark stuck summary as failed
            await prisma.summary.update({
                where: { id: processing.id },
                data: {
                    status: "failed",
                    errorMessage: `Timed out after ${Math.round(elapsed / 60000)} minutes`,
                },
            })
            // Continue to create a new summary below
        } else {
            return NextResponse.json({ error: "Already processing" }, { status: 409 })
        }
    }

    // Get user's current AI settings to tag the summary
    const settings = await getUserAISettings(session.user.id)

    // Always create a NEW summary
    const summary = await prisma.summary.create({
        data: {
            videoId: video.id,
            status: "processing",
            provider: settings.aiProvider,
            providerModel: settings.aiModel,
            targetLanguage,
        },
    })

    // Run pipeline in background (don't await — return immediately)
    runSummarizationPipeline(youtubeId, summary.id, session.user.id, targetLanguage).catch(async (err) => {
        console.error("Summarization pipeline failed:", err)
        // Ensure the summary is marked as failed no matter what
        try {
            await prisma.summary.update({
                where: { id: summary.id },
                data: {
                    status: "failed",
                    errorMessage: err instanceof Error ? err.message : String(err),
                },
            })
        } catch (updateErr) {
            console.error("Failed to update summary status:", updateErr)
        }
    })

    return NextResponse.json({
        status: "processing",
        summaryId: summary.id,
        provider: settings.aiProvider,
        providerModel: settings.aiModel,
        message: "Summarization started",
    })
}

/**
 * DELETE /api/videos/[id]/summary — delete a specific summary
 * query param: summaryId
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
    const summaryId = searchParams.get("summaryId")
    if (!summaryId) {
        return NextResponse.json({ error: "summaryId required" }, { status: 400 })
    }

    const video = await prisma.video.findFirst({
        where: { youtubeId, userId: session.user.id },
    })

    if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const summary = await prisma.summary.findFirst({
        where: { id: summaryId, videoId: video.id },
    })

    if (!summary) {
        return NextResponse.json({ error: "Summary not found" }, { status: 404 })
    }

    await prisma.summary.delete({ where: { id: summaryId } })

    return NextResponse.json({ message: "Summary deleted" })
}
