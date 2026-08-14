import React from "react";
import { cn } from "@/lib/utils";

/* ─── Individual SVG Illustrations ─── */

function SwimmerIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* water waves */}
      <path d="M4 58 Q14 52 24 58 Q34 64 44 58 Q54 52 64 58 Q74 64 76 58" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M4 65 Q14 59 24 65 Q34 71 44 65 Q54 59 64 65 Q74 71 76 65" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* body */}
      <ellipse cx="38" cy="48" rx="14" ry="6" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5"/>
      {/* head */}
      <circle cx="54" cy="42" r="7" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5"/>
      {/* swim cap */}
      <path d="M48 38 Q54 32 60 38" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" fill="#3b82f6"/>
      {/* goggles */}
      <circle cx="51" cy="42" r="2.5" stroke="#1d4ed8" strokeWidth="1.5" fill="none"/>
      <circle cx="57" cy="42" r="2.5" stroke="#1d4ed8" strokeWidth="1.5" fill="none"/>
      <line x1="53.5" y1="42" x2="54.5" y2="42" stroke="#1d4ed8" strokeWidth="1.5"/>
      {/* arms */}
      <path d="M52 50 Q44 56 30 54" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round"/>
      <path d="M24 48 Q20 44 26 40" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round"/>
      {/* kick legs */}
      <path d="M26 52 Q18 56 12 52" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round"/>
      <path d="M28 54 Q22 60 14 58" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"/>
      {/* splash */}
      <circle cx="20" cy="45" r="1.5" fill="#bfdbfe"/>
      <circle cx="16" cy="42" r="1" fill="#bfdbfe"/>
      <circle cx="23" cy="41" r="1" fill="#bfdbfe"/>
    </svg>
  );
}

function SkaterIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* ice surface */}
      <ellipse cx="40" cy="70" rx="30" ry="4" fill="#bfdbfe" opacity="0.6"/>
      {/* skate blade streak */}
      <path d="M24 68 Q32 66 40 68" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round"/>
      {/* body */}
      <rect x="30" y="40" width="14" height="18" rx="6" fill="#6366f1" stroke="#4f46e5" strokeWidth="1.5"/>
      {/* skirt flare */}
      <path d="M28 54 Q37 62 46 54" fill="#818cf8" stroke="#6366f1" strokeWidth="1"/>
      {/* head */}
      <circle cx="37" cy="32" r="8" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5"/>
      {/* hair */}
      <path d="M30 28 Q37 22 44 28" fill="#92400e" stroke="#78350f" strokeWidth="1"/>
      <path d="M44 28 Q47 32 44 36" fill="#92400e" stroke="#78350f" strokeWidth="1"/>
      {/* face */}
      <circle cx="34" cy="33" r="1" fill="#1e1b4b"/>
      <circle cx="40" cy="33" r="1" fill="#1e1b4b"/>
      <path d="M34 37 Q37 39 40 37" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
      {/* arms extended */}
      <path d="M30 45 Q20 40 14 42" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M44 45 Q54 40 60 38" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
      {/* legs */}
      <path d="M33 58 Q31 64 28 67" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M41 58 Q44 62 46 66" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round"/>
      {/* skate boots */}
      <path d="M24 67 Q28 66 32 68" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round"/>
      <path d="M42 66 Q46 65 50 67" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round"/>
      {/* sparkles */}
      <path d="M58 42 L60 38 L62 42 L58 42" fill="#fcd34d"/>
      <path d="M14 38 L16 34 L18 38 L14 38" fill="#fcd34d"/>
    </svg>
  );
}

function GymnastIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* mat */}
      <rect x="8" y="68" width="64" height="6" rx="3" fill="#bbf7d0" stroke="#86efac" strokeWidth="1"/>
      {/* body doing cartwheel */}
      <rect x="34" y="34" width="12" height="16" rx="5" fill="#f43f5e" stroke="#e11d48" strokeWidth="1.5"/>
      {/* head */}
      <circle cx="40" cy="26" r="7" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5"/>
      {/* ponytail */}
      <path d="M45 22 Q52 18 50 26" stroke="#92400e" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* hair */}
      <path d="M34 22 Q40 16 46 22" fill="#92400e"/>
      {/* face */}
      <circle cx="37" cy="27" r="1" fill="#1e1b4b"/>
      <circle cx="43" cy="27" r="1" fill="#1e1b4b"/>
      <path d="M37 31 Q40 33 43 31" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
      {/* left arm up */}
      <path d="M34 38 Q22 30 16 22" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round"/>
      {/* right arm out */}
      <path d="M46 38 Q58 36 64 32" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round"/>
      {/* legs split */}
      <path d="M36 50 Q28 58 18 62" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M44 50 Q52 56 62 58" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round"/>
      {/* star accent */}
      <path d="M16 20 L17.5 17 L19 20 L16 20" fill="#fbbf24"/>
      <path d="M62 30 L63.5 27 L65 30 L62 30" fill="#fbbf24"/>
    </svg>
  );
}

function SoccerIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* ground */}
      <path d="M4 70 Q40 66 76 70" stroke="#86efac" strokeWidth="2" strokeLinecap="round"/>
      {/* soccer ball */}
      <circle cx="58" cy="58" r="10" fill="white" stroke="#374151" strokeWidth="1.5"/>
      <path d="M54 50 L58 54 L62 50" stroke="#374151" strokeWidth="1" fill="#374151" opacity="0.4"/>
      <path d="M50 58 L54 54 L54 62" stroke="#374151" strokeWidth="1" fill="#374151" opacity="0.4"/>
      <path d="M62 54 L66 58 L62 62" stroke="#374151" strokeWidth="1" fill="#374151" opacity="0.4"/>
      <path d="M54 62 L58 66 L62 62" stroke="#374151" strokeWidth="1" fill="#374151" opacity="0.4"/>
      {/* body */}
      <rect x="22" y="36" width="14" height="18" rx="6" fill="#3b82f6" stroke="#2563eb" strokeWidth="1.5"/>
      {/* shorts */}
      <rect x="21" y="50" width="16" height="10" rx="3" fill="#1e3a8a"/>
      {/* head */}
      <circle cx="29" cy="26" r="8" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5"/>
      {/* hair */}
      <path d="M22 22 Q29 16 36 22" fill="#92400e"/>
      {/* face */}
      <circle cx="26" cy="27" r="1" fill="#1e1b4b"/>
      <circle cx="32" cy="27" r="1" fill="#1e1b4b"/>
      <path d="M26 31 Q29 33 32 31" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
      {/* kicking leg */}
      <path d="M35 56 Q44 52 54 52" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round"/>
      {/* standing leg */}
      <path d="M24 60 Q23 66 22 70" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round"/>
      {/* arms */}
      <path d="M22 40 Q14 38 10 42" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M36 40 Q44 36 46 40" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"/>
      {/* motion lines */}
      <path d="M46 48 L50 47 M46 52 L50 52 M46 55 L49 56" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function DancerIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* stage floor */}
      <path d="M10 72 Q40 68 70 72" stroke="#e9d5ff" strokeWidth="2" strokeLinecap="round"/>
      {/* dress/skirt */}
      <path d="M28 46 Q32 62 22 70 Q32 65 40 70 Q48 65 58 70 Q48 62 52 46 Z" fill="#c084fc" stroke="#a855f7" strokeWidth="1.5"/>
      {/* bodice */}
      <rect x="30" y="32" width="16" height="16" rx="5" fill="#a855f7" stroke="#9333ea" strokeWidth="1.5"/>
      {/* head */}
      <circle cx="38" cy="22" r="8" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5"/>
      {/* bun */}
      <circle cx="38" cy="14" r="4" fill="#92400e" stroke="#78350f" strokeWidth="1"/>
      <path d="M34 17 Q38 14 42 17" fill="#92400e"/>
      {/* face */}
      <circle cx="35" cy="23" r="1" fill="#1e1b4b"/>
      <circle cx="41" cy="23" r="1" fill="#1e1b4b"/>
      <path d="M35 27 Q38 29 41 27" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
      {/* arms in arabesque */}
      <path d="M30 36 Q18 28 12 22" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M46 36 Q56 30 62 26" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round"/>
      {/* raised leg */}
      <path d="M36 62 Q28 55 20 50" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round"/>
      {/* standing leg */}
      <path d="M40 62 Q40 67 38 72" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round"/>
      {/* sparkles */}
      <path d="M62 24 L64 20 L66 24 L62 24" fill="#fcd34d"/>
      <path d="M11 20 L13 16 L15 20 L11 20" fill="#fcd34d"/>
      <circle cx="68" cy="32" r="2" fill="#f9a8d4"/>
      <circle cx="10" cy="36" r="1.5" fill="#f9a8d4"/>
    </svg>
  );
}

function HockeyIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* ice */}
      <ellipse cx="40" cy="72" rx="32" ry="4" fill="#bfdbfe" opacity="0.5"/>
      {/* body */}
      <rect x="28" y="36" width="16" height="18" rx="5" fill="#ef4444" stroke="#dc2626" strokeWidth="1.5"/>
      {/* helmet */}
      <circle cx="36" cy="24" r="8" fill="#374151" stroke="#1f2937" strokeWidth="1.5"/>
      <rect x="30" y="28" width="12" height="4" rx="2" fill="#4b5563"/>
      {/* face guard bars */}
      <line x1="31" y1="28" x2="31" y2="32" stroke="#9ca3af" strokeWidth="1"/>
      <line x1="34" y1="28" x2="34" y2="32" stroke="#9ca3af" strokeWidth="1"/>
      <line x1="37" y1="28" x2="37" y2="32" stroke="#9ca3af" strokeWidth="1"/>
      <line x1="40" y1="28" x2="40" y2="32" stroke="#9ca3af" strokeWidth="1"/>
      {/* number on jersey */}
      <text x="32" y="49" fontSize="7" fill="white" fontWeight="bold">11</text>
      {/* stick arm */}
      <path d="M44 42 Q56 44 64 50" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      {/* stick */}
      <path d="M64 50 Q68 56 66 66" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M60 64 Q66 66 70 64" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round"/>
      {/* other arm */}
      <path d="M28 42 Q18 38 14 40" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      {/* legs / skates */}
      <path d="M30 54 Q26 62 24 68" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M42 54 Q44 62 44 68" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M20 68 Q24 66 28 68" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round"/>
      <path d="M40 68 Q44 66 48 68" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round"/>
      {/* puck */}
      <ellipse cx="62" cy="67" rx="5" ry="2.5" fill="#1f2937"/>
    </svg>
  );
}

function GenericSportIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* podium */}
      <rect x="24" y="60" width="32" height="12" rx="3" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5"/>
      <rect x="14" y="65" width="12" height="7" rx="2" fill="#d97706"/>
      <rect x="54" y="67" width="12" height="5" rx="2" fill="#d97706"/>
      {/* body */}
      <rect x="28" y="32" width="14" height="16" rx="5" fill="#10b981" stroke="#059669" strokeWidth="1.5"/>
      {/* head */}
      <circle cx="35" cy="22" r="8" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5"/>
      {/* hair */}
      <path d="M28 18 Q35 12 42 18" fill="#92400e"/>
      {/* face happy */}
      <circle cx="32" cy="23" r="1.2" fill="#1e1b4b"/>
      <circle cx="38" cy="23" r="1.2" fill="#1e1b4b"/>
      <path d="M31 27 Q35 31 39 27" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
      {/* arms raised in victory */}
      <path d="M28 36 Q18 28 12 20" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M42 36 Q52 28 58 20" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
      {/* legs */}
      <path d="M32 48 Q30 54 28 60" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M38 48 Q40 54 42 60" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"/>
      {/* medal */}
      <circle cx="35" cy="42" r="4" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1"/>
      <text x="33" y="45" fontSize="5" fill="#92400e" fontWeight="bold">★</text>
      {/* stars */}
      <path d="M10 18 L12 14 L14 18 L10 18" fill="#fcd34d"/>
      <path d="M56 18 L58 14 L60 18 L56 18" fill="#fcd34d"/>
      <circle cx="16" cy="28" r="1.5" fill="#fbbf24"/>
      <circle cx="54" cy="28" r="1.5" fill="#fbbf24"/>
    </svg>
  );
}

/* ─── Keyword → illustration mapping ─── */

type IllustrationKey =
  | "swimmer"
  | "skater"
  | "gymnast"
  | "soccer"
  | "dancer"
  | "hockey"
  | "generic";

const ILLUSTRATIONS: Record<IllustrationKey, (props: { className?: string }) => React.ReactElement> = {
  swimmer: SwimmerIllustration,
  skater: SkaterIllustration,
  gymnast: GymnastIllustration,
  soccer: SoccerIllustration,
  dancer: DancerIllustration,
  hockey: HockeyIllustration,
  generic: GenericSportIllustration,
};

function detectActivity(name: string): IllustrationKey {
  const n = (name ?? "").toLowerCase();
  if (n.includes("swim")) return "swimmer";
  // Check hockey BEFORE generic "ice" so "Ice Hockey" routes correctly
  if (n.includes("hockey")) return "hockey";
  if (n.includes("skat") || n.includes("ice")) return "skater";
  if (n.includes("gym") || n.includes("tumbl") || n.includes("acro")) return "gymnast";
  if (n.includes("soccer") || n.includes("football")) return "soccer";
  if (n.includes("danc") || n.includes("ballet") || n.includes("tap")) return "dancer";
  // Future-friendly extras (illustration falls back to generic for now)
  return "generic";
}

/* ─── Public component ─── */

interface ActivityIllustrationProps {
  activityName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-20 h-20",
};

export function ActivityIllustration({
  activityName,
  className,
  size = "md",
}: ActivityIllustrationProps) {
  const key = detectActivity(activityName);
  const Illustration = ILLUSTRATIONS[key];
  return (
    <Illustration
      className={cn(SIZE_CLASSES[size], "drop-shadow-sm", className)}
    />
  );
}
