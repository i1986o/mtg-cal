import { requireRole } from "@/lib/session";
import { getFormats } from "@/lib/events";
import { getPreferences } from "@/lib/user-preferences";
import PreferencesForm from "./PreferencesForm";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const user = await requireRole(["user", "organizer", "admin"]);
  const prefs = getPreferences(user.id);
  const formats = getFormats();

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-[family-name:var(--font-ultra)] font-bold text-gray-900 dark:text-gray-100">
          Preferences
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Tune which events show up in your feed. Only applies to your account — doesn't change what others see.
        </p>
      </header>

      <PreferencesForm
        initialFormats={prefs.formats}
        initialRadius={prefs.radius_miles}
        initialDaysAhead={prefs.days_ahead}
        availableFormats={formats}
      />
    </div>
  );
}
