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

  return (
    <div className="grid grid-cols-3 gap-0">
      {items.map((url, idx) => (
        <div key={`${url}-${idx}`} className="relative w-full pt-[100%]">
          <Image
            src={url}
            alt="sunsettings photo"
            fill
            sizes="33vw"
            className="absolute inset-0 h-full w-full object-cover border-2 border-black"
            priority={false}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
