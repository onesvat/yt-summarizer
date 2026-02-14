
import { generateText, getUserAISettings } from "@/lib/ai/provider"
import {
    structuralAnalysisPrompt,
    deepSummaryPrompt,
    categoryDetectionPrompt,
    translationPrompt
} from "@/lib/ai/prompts"
import { fetchTranscriptText } from "@/lib/transcript"
import { prisma } from "@/lib/prisma"
import { exportSummaryToMarkdown } from "@/lib/exporter"

const MAX_TRANSCRIPT_LENGTH = 100000 // ~100k chars

interface SummarizationResult {
    markdown: string
    category: string
    structuralAnalysis: string
    model: string
    passesCompleted: number
}

/**
 * Run the multi-pass summarization pipeline.
 * Uses the user's configured AI provider from settings.
 */
export async function runSummarizationPipeline(
    videoId: string,
    summaryId: string,
    userId: string,
    targetLanguage: string = "en"
): Promise<SummarizationResult> {
    const pipelineStart = Date.now()
    // Get user's AI settings for tagging
    const settings = await getUserAISettings(userId)
    // Fetch transcript
    let transcript: string
    try {
        transcript = await fetchTranscriptText(videoId)
    } catch (error) {
        await prisma.summary.update({
            where: { id: summaryId },
            data: {
                status: "failed",
                errorMessage: `Failed to fetch transcript: ${error instanceof Error ? error.message : String(error)}`,
            },
        })
        throw error
    }

    // Truncate very long transcripts
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
        transcript = transcript.substring(0, MAX_TRANSCRIPT_LENGTH) + "\n\n[Transcript truncated...]"
    }

    // Store transcript
    await prisma.summary.update({
        where: { id: summaryId },
        data: { transcript, status: "processing" },
    })

    // Track total usage
    const totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

    // ===== PASS 1: Structural Analysis =====
    let structuralAnalysis: string
    let category: string

    try {
        const result = await generateText(structuralAnalysisPrompt(transcript), userId)
        structuralAnalysis = result.text

        totalUsage.inputTokens += result.usage.inputTokens
        totalUsage.outputTokens += result.usage.outputTokens
        totalUsage.totalTokens += result.usage.totalTokens

        // Try to parse category from structural analysis
        try {
            const parsed = JSON.parse(structuralAnalysis)
            category = parsed.category || "general"
        } catch {
            // If JSON parsing fails, detect category separately
            const catResult = await generateText(categoryDetectionPrompt(transcript.substring(0, 3000)), userId)
            category = catResult.text.trim().toLowerCase()

            totalUsage.inputTokens += catResult.usage.inputTokens
            totalUsage.outputTokens += catResult.usage.outputTokens
            totalUsage.totalTokens += catResult.usage.totalTokens

            if (!['programming_tutorial', 'tech_talk', 'science_education', 'ai_ml', 'history', 'psychology', 'philosophy', 'health_medicine', 'business_finance', 'news_opinion', 'product_review', 'interview_podcast', 'education', 'math_engineering', 'music_arts', 'diy_howto', 'travel_culture', 'gaming'].includes(category)) {
                category = 'general'
            }
        }

        await prisma.summary.update({
            where: { id: summaryId },
            data: {
                structuralAnalysis,
                category,
                passesCompleted: 1,
                model: settings.aiModel,
                provider: settings.aiProvider,
                providerModel: settings.aiModel,
            },
        })
    } catch (error) {
        await prisma.summary.update({
            where: { id: summaryId },
            data: {
                status: "failed",
                errorMessage: `Pass 1 failed: ${error instanceof Error ? error.message : String(error)}`,
            },
        })
        throw error
    }

    // ===== PASS 2: Deep Summary =====
    let deepSummary: string

    try {
        const result = await generateText(deepSummaryPrompt(transcript, structuralAnalysis, category), userId)
        deepSummary = result.text

        totalUsage.inputTokens += result.usage.inputTokens
        totalUsage.outputTokens += result.usage.outputTokens
        totalUsage.totalTokens += result.usage.totalTokens

        await prisma.summary.update({
            where: { id: summaryId },
            data: {
                markdown: deepSummary,
                passesCompleted: 2,
            },
        })
    } catch (error) {
        await prisma.summary.update({
            where: { id: summaryId },
            data: {
                status: "failed",
                errorMessage: `Pass 2 failed: ${error instanceof Error ? error.message : String(error)}`,
            },
        })
        throw error
    }

    // ===== PASS 3 (was 4): Translation (Optional) =====
    // For English, Pass 2 result is the final markdown.
    let finalMarkdown = deepSummary

    if (targetLanguage !== "en") {
        try {
            const transResult = await generateText(
                translationPrompt(finalMarkdown, targetLanguage),
                userId
            )

            finalMarkdown = transResult.text

            totalUsage.inputTokens += transResult.usage.inputTokens
            totalUsage.outputTokens += transResult.usage.outputTokens
            totalUsage.totalTokens += transResult.usage.totalTokens
        } catch (err) {
            console.error("Translation pass failed:", err)
            // Fallback to English summary with error note
            finalMarkdown += `\n\n> **Note:** Translation to ${targetLanguage} failed. Showing original English summary.`
        }
    }

    // Append usage stats ONCE, after all passes (including translation)
    const durationSec = Math.round((Date.now() - pipelineStart) / 1000)
    finalMarkdown += `\n\n---\n*AI Usage: [Input: ${totalUsage.inputTokens} | Output: ${totalUsage.outputTokens} | Total: ${totalUsage.totalTokens} tokens | Duration: ${durationSec}s]*`

    await prisma.summary.update({
        where: { id: summaryId },
        data: {
            markdown: finalMarkdown,
            passesCompleted: targetLanguage !== "en" ? 3 : 2,
            status: "completed",
            // @ts-ignore - Prisma types might be lagging
            inputTokens: totalUsage.inputTokens,
            // @ts-ignore
            outputTokens: totalUsage.outputTokens,
            // @ts-ignore
            totalTokens: totalUsage.totalTokens,
            targetLanguage,
        },
    })

    // Trigger Markdown Export
    exportSummaryToMarkdown(summaryId).catch(err => {
        console.error("Failed to export summary to markdown:", err)
    })

    return {
        markdown: finalMarkdown,
        category,
        structuralAnalysis,
        model: settings.aiModel,
        passesCompleted: targetLanguage !== "en" ? 3 : 2,
    }
}
