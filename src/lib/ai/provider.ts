import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"
import { prisma } from "@/lib/prisma"

/**
 * Strip thinking/reasoning tokens from LLM output.
 * Handles <think> blocks, reasoning preambles, and common reasoning markers.
 */
export function stripThinkingTokens(text: string): string {
    let result = text

    // Remove <think>...</think> blocks (Gemini/DeepSeek style)
    result = result.replace(/<think>[\s\S]*?<\/think>/gi, "")

    // Remove </think> tag if it appears without opening (truncated thinking)
    result = result.replace(/<\/think>/gi, "")

    // Remove reasoning preamble before first markdown heading
    // This catches cases where the LLM outputs analysis steps before the actual content
    const firstHeadingMatch = result.match(/^([\\s\\S]*?)(#{1,6}\s)/)
    if (firstHeadingMatch) {
        const preamble = firstHeadingMatch[1]
        const preambleLines = preamble.trim().split("\n")
        // If the preamble has reasoning-like content (numbered steps, bullet analysis, etc.)
        const reasoningMarkers = [
            /^\d+\.\s+(analyze|review|draft|construct|refin|self-correct|format|check|let'?s|generat)/i,
            /^\s*-\s+(analyze|review|draft|construct|refin|self-correct|format|check)/i,
            /^\s*(analyze|review|draft|construct|refin|self-correct|format|check|let me|i need to|i will|first,|next,|finally,|now,)/i,
            /^\s*(input|output|role|goal|action|constraint|result)\s*:/i,
        ]
        const hasReasoningPreamble = preambleLines.some((line) =>
            reasoningMarkers.some((marker) => marker.test(line.trim()))
        )
        if (hasReasoningPreamble) {
            result = result.substring(firstHeadingMatch.index! + firstHeadingMatch[1].length)
        }
    }

    // Remove markdown code fences wrapping the entire output
    result = result.replace(/^```(?:markdown)?\s*\n/i, "")
    result = result.replace(/\n```\s*$/i, "")

    return result.trim()
}

export interface AISettings {
    aiProvider: string
    aiModel: string
    apiKey: string | null
    baseUrl: string | null
}

/**
 * Get AI settings for a user from the database.
 * Returns defaults if no settings exist.
 */
export async function getUserAISettings(userId: string): Promise<AISettings> {
    const settings = await prisma.userSettings.findUnique({
        where: { userId },
    })

    return {
        aiProvider: settings?.aiProvider || "gemini",
        aiModel: settings?.aiModel || "gemini-2.0-flash",
        apiKey: settings?.apiKey || null,
        baseUrl: settings?.baseUrl || null,
    }
}

export interface GenerationResult {
    text: string
    usage: {
        inputTokens: number
        outputTokens: number
        totalTokens: number
    }
}

/**
 * Generate text using the user's configured AI provider.
 */
export async function generateText(
    prompt: string,
    userId: string,
    systemInstruction?: string,
    tools?: any[]
): Promise<GenerationResult> {
    const settings = await getUserAISettings(userId)

    if (!settings.apiKey) {
        throw new Error(
            "No API key configured. Please go to Settings and add your API key."
        )
    }

    switch (settings.aiProvider) {
        case "gemini":
            return generateWithGemini(prompt, settings, systemInstruction, tools)
        case "openai":
        case "openai-compatible":
            return generateWithOpenAI(prompt, settings, systemInstruction, tools)
        default:
            throw new Error(`Unknown AI provider: ${settings.aiProvider}`)
    }
}

/**
 * Generate text with Google Gemini.
 */
async function generateWithGemini(
    prompt: string,
    settings: AISettings,
    systemInstruction?: string,
    tools?: any[]
): Promise<GenerationResult> {
    const genAI = new GoogleGenerativeAI(settings.apiKey!)
    const model = genAI.getGenerativeModel({
        model: settings.aiModel,
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(tools ? { tools } : {}),
    })

    const result = await model.generateContent(prompt)
    const text = stripThinkingTokens(result.response.text())

    // Gemini usage metadata
    const usage = result.response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 }

    return {
        text,
        usage: {
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.candidatesTokenCount,
            totalTokens: usage.totalTokenCount
        }
    }
}

/**
 * Generate text with OpenAI or OpenAI-compatible endpoints (Ollama, LMStudio, etc.).
 */
async function generateWithOpenAI(
    prompt: string,
    settings: AISettings,
    systemInstruction?: string,
    tools?: any[]
): Promise<GenerationResult> {
    const clientOptions: ConstructorParameters<typeof OpenAI>[0] = {
        apiKey: settings.apiKey!,
    }

    // For OpenAI-compatible providers, set custom base URL
    if (settings.aiProvider === "openai-compatible" && settings.baseUrl) {
        clientOptions.baseURL = settings.baseUrl
    }

    const openai = new OpenAI(clientOptions)

    const messages: OpenAI.ChatCompletionMessageParam[] = []
    if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction })
    }
    messages.push({ role: "user", content: prompt })

    // If no tools provided, just generate text normally
    if (!tools || tools.length === 0) {
        const completion = await openai.chat.completions.create({
            model: settings.aiModel,
            messages,
        })

        const text = stripThinkingTokens(completion.choices[0]?.message?.content || "")
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

        return {
            text,
            usage: {
                inputTokens: usage.prompt_tokens,
                outputTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens
            }
        }
    }

    // Tools provided: Start tool execution loop
    // Limit to 5 turns to prevent infinite loops
    let currentMessages = [...messages]
    let totalInputTokens = 0
    let totalOutputTokens = 0

    // Import tools dynamically to avoid circular dependencies if any
    const searchTools = await import("@/lib/ai/tools/search")

    for (let i = 0; i < 5; i++) {
        const completion = await openai.chat.completions.create({
            model: settings.aiModel,
            messages: currentMessages,
            tools: tools,
            tool_choice: "auto",
        })

        const message = completion.choices[0]?.message
        const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

        totalInputTokens += usage.prompt_tokens
        totalOutputTokens += usage.completion_tokens

        // If no message or no tool calls, we're done
        if (!message || !message.tool_calls || message.tool_calls.length === 0) {
            const text = stripThinkingTokens(message?.content || "")
            return {
                text,
                usage: {
                    inputTokens: totalInputTokens,
                    outputTokens: totalOutputTokens,
                    totalTokens: totalInputTokens + totalOutputTokens
                }
            }
        }

        // Handle tool calls
        currentMessages.push(message)

        for (const toolCall of message.tool_calls) {
            // @ts-ignore - OpenAI types are slightly mismatched in this version/environment
            const functionName = toolCall.function.name
            // @ts-ignore
            const functionArgs = JSON.parse(toolCall.function.arguments)

            let functionResult = ""

            try {
                if (functionName === "search_google") {
                    functionResult = await searchTools.searchGoogle(functionArgs.query)
                } else if (functionName === "search_wikipedia") {
                    functionResult = await searchTools.searchWikipedia(functionArgs.query)
                } else {
                    functionResult = `Error: Tool ${functionName} not found.`
                }
            } catch (error: any) {
                functionResult = `Error executing ${functionName}: ${error.message}`
            }

            console.log(`[AI Tool] Result from ${functionName}:`, functionResult.substring(0, 100) + "...")

            currentMessages.push({
                tool_call_id: toolCall.id,
                role: "tool",
                content: functionResult,
            })
        }
        // Loop continues to generate next response based on tool outputs
    }

    // If we reach here, we hit the loop limit
    return {
        text: "Error: Maximum tool execution turns reached.",
        usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens
        }
    }
}
