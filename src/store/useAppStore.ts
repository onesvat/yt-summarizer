
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ReadFilter = 'all' | 'read' | 'unread'
export type SortOrder = 'added' | 'newest' | 'oldest' | 'duration_asc' | 'duration_desc'

interface VideoMeta {
    isRead: boolean
    isRemoved: boolean
    tags: { id: string; name: string; color: string | null }[]
    summaryStatus?: string
    duration?: string | null
    publishedAt?: string | null
}

interface AppState {
    // Selection
    selectedPlaylistId: string | null
    selectedVideoId: string | null
    isSidebarOpen: boolean
    isVideoPlayerOpen: boolean

    // Multi-select
    selectedVideoIds: string[]

    // Filters
    searchQuery: string
    readFilter: ReadFilter
    tagFilter: string | null
    sortOrder: SortOrder
    showRemoved: boolean

    // Video metadata cache (keyed by youtubeId)
    videoMeta: Record<string, VideoMeta>

    // Video player seeking
    seekToTime: number | null

    // Actions
    setSelectedPlaylistId: (id: string | null) => void
    setSelectedVideoId: (id: string | null) => void
    toggleVideoSelection: (id: string) => void
    setVideoSelection: (ids: string[]) => void
    clearSelection: () => void

    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void

    toggleVideoPlayer: () => void
    setVideoPlayerOpen: (open: boolean) => void

    setSearchQuery: (query: string) => void
    setTagFilter: (tagId: string | null) => void
    setReadFilter: (filter: ReadFilter) => void
    setSortOrder: (order: SortOrder) => void
    setShowRemoved: (show: boolean) => void
    setVideoMeta: (youtubeId: string, meta: Partial<VideoMeta>) => void
    setVideoMetaBatch: (metas: Record<string, VideoMeta>) => void
    setSeekToTime: (time: number | null) => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            selectedPlaylistId: null,
            selectedVideoId: null,
            isSidebarOpen: true,
            isVideoPlayerOpen: true,
            selectedVideoIds: [],
            searchQuery: '',
            tagFilter: null,
            readFilter: 'all',
            sortOrder: 'added',
            showRemoved: false,
            videoMeta: {},
            seekToTime: null,

            setSelectedPlaylistId: (id) => set({ selectedPlaylistId: id, selectedVideoId: null, selectedVideoIds: [] }),
            setSelectedVideoId: (id) => set({ selectedVideoId: id }),
            toggleVideoSelection: (id) => set((state) => {
                const isSelected = state.selectedVideoIds.includes(id)
                return {
                    selectedVideoIds: isSelected
                        ? state.selectedVideoIds.filter((i) => i !== id)
                        : [...state.selectedVideoIds, id]
                }
            }),
            setVideoSelection: (ids) => set({ selectedVideoIds: ids }),
            clearSelection: () => set({ selectedVideoIds: [] }),

            toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
            setSidebarOpen: (open) => set({ isSidebarOpen: open }),

            toggleVideoPlayer: () => set((state) => ({ isVideoPlayerOpen: !state.isVideoPlayerOpen })),
            setVideoPlayerOpen: (open) => set({ isVideoPlayerOpen: open }),

            setSearchQuery: (query) => set({ searchQuery: query }),
            setTagFilter: (tagId) => set({ tagFilter: tagId }),
            setReadFilter: (filter) => set({ readFilter: filter }),
            setSortOrder: (order) => set({ sortOrder: order }),
            setShowRemoved: (show) => set({ showRemoved: show }),
            setVideoMeta: (youtubeId, meta) =>
                set((state) => ({
                    videoMeta: {
                        ...state.videoMeta,
                        [youtubeId]: { ...state.videoMeta[youtubeId], ...meta } as VideoMeta
                    }
                })),
            setVideoMetaBatch: (metas) =>
                set((state) => ({
                    videoMeta: { ...state.videoMeta, ...metas }
                })),
            setSeekToTime: (time) => set({ seekToTime: time }),
        }),
        {
            name: 'yt-summarizer-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                isSidebarOpen: state.isSidebarOpen,
                isVideoPlayerOpen: state.isVideoPlayerOpen,
                // Optionally persist filters too if desired, but user asked specifically for sidebar/slider
            }),
        }
    )
)
