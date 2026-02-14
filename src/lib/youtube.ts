
import { google } from "googleapis"
import { prisma } from "@/lib/prisma"
import { OAuth2Client } from "google-auth-library"

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXTAUTH_URL

export async function getYouTubeClient(userId: string) {
    const account = await prisma.account.findFirst({
        where: {
            userId,
            provider: "google",
        },
    })

    if (!account || !account.refresh_token) {
        throw new Error("No Google account linked or missing refresh token")
    }

    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    )

    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expires_at ? account.expires_at * 1000 : null, // database stores in seconds usually? Auth.js stores as int seconds or ms? Usually seconds (expires_at from provider). Google gives seconds.
    })

    // Start with current tokens
    // If access token is expired or about to expire, refresh it
    // Account.expires_at is usually Unix timestamp in seconds

    // Check if token is expired
    const isExpired = account.expires_at ? (Date.now() / 1000) > account.expires_at : true

    if (isExpired) {
        try {
            const { credentials } = await oauth2Client.refreshAccessToken()

            // Update DB
            await prisma.account.update({
                where: {
                    id: account.id
                },
                data: {
                    access_token: credentials.access_token,
                    expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : undefined,
                    refresh_token: credentials.refresh_token ?? account.refresh_token // Keep old if new not provided
                }
            })

            oauth2Client.setCredentials(credentials)
        } catch (error) {
            console.error("Error refreshing token", error)
            throw new Error("Failed to refresh access token")
        }
    }

    return google.youtube({
        version: "v3",
        auth: oauth2Client,
    })
}

export async function getUserPlaylists(userId: string) {
    const youtube = await getYouTubeClient(userId)

    // Fetch channels playlists
    // mine=true request returns playlists for the authenticated user
    const response = await youtube.playlists.list({
        part: ["snippet", "contentDetails"],
        mine: true,
        maxResults: 50,
    })

    return response.data.items || []
}

export async function getPlaylistVideos(userId: string, playlistId: string, pageToken?: string) {
    const youtube = await getYouTubeClient(userId)

    const response = await youtube.playlistItems.list({
        part: ["snippet", "contentDetails"],
        playlistId: playlistId,
        maxResults: 50,
        pageToken: pageToken
    })

    return {
        items: response.data.items || [],
        nextPageToken: response.data.nextPageToken,
        totalResults: response.data.pageInfo?.totalResults
    }
}

export async function getVideoDetails(userId: string, videoIds: string[]) {
    if (videoIds.length === 0) return {}

    const youtube = await getYouTubeClient(userId)

    // API limits to 50 ids per request
    const chunks = []
    for (let i = 0; i < videoIds.length; i += 50) {
        chunks.push(videoIds.slice(i, i + 50))
    }

    const detailsMap: Record<string, { duration: string }> = {}

    for (const chunk of chunks) {
        try {
            const response = await youtube.videos.list({
                part: ["contentDetails"],
                id: chunk
            })

            response.data.items?.forEach((item) => {
                if (item.id && item.contentDetails?.duration) {
                    detailsMap[item.id] = {
                        duration: item.contentDetails.duration
                    }
                }
            })
        } catch (error) {
            console.error("Error fetching video details chunk:", error)
        }
    }

    return detailsMap
}

export async function createPlaylist(userId: string, title: string, privacyStatus: 'private' | 'public' | 'unlisted' = 'private') {
    const youtube = await getYouTubeClient(userId)

    const response = await youtube.playlists.insert({
        part: ["snippet", "status"],
        requestBody: {
            snippet: {
                title: title
            },
            status: {
                privacyStatus: privacyStatus
            }
        }
    })

    return response.data
}

export async function addPlaylistItem(userId: string, playlistId: string, videoId: string) {
    const youtube = await getYouTubeClient(userId)

    const response = await youtube.playlistItems.insert({
        part: ["snippet"],
        requestBody: {
            snippet: {
                playlistId: playlistId,
                resourceId: {
                    kind: "youtube#video",
                    videoId: videoId
                }
            }
        }
    })

    return response.data
}

export async function removePlaylistItem(userId: string, playlistItemId: string) {
    const youtube = await getYouTubeClient(userId)

    await youtube.playlistItems.delete({
        id: playlistItemId
    })
}

export async function getPlaylistItemId(userId: string, playlistId: string, videoId: string) {
    const youtube = await getYouTubeClient(userId)

    const response = await youtube.playlistItems.list({
        part: ["id"],
        playlistId: playlistId,
        videoId: videoId,
        maxResults: 1
    })

    const items = response.data.items || []
    if (items.length > 0) {
        return items[0].id
    }
    return null
}
