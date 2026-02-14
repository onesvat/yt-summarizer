import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await prisma.userSettings.findUnique({
        where: { userId: session.user.id },
    })

    // Return settings without exposing the full API key
    return NextResponse.json({
        aiProvider: settings?.aiProvider || "gemini",
        aiModel: settings?.aiModel || "gemini-2.0-flash",
        apiKey: settings?.apiKey ? "••••••" + settings.apiKey.slice(-4) : null,
        hasApiKey: !!settings?.apiKey,
        baseUrl: settings?.baseUrl || "",
    })
}

export async function PUT(request: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { aiProvider, aiModel, apiKey, baseUrl } = body

    if (!aiProvider || !aiModel) {
        return NextResponse.json(
            { error: "aiProvider and aiModel are required" },
            { status: 400 }
        )
    }

    // Build update data — only update apiKey if a new one is provided (not masked)
    const data: any = {
        aiProvider,
        aiModel,
        baseUrl: baseUrl || null,
    }

    // Only update API key if user sent a new one (not the masked version)
    if (apiKey && !apiKey.startsWith("••••••")) {
        data.apiKey = apiKey
    }

    const settings = await prisma.userSettings.upsert({
        where: { userId: session.user.id },
        update: data,
        create: {
            userId: session.user.id,
            ...data,
        },
    })

    return NextResponse.json({
        aiProvider: settings.aiProvider,
        aiModel: settings.aiModel,
        apiKey: settings.apiKey ? "••••••" + settings.apiKey.slice(-4) : null,
        hasApiKey: !!settings.apiKey,
        baseUrl: settings.baseUrl || "",
    })
}
