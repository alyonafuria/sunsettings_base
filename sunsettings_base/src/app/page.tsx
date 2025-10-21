import HomeHeroSection from "@/components/HomeHeroSection";
import PrewarmPhotos from "@/components/PrewarmPhotos";

export default function Home() {
  return (
    <div className="relative top-0 h-[calc(100vh-4rem)] overflow-hidden">{/* 4rem matches h-16 menubar */}
      <PrewarmPhotos />
      {/* CSS-only background grid (replaces heavy Tiles component) */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-16 inset-0 -z-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              to right,
              rgba(0,0,0,0.18) 0,
              rgba(0,0,0,0.18) 1px,
              transparent 1px,
              transparent 24px
            ),
            repeating-linear-gradient(
              to bottom,
              rgba(0,0,0,0.18) 0,
              rgba(0,0,0,0.18) 1px,
              transparent 1px,
              transparent 24px
            )
          `,
        }}
      />

      {/* Hero section (alert, combobox, button) that moves to top on open/selection */}
      <HomeHeroSection />
    </div>
  );
}