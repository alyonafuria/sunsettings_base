import { Tiles } from "@/components/ui/tiles";
import { LocationCombobox } from "@/components/ui/location-combobox";

export default function Home() {
  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">{/* 4rem matches h-16 menubar */}
      {/* Background tiles */}
      <Tiles
        className="pointer-events-none -z-10 opacity-30"
        rows={80}
        cols={20}
        tileSize="md"
      />

      {/* Positioned at 1/4 of the screen height */}
      <div className="absolute left-1/2 top-[25%] -translate-x-1/2 z-10">
        <LocationCombobox />
      </div>
    </div>
  );
}