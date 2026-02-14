
"use client"

import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Menu, ListVideo } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { useState } from "react"

export function MobileSidebar() {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[300px]">
                <div className="flex items-center gap-2 px-4 h-14 border-b font-semibold text-lg">
                    <ListVideo className="h-6 w-6 text-primary" />
                    YT Summarizer
                </div>
                <div className="h-[calc(100%-3.5rem)]">
                    <Sidebar />
                </div>
            </SheetContent>
        </Sheet>
    )
}
