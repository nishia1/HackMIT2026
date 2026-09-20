"use client";

export type ViewMode = "group" | "individual";

/**
 * GROUP / INDIVIDUAL segmented toggle (Figma node 35:3766/35:3767/35:3769/35:3771).
 * The active tab renders its own full-height rounded pill (#5A0420) with white
 * text, flush against the shared outer pill (#B3023C); the inactive tab sits
 * directly on the outer pill with muted pink text and no pill of its own.
 */
export default function GroupIndividualToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div role="tablist" aria-label="View connections as" className="inline-flex h-[43px] rounded-full bg-[#B3023C]">
      <ToggleTab label="GROUP" active={mode === "group"} onClick={() => onChange("group")} />
      <ToggleTab label="INDIVIDUAL" active={mode === "individual"} onClick={() => onChange("individual")} />
    </div>
  );
}

function ToggleTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-full rounded-full px-5 font-mono text-[16px] font-bold transition-colors ${
        active ? "bg-[#5A0420] text-white" : "text-[#DA8A8A] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
