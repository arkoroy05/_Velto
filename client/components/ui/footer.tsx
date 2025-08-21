import Link from "next/link"

// Import generic icons from lucide-react
import { Globe, Share2, MessageCircle, LinkIcon, Send, Feather } from "lucide-react"

const links = [
  {
    title: "Platform",
    href: "#",
  },
  {
    title: "Solutions",
    href: "#",
  },
  {
    title: "Enterprise",
    href: "#",
  },
  {
    title: "Pricing",
    href: "#",
  },
  {
    title: "Documentation",
    href: "#",
  },
  {
    title: "About",
    href: "#",
  },
]

export default function FooterSection() {
  return (
    <footer className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Link href="/" aria-label="go home" className="mx-auto block size-fit">
          <div className="text-xl font-bold tracking-wider">Velto</div>
        </Link>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Velto © 2025 — The Shared Memory Layer for AI.
        </p>

        <div className="my-8 flex flex-wrap justify-center gap-6 text-sm">
          {links.map((link, index) => (
            <Link key={index} href={link.href} className="text-muted-foreground hover:text-primary block duration-150">
              <span>{link.title}</span>
            </Link>
          ))}
        </div>
        <div className="my-8 flex flex-wrap justify-center gap-6 text-sm">
          <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-primary block">
            <Share2 className="size-6" />
          </Link>
          <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Discord" className="text-muted-foreground hover:text-primary block">
            <MessageCircle className="size-6" />
          </Link>
          <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-muted-foreground hover:text-primary block">
            <LinkIcon className="size-6" />
          </Link>
          <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Docs" className="text-muted-foreground hover:text-primary block">
            <Globe className="size-6" />
          </Link>
        </div>
        <span className="text-muted-foreground block text-center text-sm">
          “Your AI tools deserve one brain. Give them Velto.”
        </span>
      </div>
    </footer>
  )
}
