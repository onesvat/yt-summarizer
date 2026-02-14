
import { auth } from "@/lib/auth"
import { getPlaylistVideos, getVideoDetails } from "@/lib/youtube"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: playlistId } = await params
    console.log(`[API] Fetching videos for playlistId: ${playlistId}`)

    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const { searchParams } = new URL(req.url)
    const pageToken = searchParams.get('pageToken') || undefined

    try {
        // Auto-paginate: fetch ALL videos in the playlist
        let allItems: any[] = []
        let currentPageToken = pageToken

        do {
            const { items, nextPageToken: nextToken, totalResults } = await getPlaylistVideos(userId, playlistId, currentPageToken)
            allItems = allItems.concat(items)
            currentPageToken = nextToken || undefined
        } while (currentPageToken)

        // Fetch details (duration) for all videos
        const videoIds = allItems.map(item => item.snippet?.resourceId?.videoId || item.contentDetails?.videoId).filter(Boolean)
        const videoDetails = await getVideoDetails(userId, videoIds)

        // Sync videos to database
        const videoUpdates = allItems.map(async (item: any) => {
            const videoId = item.snippet?.resourceId?.videoId || item.contentDetails?.videoId
            if (!videoId) return null

            const duration = videoDetails[videoId]?.duration || null

            const videoData = {
                youtubeId: videoId,
                title: item.snippet?.title || "Untitled",
                description: item.snippet?.description || "",
                thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
                channelName: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "",
                channelId: item.snippet?.videoOwnerChannelId || item.snippet?.channelId || "",
                duration: duration,
                publishedAt: item.contentDetails?.videoPublishedAt ? new Date(item.contentDetails.videoPublishedAt) : new Date(),
                userId: userId,
                playlistId: playlistId
            }

            return prisma.video.upsert({
                where: {
                    youtubeId_userId: {
                        youtubeId: videoData.youtubeId,
                        userId: userId
                    }
                },
                update: {
                    title: videoData.title,
                    description: videoData.description,
                    thumbnail: videoData.thumbnail,
                    channelName: videoData.channelName,
                    channelId: videoData.channelId,
                    duration: videoData.duration,
                    playlistId: playlistId
                },
                create: {
                    ...videoData
                }
            })
        })

        await Promise.all(videoUpdates)

        // Sort by added date (newest first)
        // snippet.publishedAt for a playlistItem is the date it was added to the playlist.
        allItems.sort((a, b) => {
            const dateA = new Date(a.snippet?.publishedAt || 0).getTime();
            const dateB = new Date(b.snippet?.publishedAt || 0).getTime();
            return dateB - dateA;
        });

        return NextResponse.json({
            items: allItems,
            totalResults: allItems.length,
        })

    } catch (error) {
        console.error("Failed to fetch videos:", error)
        return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 })
    }
}
