import HomeHeroSection from "@/components/HomeHeroSection";
import PrewarmPhotos from "@/components/PrewarmPhotos";
import OnboardingGate from "@/components/onboarding/OnboardingGate";

export async function generateMetadata() {
  const embed = {
    version: "1",
    imageUrl: "https://catch.sunsettings.app/embed.png",
    button: {
      title: "sunsettings",
      action: {
        type: "launch_frame",
        name: "sunsettings",
        url: "https://catch.sunsettings.app",
        splashImageUrl: "https://catch.sunsettings.app/icon.png",
        splashBackgroundColor: "#009bfa",
      },
    },
  } as const;
  const serialized = JSON.stringify(embed);
  return {
    other: {
      "fc:miniapp": serialized,
      "fc:frame": serialized,
    },
    openGraph: {
      title: "sunsettings",
      description: "Capture and share beautiful sunsets",
      images: [
        {
          url: "https://catch.sunsettings.app/embed.png",
          width: 1200,
          height: 800,
        },
      ],
    },
  };
}

export default function Home() {
  return (
    <div className="relative top-0 h-[calc(100vh-4rem)] overflow-hidden">{/* 4rem matches h-16 menubar */}
      <PrewarmPhotos />
      <OnboardingGate />
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