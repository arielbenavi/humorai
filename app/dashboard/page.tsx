import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a
            href="/"
            className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            HumorAI
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Dashboard
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4 mb-6">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="h-14 w-14 rounded-full border-2 border-zinc-200 dark:border-zinc-700"
              />
            )}
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Welcome, {user.user_metadata?.full_name || "User"}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {user.email}
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Account Details
            </h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                  Provider
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {user.app_metadata?.provider ?? "Unknown"}
                </dd>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                  User ID
                </dt>
                <dd className="mt-1 text-sm font-mono text-zinc-900 dark:text-zinc-100 truncate">
                  {user.id}
                </dd>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                  Last Sign In
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleString()
                    : "N/A"}
                </dd>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                  Account Created
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {new Date(user.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <a
              href="/"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              &larr; Back to Captions
            </a>
            <LogoutButton />
          </div>
        </div>
      </main>
    </div>
  );
}
