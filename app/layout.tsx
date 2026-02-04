import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./components/Sidebar"; // We will create this
import { Topbar } from "./components/Topbar"; // We will create this

export const metadata: Metadata = {
    title: "SpoSim",
    description: "Sports Simulation – Football & F1",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
                {/* Fixed Sidebar */}
                <div className="w-20 md:w-64 flex-shrink-0 border-r border-white/5 bg-[#0f1014] z-50">
                    <Sidebar />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
                    <Topbar />
                    <main className="flex-1 overflow-y-auto p-0 scroll-smooth">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
