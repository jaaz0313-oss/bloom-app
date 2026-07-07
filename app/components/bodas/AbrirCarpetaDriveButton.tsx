"use client";

import { FolderOpen } from "lucide-react";

type AbrirCarpetaDriveButtonProps = {
  driveFolderUrl?: string | null;
  className?: string;
};

const baseClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface text-bloom-ink transition-colors";

export function AbrirCarpetaDriveButton({
  driveFolderUrl = null,
  className = "",
}: AbrirCarpetaDriveButtonProps) {
  if (!driveFolderUrl) {
    return (
      <button
        type="button"
        disabled
        title="Primero crea la carpeta de Drive de esta boda"
        aria-label="Primero crea la carpeta de Drive de esta boda"
        className={`${baseClass} cursor-not-allowed opacity-50 ${className}`}
      >
        <FolderOpen className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  return (
    <a
      href={driveFolderUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir carpeta de Drive de esta boda"
      aria-label="Abrir carpeta de Drive de esta boda"
      className={`${baseClass} hover:border-bloom-accent hover:bg-bloom-canvas hover:text-bloom-accent ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <FolderOpen className="h-4 w-4" aria-hidden />
    </a>
  );
}
