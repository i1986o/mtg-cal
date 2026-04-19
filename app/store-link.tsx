"use client";

export default function StoreLink({ name, url, inline }: { name: string; url?: string; inline?: boolean }) {
  if (!url) {
    if (inline) return <>{name}</>;
    return <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{name}</p>;
  }

  const link = (
    <span
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(url, "_blank"); }}
      className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
    >
      {name}
    </span>
  );

  if (inline) return link;

  return (
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      {link}
    </p>
  );
}
