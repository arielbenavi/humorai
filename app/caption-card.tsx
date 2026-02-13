"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CaptionCardProps = {
  caption: {
    id: string;
    content: string;
    created_datetime_utc: string;
    like_count: number;
    imageUrl: string | null;
  };
  userId: string | null;
  initialVote: number | null; // 1, -1, or null
};

export default function CaptionCard({
  caption,
  userId,
  initialVote,
}: CaptionCardProps) {
  const [currentVote, setCurrentVote] = useState<number | null>(initialVote);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async (voteValue: 1 | -1) => {
    if (!userId || isLoading) return;

    setIsLoading(true);

    // Optimistic update: toggle off if same vote, otherwise set new vote
    const newVote = currentVote === voteValue ? null : voteValue;
    const previousVote = currentVote;
    setCurrentVote(newVote);

    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      if (newVote === null) {
        // Remove the vote
        const { error } = await supabase
          .from("caption_votes")
          .delete()
          .eq("caption_id", caption.id)
          .eq("profile_id", userId);

        if (error) throw new Error(error.message);
      } else if (previousVote === null) {
        // Insert a new vote
        const { error } = await supabase.from("caption_votes").insert({
          vote_value: newVote,
          profile_id: userId,
          caption_id: caption.id,
          created_datetime_utc: now,
          modified_datetime_utc: now,
        });

        if (error) throw new Error(error.message);
      } else {
        // Update existing vote (switching from upvote to downvote or vice versa)
        const { error } = await supabase
          .from("caption_votes")
          .update({ vote_value: newVote, modified_datetime_utc: now })
          .eq("caption_id", caption.id)
          .eq("profile_id", userId);

        if (error) throw new Error(error.message);
      }
    } catch (err) {
      // Revert on error
      console.error("Vote failed:", err);
      setCurrentVote(previousVote);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {caption.imageUrl && (
        <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={caption.imageUrl}
            alt="Caption image"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col justify-between p-4">
        <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {caption.content}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <time className="text-xs text-zinc-400">
            {new Date(caption.created_datetime_utc).toLocaleDateString()}
          </time>

          {userId ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleVote(1)}
                disabled={isLoading}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  currentVote === 1
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                } disabled:opacity-50`}
                title="Upvote"
              >
                <svg
                  className="h-4 w-4"
                  fill={currentVote === 1 ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0H22.5a2.25 2.25 0 0 1 0 4.5h-.002c-.095 0-.18.073-.18.168 0 .12.063.23.117.36.135.324.29.7.29 1.222a2.406 2.406 0 0 1-.46 1.372c.012.096.017.194.017.292 0 .672-.244 1.288-.646 1.76.016.12.024.246.024.374 0 1.248-1.012 2.25-2.25 2.25H14.6c-.995 0-1.977-.252-2.864-.725l-.239-.13c-.76-.41-1.593-.63-2.447-.63H8.4m-1.767 0H4.5a2.25 2.25 0 0 1-2.25-2.25v-6.75A2.25 2.25 0 0 1 4.5 6.75h1.875c.831 0 1.543.572 1.704 1.381a4.336 4.336 0 0 0 .098.51l.013.053"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleVote(-1)}
                disabled={isLoading}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  currentVote === -1
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                } disabled:opacity-50`}
                title="Downvote"
              >
                <svg
                  className="h-4 w-4"
                  fill={currentVote === -1 ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.498 15.25h-.002c-.095 0-.18-.073-.18-.168 0-.12.063-.23.117-.36.135-.324.29-.7.29-1.222a2.406 2.406 0 0 0-.46-1.372c.012-.096.017-.194.017-.292 0-.672-.244-1.288-.646-1.76.016-.12.024-.246.024-.374 0-1.248-1.012-2.25-2.25-2.25H2.25A2.25 2.25 0 0 0 0 9.9v6.75A2.25 2.25 0 0 0 2.25 18.9h1.875c.831 0 1.543-.572 1.704-1.381.047-.235.076-.474.098-.51l.013-.053M17.367 13.75c-.806 0-1.533.446-2.031 1.08a9.041 9.041 0 0 1-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 0 0-.322 1.672V21a.75.75 0 0 1-.75.75 2.25 2.25 0 0 1-2.25-2.25c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282m0 0H1.5a2.25 2.25 0 0 1 0-4.5h.002c.095 0 .18-.073.18-.168 0-.12-.063-.23-.117-.36-.135-.324-.29-.7-.29-1.222"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Sign in to vote
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
