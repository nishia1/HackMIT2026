"use client";

/**
 * The pill used for actions on the group chat and its exported card: the
 * same shape, height and mono type as the circle page's GROUP / INDIVIDUAL
 * toggle (see GroupIndividualToggle), in that toggle's #B3023C, darkening
 * to its active #5A0420.
 */
export default function PillButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[43px] rounded-full bg-[#B3023C] px-5 font-mono text-[15px] font-bold text-white transition-colors hover:bg-[#5A0420] disabled:opacity-60"
    >
      {children}
    </button>
  );
}
