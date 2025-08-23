"use client";
import MagicBento from "@/components/ui/magic-bento";

export default function MagicBentoDemo() {
  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
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
  );
}
