"use client";

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
      {items.map((url) => (
        <div key={url} className="relative w-full pt-[100%]">
          <img
            src={url}
            alt="sunsettings photo"
            className="absolute inset-0 h-full w-full object-cover border-2 border-black"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ))}
    </div>
  );
}
