"use client";

import { useState, type RefObject } from "react";
import PillButton from "@/components/PillButton";

/**
 * Saves the card it points at as a PNG.
 *
 * On a phone that's the system share sheet, which is where "Save Image" /
 * "Add to Photos" lives — a web page can't write to the camera roll itself,
 * so the sheet is the prompt. Anywhere the sheet can't take a file (most
 * desktop browsers) it falls back to downloading the PNG.
 *
 * The capture is of the live DOM, so whatever the card shows is what gets
 * saved, including the photos that will eventually replace the filler boxes.
 */
export default function SaveToCameraRollButton({
  target,
  fileName = "this-weeks-highlights.png",
}: {
  target: RefObject<HTMLElement | null>;
  fileName?: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const save = async () => {
    const node = target.current;
    if (!node) return;
    setStatus("saving");
    try {
      // Loaded here rather than at module scope: it's only needed once
      // someone actually saves, and it touches the DOM as it runs.
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(node, { pixelRatio: 3, cacheBust: true });
      if (!blob) throw new Error("nothing to save");

      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "This week's highlights" });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
      setStatus("idle");
    } catch (err) {
      // Dismissing the share sheet is a cancel, not a failure.
      if (err instanceof Error && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <PillButton onClick={save} disabled={status === "saving"}>
        {status === "saving" ? "SAVING…" : "SAVE TO CAMERA ROLL"}
      </PillButton>
      {status === "error" && (
        <p className="font-mono text-[13px] text-[#c40505]">
          Couldn&rsquo;t save that one &mdash; try again.
        </p>
      )}
    </div>
  );
}
