"use client";

import Image from "next/image";
import { useState } from "react";

type CelestiaLogoProps = {
  variant?: "header" | "footer";
  className?: string;
};

export function CelestiaLogo({
  variant = "header",
  className = "",
}: CelestiaLogoProps) {
  const [failed, setFailed] = useState(false);

  const isHeader = variant === "header";
  const width = isHeader ? 320 : 180;
  const height = isHeader ? 160 : 90;

  if (failed) {
    return (
      <p
        className={`font-display font-medium tracking-[0.18em] text-bloom-accent ${
          isHeader
            ? "text-4xl sm:text-5xl"
            : "text-xl opacity-90 sm:text-2xl"
        } ${className}`}
        aria-label="Celestia Wedding Planner & Events"
      >
        Celestia
      </p>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt="Celestia Wedding Planner & Events"
      width={width}
      height={height}
      className={
        isHeader
          ? `h-auto w-72 object-contain sm:w-80 ${className}`
          : `h-auto w-40 object-contain opacity-90 sm:w-[180px] ${className}`
      }
      priority={isHeader}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
