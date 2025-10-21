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
      {items.map((id) => (
        <div key={id} className="relative w-full pt-[100%]">
          <div className="absolute inset-0 bg-secondary-background border-2 border-black" />
        </div>
      ))}
    </div>
  );
}
