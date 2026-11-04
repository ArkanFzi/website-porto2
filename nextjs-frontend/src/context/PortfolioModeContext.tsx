"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import audioEngine from "@/lib/audioEngine";

export type PortfolioMode = "engineer" | "creator";

interface ModeContextType {
  mode: PortfolioMode;
  setMode: (mode: PortfolioMode) => void;
  toggleMode: () => void;
  wireframe: boolean;
  toggleWireframe: () => void;
  telemetryOpen: boolean;
  setTelemetryOpen: (open: boolean) => void;
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  audioMuted: boolean;
  toggleAudio: () => void;
}

const PortfolioModeContext = createContext<ModeContextType>({
  mode: "engineer",
  setMode: () => {},
  toggleMode: () => {},
  wireframe: false,
  toggleWireframe: () => {},
  telemetryOpen: false,
  setTelemetryOpen: () => {},
  terminalOpen: false,
  setTerminalOpen: () => {},
  audioMuted: true,
  toggleAudio: () => {},
});

export function PortfolioModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PortfolioMode>("engineer");
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [telemetryOpen, setTelemetryOpen] = useState<boolean>(false);
  const [terminalOpen, setTerminalOpen] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(() => audioEngine.isMuted());

  const setMode = (newMode: PortfolioMode) => {
    audioEngine.playClick(1200, 0.02);
    setModeState(newMode);
  };

  const toggleMode = () => {
    setMode(mode === "engineer" ? "creator" : "engineer");
  };

  const toggleWireframe = () => {
    audioEngine.playClick(950, 0.025);
    setWireframe((prev) => !prev);
  };

  const toggleAudio = () => {
    const isNowMuted = audioEngine.toggleMute();
    setAudioMuted(isNowMuted);
  };

  // Keyboard shortcut `Cmd+K` or `~` to toggle terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        audioEngine.playClick(1600, 0.02);
        setTerminalOpen((prev) => !prev);
      } else if (e.key === "`" || e.key === "~") {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          audioEngine.playClick(1600, 0.02);
          setTerminalOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <PortfolioModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        wireframe,
        toggleWireframe,
        telemetryOpen,
        setTelemetryOpen,
        terminalOpen,
        setTerminalOpen,
        audioMuted,
        toggleAudio,
      }}
    >
      {children}
    </PortfolioModeContext.Provider>
  );
}

export function usePortfolioMode() {
  return useContext(PortfolioModeContext);
}
