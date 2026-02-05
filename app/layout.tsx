import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { UpdateNotification } from "./components/UpdateNotification";

export const metadata: Metadata = {
    title: "BetBrain",
    description: "Next Gen Sports Simulation",
    icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" href="/logo.png" type="image/png" />
            </head>
            <body className="antialiased flex h-screen bg-[#050505] text-white overflow-hidden bg-[url('/bg-grid.svg')] bg-fixed">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-slate-900/50 to-black pointer-events-none z-0"></div>
                
                {/* Fixed Sidebar */}
                <div className="w-20 md:w-64 flex-shrink-0 z-50 relative">
                    <Sidebar />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden z-10">
                    <Topbar />
                    <main className="flex-1 overflow-y-auto p-0 scroll-smooth">
                        {children}
                    </main>
                </div>
                <UpdateNotification />
            </body>
        </html>
    );
}
