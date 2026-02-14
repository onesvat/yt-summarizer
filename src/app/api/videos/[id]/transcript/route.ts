
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { fetchTranscript } from "@/lib/transcript"

/**
 * GET /api/videos/[id]/transcript — fetch transcript directly using JS library
 * id = youtubeId
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: videoId } = await params
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const result = await fetchTranscript(videoId)
        return NextResponse.json(result)
    } catch (error) {
        console.error("Transcript fetch error:", error)
        const message = error instanceof Error ? error.message : "Failed to fetch transcript"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
