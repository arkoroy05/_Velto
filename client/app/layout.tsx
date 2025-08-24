import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { getConfig } from "./config";
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Velto- The AI Hivemind ",
  description: "The AI Hivemind",
  generator: "Velto",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieHeader = (await headers()).get("cookie")
  const initialState = cookieToInitialState(
    getConfig(),
    cookieHeader
  );
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="bg-black">
        <Providers initialState={initialState}>
        {children}
        <Toaster />
        </Providers>
      </body>
    </html>
  )
}
