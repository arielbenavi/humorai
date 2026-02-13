"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

const API_BASE = "https://api.almostcrackd.ai";

type PipelineStep = "idle" | "presign" | "upload" | "register" | "generate" | "done" | "error";

type GeneratedCaption = {
  id: string;
  content: string;
  [key: string]: unknown;
};

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<PipelineStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captions, setCaptions] = useState<GeneratedCaption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setErrorMsg(
        `Unsupported file type: ${selected.type}. Use JPEG, PNG, WebP, GIF, or HEIC.`
      );
      return;
    }

    setFile(selected);
    setErrorMsg(null);
    setCaptions([]);
    setStep("idle");

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(selected);
  };

  const getAccessToken = async (): Promise<string> => {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Not authenticated. Please sign in again.");
    }
    return session.access_token;
  };

  const runPipeline = async () => {
    if (!file) return;

    setErrorMsg(null);
    setCaptions([]);

    try {
      const token = await getAccessToken();

      // Step 1: Generate presigned URL
      setStep("presign");
      const contentType = file.type === "image/jpg" ? "image/jpeg" : file.type;
      const presignRes = await fetch(
        `${API_BASE}/pipeline/generate-presigned-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contentType }),
        }
      );

      if (!presignRes.ok) {
        const text = await presignRes.text();
        throw new Error(`Presign failed (${presignRes.status}): ${text}`);
      }

      const { presignedUrl, cdnUrl } = await presignRes.json();

      // Step 2: Upload file bytes to presigned URL
      setStep("upload");
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to S3 failed (${uploadRes.status})`);
      }

      // Step 3: Register image URL with pipeline
      setStep("register");
      const registerRes = await fetch(
        `${API_BASE}/pipeline/upload-image-from-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
        }
      );

      if (!registerRes.ok) {
        const text = await registerRes.text();
        throw new Error(`Register failed (${registerRes.status}): ${text}`);
      }

      const { imageId } = await registerRes.json();

      // Step 4: Generate captions
      setStep("generate");
      const captionRes = await fetch(
        `${API_BASE}/pipeline/generate-captions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageId }),
        }
      );

      if (!captionRes.ok) {
        const text = await captionRes.text();
        throw new Error(`Caption generation failed (${captionRes.status}): ${text}`);
      }

      const captionData = await captionRes.json();
      const results = Array.isArray(captionData) ? captionData : captionData.captions ?? [];
      setCaptions(results);
      setStep("done");
    } catch (err) {
      setStep("error");
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStep("idle");
    setErrorMsg(null);
    setCaptions([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const stepLabels: Record<PipelineStep, string> = {
    idle: "",
    presign: "Getting upload URL...",
    upload: "Uploading image...",
    register: "Registering image...",
    generate: "Generating captions (this may take a moment)...",
    done: "Done!",
    error: "Something went wrong.",
  };

  const isRunning = !["idle", "done", "error"].includes(step);

  return (
    <div className="space-y-6">
      {/* File picker */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          Select an image
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          disabled={isRunning}
          className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-300 dark:hover:file:bg-zinc-700 disabled:opacity-50"
        />
      </div>

      {/* Image preview */}
      {preview && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Selected image preview"
              className="w-full max-h-96 object-contain bg-zinc-100 dark:bg-zinc-800"
            />
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {file?.name}{" "}
              <span className="text-zinc-400 dark:text-zinc-500">
                ({(file?.size ? file.size / 1024 : 0).toFixed(0)} KB)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={reset}
                disabled={isRunning}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={runPipeline}
                disabled={isRunning || !file}
                className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {isRunning ? "Processing..." : "Generate Captions"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {step !== "idle" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-3">
            <ProgressStep
              label="Generate upload URL"
              status={getStepStatus("presign", step)}
            />
            <ProgressStep
              label="Upload image"
              status={getStepStatus("upload", step)}
            />
            <ProgressStep
              label="Register image"
              status={getStepStatus("register", step)}
            />
            <ProgressStep
              label="Generate captions"
              status={getStepStatus("generate", step)}
            />
          </div>
          {isRunning && (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">
              {stepLabels[step]}
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Generated captions */}
      {captions.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Generated Captions ({captions.length})
          </h2>
          <ul className="space-y-3">
            {captions.map((cap, i) => (
              <li
                key={cap.id || i}
                className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {cap.content}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// --- helper component ---

const STEP_ORDER: PipelineStep[] = ["presign", "upload", "register", "generate"];

function getStepStatus(
  target: PipelineStep,
  current: PipelineStep
): "pending" | "active" | "done" | "error" {
  const targetIdx = STEP_ORDER.indexOf(target);
  const currentIdx = STEP_ORDER.indexOf(current);

  if (current === "error") {
    // Mark all steps up to the current as done, the current one as error
    return currentIdx >= 0 && targetIdx <= currentIdx
      ? targetIdx === currentIdx
        ? "error"
        : "done"
      : targetIdx < currentIdx
        ? "done"
        : "pending";
  }
  if (current === "done") return "done";
  if (currentIdx < 0) return "pending"; // idle
  if (targetIdx < currentIdx) return "done";
  if (targetIdx === currentIdx) return "active";
  return "pending";
}

function ProgressStep({
  label,
  status,
}: {
  label: string;
  status: "pending" | "active" | "done" | "error";
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">
        {status === "done" && (
          <svg
            className="h-5 w-5 text-emerald-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        )}
        {status === "active" && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
        )}
        {status === "pending" && (
          <div className="h-5 w-5 rounded-full border-2 border-zinc-200 dark:border-zinc-700" />
        )}
        {status === "error" && (
          <svg
            className="h-5 w-5 text-red-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </div>
      <span
        className={`text-sm ${
          status === "done"
            ? "text-emerald-600 dark:text-emerald-400"
            : status === "active"
              ? "font-medium text-zinc-900 dark:text-zinc-100"
              : status === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
