"use client";

export default function StoreLink({ name, url }: { name: string; url?: string }) {
  if (!url) return <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{name}</p>;

  return (
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      <span
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(url, "_blank"); }}
        className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
      >
        {name}
      </span>
    </p>
  );
}
