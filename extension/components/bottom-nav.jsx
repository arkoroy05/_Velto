"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Camera } from "lucide-react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const Item = ({ icon: Icon, label, href }) => {
    const active = pathname === href;
    return (
      <button
        onClick={() => router.push(href)}
        className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition ${
          active
            ? "text-white bg-white/10"
            : "text-[#9ca3af] hover:text-white hover:bg-white/5"
        }`}
      >
        <Icon size={20} />
        <span className="text-[11px] mt-1">{label}</span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 bg-[#1a1f3a]/80 backdrop-blur border border-[#2d3561]/60 text-white rounded-2xl shadow-lg px-2 py-2 flex gap-2">
      <Item icon={Home} label="Home" href="/home" />
      <Item icon={Search} label="Search" href="/search" />
      <Item icon={Camera} label="Capture" href="/capture" />
    </nav>
  );
}
