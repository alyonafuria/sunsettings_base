"use client";

import Image from "next/image";

export default function Gallery({ items }: { items: string[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm opacity-80">
        start catching sunsets
      </div>
    );
  }

  const cols = 3;

  return (
    <div className="grid grid-cols-3 gap-0">
      {items.map((url, idx) => {
  const col = idx % cols;
        const lastIndex = items.length - 1;

        const hasLeft = col > 0 && idx - 1 >= 0;
        const hasRight = col < cols - 1 && idx + 1 <= lastIndex; // ensure same row neighbor exists
        const hasTop = idx - cols >= 0;
        const hasBottom = idx + cols <= lastIndex;

        const tileBorderClasses = [
          "relative w-full pt-[100%] border-border",
          hasTop ? "border-t-[0.5px]" : "border-t",
          hasRight ? "border-r-[0.5px]" : "border-r",
          hasBottom ? "border-b-[0.5px]" : "border-b",
          hasLeft ? "border-l-[0.5px]" : "border-l",
        ].join(" ");

        return (
          <div key={`${url}-${idx}`} className={tileBorderClasses}>
            <Image
              src={url}
              alt="sunsettings photo"
              fill
              sizes="33vw"
              className="absolute inset-0 h-full w-full object-cover"
              priority={false}
              unoptimized
            />
          </div>
        );
      })}
    </div>
  );
}
