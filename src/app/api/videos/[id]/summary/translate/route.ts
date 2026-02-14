
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { generateText, getUserAISettings } from "@/lib/ai/provider"
import { translationPrompt } from "@/lib/ai/prompts"

/**
 * POST /api/videos/[id]/summary/translate
 * Body: { summaryId: string, targetLanguage: string }
 * 
 * Translate an existing summary to a target language.
 * Stores the translation in the `translations` JSON field of the Summary model.
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
    const { summaryId, targetLanguage } = body

    if (!summaryId || !targetLanguage) {
        return NextResponse.json({ error: "summaryId and targetLanguage required" }, { status: 400 })
    }

    // 1. Fetch summary
    const summary = await prisma.summary.findUnique({
        where: { id: summaryId },
    })

    if (!summary) {
        return NextResponse.json({ error: "Summary not found" }, { status: 404 })
    }

    // Check ownership (via video)
    const video = await prisma.video.findUnique({
        where: { id: summary.videoId },
    })

    if (!video || video.userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // 2. Check if translation already exists
    let translations: Record<string, string> = {}
    try {
        if (summary.translations) {
            translations = JSON.parse(summary.translations)
        }
    } catch (e) {
        console.error("Failed to parse translations JSON", e)
    }

    if (translations[targetLanguage]) {
        return NextResponse.json({
            markdown: translations[targetLanguage],
            cached: true
        })
    }

    // 3. Generate translation
    // Get user's AI settings
    const settings = await getUserAISettings(session.user.id)

    // If the original summary is empty or failed, we can't translate
    if (!summary.markdown) {
        return NextResponse.json({ error: "Original summary content is empty" }, { status: 400 })
    }

    try {
        const transResult = await generateText(
            translationPrompt(summary.markdown, targetLanguage),
            session.user.id
        )

        const translatedMarkdown = transResult.text

        // 4. Save translation
        translations[targetLanguage] = translatedMarkdown

        await prisma.summary.update({
            where: { id: summaryId },
            data: {
                translations: JSON.stringify(translations),
                // Update token usage approximately
                inputTokens: { increment: transResult.usage.inputTokens },
                outputTokens: { increment: transResult.usage.outputTokens },
                totalTokens: { increment: transResult.usage.totalTokens },
            }
        })

        return NextResponse.json({
            markdown: translatedMarkdown,
            cached: false
        })

    } catch (error) {
        console.error("Translation failed:", error)
        return NextResponse.json({
            error: "Translation failed",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
