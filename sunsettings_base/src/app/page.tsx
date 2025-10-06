import LocationComboboxClient from "@/components/LocationComboboxClient";

export default function Home() {
  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">{/* 4rem matches h-16 menubar */}
      {/* CSS-only background grid (replaces heavy Tiles component) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
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

      {/* Positioned at 1/4 of the screen height */}
      <div className="absolute left-1/2 top-[25%] -translate-x-1/2 z-10">
      <div className="flex flex-col gap-4">
        <h2>Calculate the beauty of the sunset</h2>
        <p>Just choose your location</p>
      </div>
        <LocationComboboxClient />
      </div>
    </div>
  );
}