
import fs from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import { getYouTubeClient } from "@/lib/youtube"

/**
 * Sanitize filenames to be filesystem safe
 */
function sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-_]/gi, "").trim().replace(/\s+/g, " ")
}

/**
 * Export a summary to a markdown file with Obsidian-compatible frontmatter.
 * 
 * Folder Structure:
 * data/{user_email_or_id}/{playlist_name}/{channel_name} - {video_title}/{channel_name} - {video_title} - {model}.md
 */
export async function exportSummaryToMarkdown(summaryId: string) {
    try {
        console.log(`[Exporter] Starting export for summary: ${summaryId}`)

        // 1. Fetch Data
        const summary = await prisma.summary.findUnique({
            where: { id: summaryId },
            include: {
                video: {
                    include: {
                        user: true,
                        videoTags: {
                            include: {
                                tag: true
                            }
                        }
                    }
                }
            }
        })

        if (!summary || !summary.markdown) {
            console.error(`[Exporter] Summary not found or empty markdown for ID: ${summaryId}`)
            return
        }

        const { video, providerModel, targetLanguage } = summary
        const { user } = video

        // 2. Resolve Playlist Name
        let playlistName = "Uncategorized"
        if (video.playlistId) {
            try {
                // We need to fetch playlist details from YouTube to get the name
                // This might be expensive/slow, so ideally we should cache playlist names in DB
                // For now, let's try to fetch it if we have a client.
                const youtube = await getYouTubeClient(user.id)
                const response = await youtube.playlists.list({
                    part: ["snippet"],
                    id: [video.playlistId]
                })

                if (response.data.items && response.data.items.length > 0) {
                    playlistName = response.data.items[0].snippet?.title || "Uncategorized"
                }
            } catch (err) {
                console.warn(`[Exporter] Failed to fetch playlist name for ${video.playlistId}, using default.`, err)
            }
        }

        // 3. Construct Paths
        // Use data directory in root (mounted volume in Docker)
        const baseDir = process.env.DATA_DIR || path.join(process.cwd(), "data")

        const safeUserFolder = user.email ? sanitizeFilename(user.email) : user.id
        const safePlaylistFolder = sanitizeFilename(playlistName)

        const normalizedChannelName = video.channelName ? sanitizeFilename(video.channelName) : "Unknown Channel"
        const normalizedVideoTitle = sanitizeFilename(video.title)

        // Folder: {channel} - {video}
        const videoFolder = `${normalizedChannelName} - ${normalizedVideoTitle}`

        // File: {channel} - {video} - {model}.md
        // If translation, append language
        let fileName = `${normalizedChannelName} - ${normalizedVideoTitle} - ${providerModel || "ai"}`
        if (targetLanguage && targetLanguage !== 'en') {
            fileName += `.${targetLanguage}`
        }
        fileName += ".md"

        const fullFolderPath = path.join(baseDir, safeUserFolder, safePlaylistFolder, videoFolder)
        const fullFilePath = path.join(fullFolderPath, fileName)

        // 4. Construct Content with Frontmatter
        const tags = video.videoTags.map((vt: any) => `"${vt.tag.name}"`).join(", ")
        const videoUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`
        const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        const frontmatter = `---
tags: [${tags}]
video_url: ${videoUrl}
channel: "${video.channelName || ''}"
playlist: "${playlistName}"
model: "${providerModel || 'unknown'}"
created_at: ${date}
video_published: "${video.publishedAt ? new Date(video.publishedAt).toISOString().split('T')[0] : ''}"
duration: "${video.duration || ''}"
rating: 
status: 
---

`
        const finalContent = frontmatter + summary.markdown

        // 5. Write File
        if (!fs.existsSync(fullFolderPath)) {
            fs.mkdirSync(fullFolderPath, { recursive: true })
        }

        fs.writeFileSync(fullFilePath, finalContent, 'utf8')
        console.log(`[Exporter] Successfully exported to: ${fullFilePath}`)

    } catch (error) {
        console.error(`[Exporter] Failed to export summary ${summaryId}:`, error)
        // Don't throw, just log. We don't want to fail the request because export failed.
    }
}
