import { requireRole } from "@/lib/session";
import { getFormats } from "@/lib/events";
import { getPreferences } from "@/lib/user-preferences";
import SubpageShell from "../_components/SubpageShell";
import PreferencesForm from "./PreferencesForm";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const user = await requireRole(["user", "organizer", "admin"]);
  const prefs = getPreferences(user.id);
  const formats = getFormats();

  return (
    <SubpageShell
      title="Preferences"
      description="Tune which events show up in your feed. Only applies to your account — doesn't change what others see."
      maxWidth="max-w-2xl"
    >
      <PreferencesForm
        initialFormats={prefs.formats}
        initialRadius={prefs.radius_miles}
        initialDaysAhead={prefs.days_ahead}
        availableFormats={formats}
      />
    </SubpageShell>
  );
}
