
"use client"

import { useEffect, useRef, useState } from "react"

interface MermaidBlockProps {
    chart: string
}

/**
 * Client-side mermaid diagram renderer.
 * Renders mermaid syntax into an SVG within a styled container.
 * Falls back to showing raw code if rendering fails.
 */
export function MermaidBlock({ chart }: MermaidBlockProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [rendered, setRendered] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function render() {
            try {
                const mermaid = (await import("mermaid")).default
                mermaid.initialize({
                    startOnLoad: false,
                    theme: "dark",
                    securityLevel: "loose",
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    themeVariables: {
                        primaryColor: "#6366f1",
                        primaryTextColor: "#e2e8f0",
                        primaryBorderColor: "#4f46e5",
                        lineColor: "#64748b",
                        secondaryColor: "#1e293b",
                        tertiaryColor: "#0f172a",
                        background: "#0f172a",
                        mainBkg: "#1e293b",
                        nodeBorder: "#4f46e5",
                        clusterBkg: "#1e293b",
                        titleColor: "#e2e8f0",
                        edgeLabelBackground: "#1e293b",
                    },
                })

                const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
                const { svg } = await mermaid.render(id, chart.trim())

                if (!cancelled && containerRef.current) {
                    containerRef.current.innerHTML = svg
                    setRendered(true)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to render diagram")
                }
            }
        }

        render()
        return () => { cancelled = true }
    }, [chart])

    if (error) {
        return (
            <div className="my-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                <p className="text-xs text-yellow-400 mb-2 font-medium">⚠ Diagram could not be rendered</p>
                <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                    <code>{chart}</code>
                </pre>
            </div>
        )
    }

    return (
        <div
            className={`my-6 rounded-xl border border-border/50 bg-card/50 p-6 overflow-x-auto transition-opacity duration-300 ${rendered ? "opacity-100" : "opacity-0"}`}
        >
            <div
                ref={containerRef}
                className="flex justify-center [&_svg]:max-w-full"
            />
        </div>
    )
}
