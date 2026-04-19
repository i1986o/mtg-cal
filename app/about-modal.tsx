"use client";

export default function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#0c1220] rounded-xl shadow-2xl border border-gray-100 dark:border-white/8 w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-white">About PlayIRL.GG</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl leading-none cursor-pointer">&times;</button>
        </div>

        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            <strong className="text-gray-900 dark:text-white">PlayIRL.GG</strong> is a community-built platform that aggregates local Magic: The Gathering events into one easy-to-browse feed.
          </p>

          <p>
            We pull events from <strong>Wizards of the Coast</strong>, <strong>Discord servers</strong>, and other sources — so you never miss a Commander night, prerelease, or draft at your local game store.
          </p>

          <div className="bg-gray-50 dark:bg-[#141c2e] rounded-lg p-4 space-y-2">
            <p className="text-sm font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-white">{"\uD83D\uDEA7"} Early Development</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This project is in active development. We&apos;re working on adding more cities, user-submitted events, store profiles, and more game support beyond MTG. Got ideas or want to help?
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <a
              href="https://discord.gg/axDSujPTfj"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              {"\uD83D\uDCAC"} Join the Discord
            </a>
            <a
              href="https://github.com/i1986o/mtg-cal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#0c1220] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-[#141c2e] transition border border-gray-100 dark:border-white/8"
            >
              {"\u2B50"} GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
