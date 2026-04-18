"use client";
import { useState } from "react";
import SubscribeModal from "./subscribe-modal-content";

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

export default function FloatingActions() {
  const [showCalModal, setShowCalModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  const buttons = [
    { icon: <CalendarIcon />, label: "Subscribe", onClick: () => setShowCalModal(true), color: "hover:bg-[#132c50] hover:border-[#1a3558] hover:text-gray-300" },
    { icon: <DiscordIcon />, label: "Discord", href: "https://discord.gg/axDSujPTfj", color: "hover:bg-[#132c50] hover:border-[#1a3558] hover:text-gray-300" },
    { icon: <EmailIcon />, label: "Email", onClick: () => showToast("\u2709\uFE0F Newsletter coming soon!"), color: "hover:bg-[#132c50] hover:border-[#1a3558] hover:text-gray-300" },
    { icon: <LinkIcon />, label: "Links", onClick: () => showToast("\uD83D\uDD17 Link tree coming soon!"), color: "hover:bg-[#132c50] hover:border-[#1a3558] hover:text-gray-300" },
  ];

  return (
    <>
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        {buttons.map((btn) =>
          btn.href ? (
            <a
              key={btn.label}
              href={btn.href}
              target="_blank"
              rel="noopener noreferrer"
              title={btn.label}
              className={`group flex items-center justify-center w-10 h-10 bg-[#0e2240] text-gray-500 rounded-xl border border-[#1a3558] transition-all duration-200 cursor-pointer ${btn.color}`}
            >
              {btn.icon}
            </a>
          ) : (
            <button
              key={btn.label}
              onClick={btn.onClick}
              title={btn.label}
              className={`group flex items-center justify-center w-10 h-10 bg-[#0e2240] text-gray-500 rounded-xl border border-[#1a3558] transition-all duration-200 cursor-pointer ${btn.color}`}
            >
              {btn.icon}
            </button>
          )
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[#0e2240] backdrop-blur-md border border-[#1a3558] rounded-xl text-sm text-white font-medium shadow-lg animate-[fadeInUp_0.3s_ease-out]">
          {toast}
        </div>
      )}

      {showCalModal && <SubscribeModal onClose={() => setShowCalModal(false)} />}
    </>
  );
}
