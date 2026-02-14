
"use client"

import { Badge } from "@/components/ui/badge"

interface TagBadgeProps {
    name: string
    color?: string | null
    onRemove?: () => void
    className?: string
}

export function TagBadge({ name, color, onRemove, className }: TagBadgeProps) {
    return (
        <Badge
            variant="secondary"
            className={`text-xs gap-1 ${className || ''}`}
            style={color ? {
                backgroundColor: color + '20',
                color: color,
                borderColor: color + '40',
                border: '1px solid',
            } : {}}
        >
            {name}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="ml-0.5 hover:opacity-70 rounded-full"
                >
                    ×
                </button>
            )}
        </Badge>
    )
}
