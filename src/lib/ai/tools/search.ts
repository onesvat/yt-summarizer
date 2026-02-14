/**
 * Search Tools Implementation
 * Supports Google Search (via Serper.dev) and Wikipedia (via API)
 */

interface SearchResult {
    title: string
    link: string
    snippet: string
}

const SERPER_API_URL = "https://google.serper.dev/search"
const GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1"
const WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"

/**
 * Search the web using Serper.dev (Google Search wrapper).
 * Requires SERPER_API_KEY environment variable.
 * Fallbacks to legacy Google Custom Search if configured.
 */
export async function searchGoogle(query: string): Promise<string> {
    const apiKey = process.env.SERPER_API_KEY

    // Fallback to Google Custom Search if configured (for backward compatibility)
    if (!apiKey && process.env.GOOGLE_SEARCH_API_KEY) {
        return searchGoogleLegacy(query)
    }

    if (!apiKey) {
        console.warn("Serper API Key not found. Skipping search.")
        return "Error: Serper Search is not configured. Please set SERPER_API_KEY in your .env file."
    }

    try {
        const response = await fetch(SERPER_API_URL, {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: query
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Serper API Error:", errorText)
            return `Error performing Search: ${response.statusText}`
        }

        const data = await response.json()
        const organic = data.organic || []

        if (organic.length === 0) {
            return "No search results found."
        }

        const results = organic.slice(0, 5).map((item: any) => {
            return `Title: ${item.title}\nLink: ${item.link}\nSnippet: ${item.snippet}\n`
        }).join("\n---\n")

        // Also include answer box or knowledge graph if available
        let extraInfo = ""
        if (data.answerBox) {
            extraInfo += `Answer: ${data.answerBox.answer || data.answerBox.snippet}\n\n`
        }
        if (data.knowledgeGraph) {
            extraInfo += `Knowledge Graph: ${data.knowledgeGraph.title} - ${data.knowledgeGraph.description}\n\n`
        }

        return `Search Results for "${query}":\n\n${extraInfo}${results}`

    } catch (error) {
        console.error("Serper Search Exception:", error)
        return "An error occurred while performing search."
    }
}

/**
 * Legacy Google Custom Search (Backup)
 */
async function searchGoogleLegacy(query: string): Promise<string> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY
    const cx = process.env.GOOGLE_SEARCH_CX

    if (!apiKey || !cx) return "Error: configured legacy search key missing."

    try {
        const url = `${GOOGLE_SEARCH_URL}?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`
        const response = await fetch(url)

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Google Search API Error:", errorText)
            return `Error performing Google Search: ${response.statusText}`
        }

        const data = await response.json()
        const items = data.items || []

        if (items.length === 0) {
            return "No Google Search results found."
        }

        const results = items.slice(0, 5).map((item: any) => {
            return `Title: ${item.title}\nLink: ${item.link}\nSnippet: ${item.snippet}\n`
        }).join("\n---\n")

        return `Google Search Results for "${query}":\n\n${results}`

    } catch (error) {
        console.error("Google Search Exception:", error)
        return "An error occurred while performing Google Search."
    }
}

/**
 * Search Wikipedia using the MediaWiki API.
 * No API key required.
 */
export async function searchWikipedia(query: string): Promise<string> {
    try {
        // 1. Search for pages matching the query
        const searchUrl = `${WIKIPEDIA_API_URL}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
        const searchResponse = await fetch(searchUrl)

        if (!searchResponse.ok) {
            return `Error searching Wikipedia: ${searchResponse.statusText}`
        }

        const searchData = await searchResponse.json()
        const searchResults = searchData.query?.search || []

        if (searchResults.length === 0) {
            return "No Wikipedia articles found."
        }

        // Get the top result's page ID/title to fetch the summary
        // For simplicity, we'll just return the snippets from the search results for now,
        // as they often contain enough context.
        // To get full summaries, we'd need a second call (action=query&prop=extracts).

        // Let's try to get extracts for the top 3 results to be more useful
        const pageIds = searchResults.slice(0, 3).map((r: any) => r.pageid).join("|")
        const extractsUrl = `${WIKIPEDIA_API_URL}?action=query&prop=extracts&pageids=${pageIds}&exintro=true&explaintext=true&format=json&origin=*`

        const extractsResponse = await fetch(extractsUrl)
        if (!extractsResponse.ok) {
            // Fallback to snippets if extract fetch fails
            const snippets = searchResults.slice(0, 3).map((r: any) => `Title: ${r.title}\nSnippet: ${r.snippet.replace(/<[^>]+>/g, "")}`).join("\n\n")
            return `Wikipedia Search Results (Snippets):\n${snippets}`
        }

        const extractsData = await extractsResponse.json()
        const pages = extractsData.query?.pages || {}

        const extracts = Object.values(pages).map((page: any) => {
            return `Title: ${page.title}\nSummary: ${page.extract}\nLink: https://en.wikipedia.org/?curid=${page.pageid}`
        }).join("\n\n---\n\n")

        return `Wikipedia Search Results for "${query}":\n\n${extracts}`

    } catch (error) {
        console.error("Wikipedia Search Exception:", error)
        return "An error occurred while searching Wikipedia."
    }
}
