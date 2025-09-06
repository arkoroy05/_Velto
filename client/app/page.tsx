"use client"
import { ArrowRight } from "lucide-react"
import { Home, Cpu, Shield, FileText, Users } from "lucide-react"
// Import the BentoGrid component
import MagicBento from "@/components/ui/magic-bento"
import { StarBorder } from "@/components/ui/star-border"
import Features from "@/components/ui/features-new"
import FooterSection from "@/components/ui/footer"
import { NavBar } from "@/components/ui/tubelight-navbar"
import AnimatedGradientBackground from "@/components/ui/background";
import { AnimatePresence, motion, useInView, Variants } from "framer-motion";
import { useRef } from "react";
import { Testimonials } from "@/components/ui/demo";
import { useEmailPopup } from "@/components/email-popup-provider";

const navItems = [
  { name: "Home", url: "#home", icon: Home },
  { name: "Why", url: "#why", icon: FileText },
  { name: "Features", url: "#features", icon: Cpu },
  { name: "About", url: "#about", icon: Users },
]

export default function TuringLanding() {
  const { openPopup } = useEmailPopup();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden relative">
      {/* Subtle blue background gradient overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,132,255,0.15)] via-transparent to-transparent opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-bl from-[rgba(0,132,255,0.1)] via-transparent to-transparent opacity-50" />
      </div>

      <NavBar items={navItems} />

      {/* Main Content */}
      <main id="home" className="main min-h-screen pt-[300px] pb-20 relative">
        {/* Hero Video Background */}
        <video
          className="hero-video absolute -top-[20%] left-0 w-full h-[120%] object-cover z-0 bg-[#111] transform scale-x-[-1]"
          autoPlay
          muted
          loop
          playsInline
        >
          <source
            src="https://mybycketvercelprojecttest.s3.sa-east-1.amazonaws.com/animation-bg.mp4"
            type="video/mp4"
          />
        </video>

        <div className="content-wrapper max-w-[1400px] mx-auto px-[60px] flex justify-between items-end relative z-[2]">
          {/* Left Content */}
          <div className="max-w-[800px]">
            <h1 className="text-[80px] font-light leading-[1.1] mb-6 tracking-[-2px]">
              AI deserves better <br /> Give it Velto.
            </h1>
            <p className="text-lg leading-relaxed text-[#b8b8b8] mb-12 font-normal">
              Stop re-explaining, re-pasting, and re-debugging across AI tools.
            </p>
            <div className="flex gap-5 items-center">
              <StarBorder as="button" onClick={openPopup} className="cursor-pointer select-none">
                <span className="inline-flex items-center gap-2.5">
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </span>
              </StarBorder>
            </div>
          </div>

        </div>
      </main>

      {/* Capabilities Section with Bento Grid */}
      <section id="why" className="relative z-10 py-20 bg-[#0a0a0a] font-sans">
        <div className="max-w-[1400px] mx-auto px-[60px]">
          <div className="text-center mb-16">
            <h2 className="text-[48px] font-light leading-[1.1] mb-6 tracking-[-1px]">
              Why Velto Changes the Game
            </h2>
            <p className="text-lg text-[#b8b8b8] max-w-2xl mx-auto">
              Here’s how you stop wasting time and start compounding knowledge:
            </p>
          </div>
          <div className="flex w-full justify-center">
            <MagicBento 
              textAutoHide
              enableStars
              enableSpotlight
              enableBorderGlow
              enableTilt
              enableMagnetism
              clickEffect
              spotlightRadius={300}
              particleCount={12}
              glowColor="132, 0, 255"
            />
          </div>
        </div>
      </section>
      {/* Section intro above features */}
      {/* Testimonials Section */}
      <section id="features" className="relative z-10 py-20 bg-[#0a0a0a] font-sans">
      <section className="relative z-10 pt-9 pb-1 bg-[#0a0a0a] font-sans">
        <div className="max-w-[1400px] mx-auto px-[60px]">
          <div className="text-center mb-1">
            <h2 className="text-[80px] font-light leading-[1.1] mt-10 tracking-[-1px]">
              What Velto Unlocks
            </h2>
            <p className="text-lg text-[#b8b8b8] max-w-2xl mx-auto">
              Velto isn’t just memory — it’s leverage. By standardizing AI context, it unlocks:
            </p>
          </div>
        </div>
      </section>
        <Features />
      <Testimonials />
      </section>
      <section id="about" className="relative z-10 py-20 bg-[#0a0a0a] overflow-hidden">
        {/* Soft top fade to make testimonials-to-footer transition seamless */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0a0a0a] to-transparent" />
        <AnimatedGradientBackground containerClassName="z-0" />
        <div className="relative z-10">
          <FooterSection />
        </div>
      </section>
    </div>
  )
}
