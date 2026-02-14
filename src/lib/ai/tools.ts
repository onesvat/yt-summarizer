
/**
 * AI Tool definitions and configuration helpers.
 */

// Gemini Google Search Grounding Tool
export const GEMINI_SEARCH_TOOL = { googleSearch: {} }

/**
 * Get the appropriate search tool configuration based on the provider.
 */
export function getSearchTool(aiProvider: string): any[] | undefined {
    // Only Gemini supports the native Google Search tool structure for now
    if (aiProvider === "gemini") {
        return [GEMINI_SEARCH_TOOL]
    }

    // OpenAI / OpenAI-compatible function calling tools for search
    if (aiProvider === "openai" || aiProvider === "openai-compatible") {
        return [
            {
                type: "function",
                function: {
                    name: "search_google",
                    description: "Search the web for current information, facts, or recent events. Uses Google Search via Serper.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "The search query to use."
                            }
                        },
                        required: ["query"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "search_wikipedia",
                    description: "Search Wikipedia for general knowledge, history, definitions, and summaries of topics.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "The search query (topic name) to use."
                            }
                        },
                        required: ["query"]
                    }
                }
            }
        ]
    }

    return undefined
}
