"use client";
import { useRef, useState } from "react";

export default function VenueRow({
  venueName,
  usageCount,
  address,
  initialImageUrl,
}: {
  venueName: string;
  usageCount: number;
  address: string;
  initialImageUrl: string;
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const endpoint = `/api/admin/venues/${encodeURIComponent(venueName)}/image`;

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(endpoint, { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data?.error === "string" ? data.error : "Upload failed");
      return;
    }
    const data = (await res.json()) as { default: { image_url: string } };
    setImageUrl(data.default.image_url);
  }

  async function remove() {
    if (!confirm(`Remove the default image for ${venueName}?`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(endpoint, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't remove. Try again?");
      return;
    }
    setImageUrl("");
  }

  return (
    <li className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />

      <div className="w-20 h-14 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">No default</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{venueName}</span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{usageCount} events</span>
        </div>
        {address && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{address}</p>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>}
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          {busy ? "Uploading…" : imageUrl ? "Replace" : "Upload"}
        </button>
        {imageUrl && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}
