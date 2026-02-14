"use client"

import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
import { useAppStore } from "@/store/useAppStore"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isSidebarOpen } = useAppStore()

    return (
        <div className="flex h-screen w-full flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden pt-14"> {/* pt-14 matches header height */}
                {isSidebarOpen && (
                    <aside className="hidden w-[350px] flex-col md:flex overflow-hidden border-r">
                        <Sidebar />
                    </aside>
                )}
                <main className="flex flex-1 flex-col overflow-hidden bg-background">
                    {children}
                </main>
            </div>
        </div>
    )
}
