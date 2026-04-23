const STYLES: Record<string, string> = {
  admin: "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300",
  organizer: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300",
  user: "bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300",
};

export default function RoleBadge({ role }: { role: string }) {
  const cls = STYLES[role] ?? STYLES.user;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>
      {role}
    </span>
  );
}
