
"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { User, Bot } from "lucide-react"

interface ChatMessageProps {
    role: "user" | "assistant"
    content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
    return (
        <div className={cn(
            "flex gap-3 py-3",
            role === "user" ? "flex-row-reverse" : ""
        )}>
            <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
            )}>
                {role === "user" ? (
                    <User className="h-4 w-4" />
                ) : (
                    <Bot className="h-4 w-4" />
                )}
            </div>
            <div className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-sm max-w-[80%]",
                role === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted"
            )}>
                {role === "assistant" ? (
                    <div className="prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-background/50 prose-pre:border prose-ul:my-1 prose-li:my-0.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap">{content}</p>
                )}
            </div>
        </div>
    )
}
