
"use client"

import { useAppStore, type ReadFilter } from "@/store/useAppStore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, EyeOff, Filter, ArrowUpDown, Clock, Calendar, ListOrdered } from "lucide-react"
import useSWR from "swr"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function VideoFilters() {
    const {
        searchQuery, setSearchQuery,
        readFilter, setReadFilter,
        tagFilter, setTagFilter,
        showRemoved, setShowRemoved,
        sortOrder, setSortOrder
    } = useAppStore()

    const { data: tags } = useSWR('/api/tags', fetcher)

    return (
        <div className="flex flex-col gap-2 p-3 border-b">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                    variant={readFilter === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setReadFilter('all')}
                >
                    All
                </Button>
                <Button
                    variant={readFilter === 'unread' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setReadFilter('unread')}
                >
                    <EyeOff className="h-3 w-3 mr-1" />
                    Unread
                </Button>
                <Button
                    variant={readFilter === 'read' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setReadFilter('read')}
                >
                    <Eye className="h-3 w-3 mr-1" />
                    Read
                </Button>

                <div className="h-4 w-px bg-border mx-1" />

                <Button
                    variant={showRemoved ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setShowRemoved(!showRemoved)}
                >
                    <Filter className="h-3 w-3 mr-1" />
                    Removed
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1 w-full justify-between">
                            <span className="flex items-center gap-1">
                                {sortOrder === 'added' && <ListOrdered className="h-3 w-3" />}
                                {sortOrder === 'newest' && <Calendar className="h-3 w-3" />}
                                {sortOrder === 'oldest' && <Calendar className="h-3 w-3" />}
                                {(sortOrder === 'duration_asc' || sortOrder === 'duration_desc') && <Clock className="h-3 w-3" />}

                                {sortOrder === 'added' && "Added Date"}
                                {sortOrder === 'newest' && "Newest First"}
                                {sortOrder === 'oldest' && "Oldest First"}
                                {sortOrder === 'duration_asc' && "Shortest First"}
                                {sortOrder === 'duration_desc' && "Longest First"}
                            </span>
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[180px]">
                        <DropdownMenuItem onClick={() => setSortOrder('added')}>
                            <ListOrdered className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Added Date
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortOrder('newest')}>
                            <Calendar className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Newest First
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortOrder('oldest')}>
                            <Calendar className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Oldest First
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortOrder('duration_asc')}>
                            <Clock className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Shortest First
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortOrder('duration_desc')}>
                            <Clock className="h-3.5 w-3.5 mr-2 opacity-70" />
                            Longest First
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {tags && tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                    <Badge
                        variant={tagFilter === null ? "default" : "outline"}
                        className="cursor-pointer text-[10px] h-5"
                        onClick={() => setTagFilter(null)}
                    >
                        All
                    </Badge>
                    {tags.map((tag: any) => (
                        <Badge
                            key={tag.id}
                            variant={tagFilter === tag.id ? "default" : "outline"}
                            className="cursor-pointer text-[10px] h-5"
                            style={tagFilter === tag.id && tag.color ? { backgroundColor: tag.color } : tag.color ? { borderColor: tag.color, color: tag.color } : {}}
                            onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                        >
                            {tag.name}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
