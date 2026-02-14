
import { signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, LayoutList, ListVideo, MessageSquareText, Sparkles } from "lucide-react"

export default function SignIn() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        YT Summarizer
                    </CardTitle>
                    <CardDescription>
                        Turn your YouTube watchlist into actionable knowledge.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                        <div className="flex flex-col items-center gap-2">
                            <ListVideo className="h-5 w-5 text-primary" />
                            <span>Deep Summaries</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <MessageSquareText className="h-5 w-5 text-primary" />
                            <span>AI Chat</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <form
                        className="w-full"
                        action={async () => {
                            "use server"
                            await signIn("google", { redirectTo: "/dashboard" })
                        }}
                    >
                        <Button className="w-full" size="lg">
                            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Sign in with Google
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    )
}
