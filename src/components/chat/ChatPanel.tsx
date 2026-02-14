
"use client"

import { useState, useRef, useEffect } from "react"
import useSWR from "swr"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Send, Loader2, MessageSquare, Sparkles } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ChatPanelProps {
    videoId: string
}

export function ChatPanel({ videoId }: ChatPanelProps) {
    const { data, isLoading, mutate } = useSWR(
        `/api/videos/${videoId}/chat`,
        fetcher
    )
    const [input, setInput] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [optimisticMessages, setOptimisticMessages] = useState<any[]>([])
    const scrollRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const messages = data?.messages || []
    const suggestions = data?.suggestions || []
    const allMessages = [...messages, ...optimisticMessages]

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [allMessages.length])

    const handleSend = async (message?: string) => {
        const text = message || input.trim()
        if (!text || isSending) return

        setInput("")
        setIsSending(true)

        // Add optimistic user message
        setOptimisticMessages(prev => [...prev, {
            id: 'temp-user-' + Date.now(),
            role: 'user',
            content: text,
        }])

        try {
            const response = await fetch(`/api/videos/${videoId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to send message')
            }

            // Re-fetch to get the real messages
            setOptimisticMessages([])
            await mutate()
        } catch (error) {
            console.error("Chat error:", error)
            setOptimisticMessages(prev => [...prev, {
                id: 'temp-error-' + Date.now(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. ' + (error instanceof Error ? error.message : 'Please try again.'),
            }])
        } finally {
            setIsSending(false)
            textareaRef.current?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col h-full p-4 space-y-3">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-10 w-1/2 ml-auto" />
                <Skeleton className="h-10 w-2/3" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto" ref={scrollRef}>
                <div className="p-4">
                    {allMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                <MessageSquare className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="text-base font-semibold mb-1">Chat about this video</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mb-4">
                                Ask questions, explore concepts, or dive deeper into the content.
                            </p>
                            {suggestions.length > 0 && (
                                <div className="flex flex-col gap-2 w-full max-w-sm">
                                    {suggestions.map((q: string, i: number) => (
                                        <Button
                                            key={i}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs justify-start h-auto py-2 px-3 text-left whitespace-normal"
                                            onClick={() => handleSend(q)}
                                            disabled={isSending}
                                        >
                                            <Sparkles className="h-3 w-3 mr-2 shrink-0 text-primary" />
                                            {q}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {allMessages.map((msg: any) => (
                        <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
                    ))}
                    {isSending && optimisticMessages.length > 0 && !optimisticMessages.some(m => m.role === 'assistant') && (
                        <div className="flex gap-3 py-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                            <div className="bg-muted rounded-xl px-4 py-3">
                                <div className="flex gap-1">
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input area */}
            <div className="border-t p-3">
                <div className="flex gap-2 items-end">
                    <Textarea
                        ref={textareaRef}
                        placeholder="Ask about this video..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[40px] max-h-[120px] resize-none text-sm"
                        rows={1}
                    />
                    <Button
                        size="icon"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isSending}
                        className="shrink-0 h-10 w-10"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
