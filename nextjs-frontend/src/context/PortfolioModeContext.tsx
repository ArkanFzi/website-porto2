"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type PortfolioMode = "engineer" | "creator";

interface ModeContextType {
  mode: PortfolioMode;
  setMode: (mode: PortfolioMode) => void;
  toggleMode: () => void;
}

const PortfolioModeContext = createContext<ModeContextType>({
  mode: "engineer",
  setMode: () => {},
  toggleMode: () => {},
});

export function PortfolioModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PortfolioMode>("engineer");
  const toggleMode = () => setMode((m) => (m === "engineer" ? "creator" : "engineer"));

  return (
    <PortfolioModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </PortfolioModeContext.Provider>
  );
}

export function usePortfolioMode() {
  return useContext(PortfolioModeContext);
}
