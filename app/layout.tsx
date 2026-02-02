import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SporSim 2026",
    description: "Next Gen Sports Simulation",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
