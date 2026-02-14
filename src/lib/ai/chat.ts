import { generateText, getUserAISettings } from "@/lib/ai/provider"
import { prisma } from "@/lib/prisma"
import { getSearchTool } from "@/lib/ai/tools"

const SYSTEM_INSTRUCTION = [
    "You are a helpful AI assistant that answers questions about a YouTube video.",
    "You have access to the video's summary and transcript.",
    "Use this context to provide accurate, helpful answers.",
    "You contain knowledge up to your training cutoff, but you have access to Google Search to find current information.",
    "Use search to verify facts, find definitions, or get updates on topics discussed in the video.",
    "If the user asks about something not covered in the video, use search to help them.",
    "Be conversational and friendly. Format your responses in markdown when helpful.",
    "If you reference specific parts, mention approximate timestamps when available.",
].join(" ")

/**
 * Generate a chat response for a video, using transcript + summary as context.
 */
export async function generateChatResponse(
    dbVideoId: string,
    userMessage: string,
    userId: string
): Promise<string> {
    const video = await prisma.video.findUnique({
        where: { id: dbVideoId },
        include: {
            summaries: {
                where: { status: "completed" },
                orderBy: { createdAt: "desc" },
                take: 1,
            },
            chatMessages: {
                orderBy: { createdAt: "asc" },
                take: 20,
            },
        },
    })

    if (!video) throw new Error("Video not found")

    // Build context parts
    const lines: string[] = []
    lines.push("VIDEO: " + JSON.stringify(video.title) + " by " + (video.channelName || "Unknown"))

    const latestSummary = video.summaries[0]

    if (latestSummary?.markdown) {
        lines.push("")
        lines.push("VIDEO SUMMARY:")
        lines.push(latestSummary.markdown)
    }

    if (latestSummary?.transcript) {
        lines.push("")
        lines.push("TRANSCRIPT (partial):")
        lines.push(latestSummary.transcript.substring(0, 10000))
    }

    // Conversation history
    if (video.chatMessages.length > 0) {
        lines.push("")
        lines.push("CONVERSATION HISTORY:")
        for (const msg of video.chatMessages) {
            const role = msg.role === "user" ? "Human" : "Assistant"
            lines.push(role + ": " + msg.content)
            lines.push("")
        }
    }

    lines.push("")
    lines.push("Human: " + userMessage)
    lines.push("")
    lines.push("Provide a helpful response:")

    const settings = await getUserAISettings(userId)
    const tools = getSearchTool(settings.aiProvider)

    const prompt = lines.join("\n")
    const result = await generateText(prompt, userId, SYSTEM_INSTRUCTION, tools)

    return result.text
}

/**
 * Get suggested questions for a video based on its content.
 */
export async function getSuggestedQuestions(dbVideoId: string, userId: string): Promise<string[]> {
    const video = await prisma.video.findUnique({
        where: { id: dbVideoId },
        include: { summaries: { where: { status: "completed" }, take: 1, orderBy: { createdAt: "desc" } } },
    })

    if (!video || !video.summaries[0]?.markdown) {
        return [
            "What is this video about?",
            "What are the key takeaways?",
            "Can you explain the main concepts?",
        ]
    }

    try {
        const prompt = [
            "Based on this video summary, suggest 4 interesting questions a viewer might ask.",
            "Return ONLY a JSON array of strings, no other text.",
            "",
            "SUMMARY:",
            video.summaries[0].markdown.substring(0, 3000),
        ].join("\n")

        const result = await generateText(prompt, userId)
        const questions = JSON.parse(result.text)
        if (Array.isArray(questions)) return questions.slice(0, 4)
    } catch {
        // Fallback
    }

    return [
        "What is this video about?",
        "What are the key takeaways?",
        "Can you explain the main concepts?",
        "What are the practical applications?",
    ]
}
