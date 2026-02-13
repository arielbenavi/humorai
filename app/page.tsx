import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import AuthNav from "./auth-nav";
import CaptionCard from "./caption-card";

type CaptionRow = {
  id: string;
  content: string;
  created_datetime_utc: string;
  like_count: number;
  images: { url: string } | { url: string }[] | null;
};

export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch captions (public, no auth needed)
  const { data: captions, error } = await supabase
    .from("captions")
    .select("id, content, created_datetime_utc, like_count, images(url)")
    .not("image_id", "is", null)
    .order("created_datetime_utc", { ascending: false })
    .limit(20);

  // Check if user is logged in and fetch their existing votes
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  let userVotes: Record<string, number> = {};

  if (user && captions && captions.length > 0) {
    const captionIds = captions.map((c) => c.id);
    const { data: votes } = await serverSupabase
      .from("caption_votes")
      .select("caption_id, vote_value")
      .eq("profile_id", user.id)
      .in("caption_id", captionIds);

    if (votes) {
      for (const vote of votes) {
        userVotes[vote.caption_id] = vote.vote_value;
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            HumorAI
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              AI-Generated Captions
            </span>
            <AuthNav />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {error ? (
          <p className="text-red-600">
            Failed to load captions: {error.message}
          </p>
        ) : !captions || captions.length === 0 ? (
          <p className="text-zinc-500">No captions found.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(captions as CaptionRow[]).map((caption) => {
              const imageUrl = Array.isArray(caption.images)
                ? caption.images[0]?.url
                : caption.images?.url;
              return (
                <CaptionCard
                  key={caption.id}
                  caption={{
                    id: caption.id,
                    content: caption.content,
                    created_datetime_utc: caption.created_datetime_utc,
                    like_count: caption.like_count,
                    imageUrl: imageUrl ?? null,
                  }}
                  userId={user?.id ?? null}
                  initialVote={userVotes[caption.id] ?? null}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
