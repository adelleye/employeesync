import { redirect } from "next/navigation";

export default function SettingsPage() {
  // Redirect to the first or most common settings sub-page
  redirect("/dashboard/settings/locations");

  // return null; // Or a loading spinner, or some minimal UI if redirect takes time, though usually it's instant.
}
