import Image from "next/image";
import { Tiles } from "@/components/ui/tiles";

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

      {/* Page content (add your sections here) */}
      <div className="container py-8">
        {/* Placeholder content */}
      </div>
    </div>
  );
}