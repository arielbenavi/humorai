import Image from "next/image";
import { supabase } from "@/lib/supabase";
import AuthNav from "./auth-nav";

type CaptionRow = {
  id: string;
  content: string;
  created_datetime_utc: string;
  like_count: number;
  images: { url: string } | { url: string }[] | null;
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: captions, error } = await supabase
    .from("captions")
    .select("id, content, created_datetime_utc, like_count, images(url)")
    .not("image_id", "is", null)
    .order("created_datetime_utc", { ascending: false })
    .limit(20);

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
          <p className="text-red-600">Failed to load captions: {error.message}</p>
        ) : !captions || captions.length === 0 ? (
          <p className="text-zinc-500">No captions found.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(captions as CaptionRow[]).map((caption) => {
              const imageUrl = Array.isArray(caption.images)
                ? caption.images[0]?.url
                : caption.images?.url;
              return (
              <div
                key={caption.id}
                className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                {imageUrl && (
                  <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-800">
                    <Image
                      src={imageUrl}
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
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                    <time>
                      {new Date(caption.created_datetime_utc).toLocaleDateString()}
                    </time>
                    {caption.like_count > 0 && (
                      <span>{caption.like_count} likes</span>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
