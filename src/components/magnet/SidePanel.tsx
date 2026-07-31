"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeDisabled?: boolean;
  widthClassName?: string;
  overlayZIndexClassName?: string;
  panelZIndexClassName?: string;
}

export default function SidePanel({
  open,
  onClose,
  title,
  children,
  closeDisabled = false,
  widthClassName = "md:w-[45vw]",
  overlayZIndexClassName = "z-40",
  panelZIndexClassName = "z-[99999]",
}: SidePanelProps) {
  return (
    <>
      <div
        onClick={closeDisabled ? undefined : onClose}
        className={`fixed inset-0 transition-opacity duration-300 ${overlayZIndexClassName} ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed top-0 right-0 h-screen w-full border-l border-black ${widthClassName} bg-white ${panelZIndexClassName} transition-transform duration-500 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-2 border-b border-black py-5">
            <h2 className="text-sm font-black uppercase">{title}</h2>
            <button onClick={onClose} disabled={closeDisabled} aria-label="Fechar">
              <X size={24} />
            </button>
          </div>

          {children}
        </div>
      </aside>
    </>
  );
}