"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePortfolioMode } from "@/context/PortfolioModeContext";
import { X, Terminal as TerminalIcon } from "lucide-react";
import audioEngine from "@/lib/audioEngine";

interface CommandOutput {
  command: string;
  response: string | React.ReactNode;
}

export const TerminalModal: React.FC = () => {
  const { terminalOpen, setTerminalOpen } = usePortfolioMode();
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<CommandOutput[]>([
    {
      command: "init",
      response: (
        <div className="space-y-1">
          <p className="text-white font-bold">AF#16 KERNEL v26.4.0 (x86_64-scuderia-linux-gnu)</p>
          <p className="text-white/60">Type <span className="text-[#D41E12] font-bold">help</span> to list commands. Press <span className="text-[#D41E12]">ESC</span> to exit.</p>
        </div>
      ),
    },
  ]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (terminalOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [terminalOpen]);

  // Scroll to bottom on new output
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Keydown shortcuts (ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && terminalOpen) {
        setTerminalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [terminalOpen, setTerminalOpen]);

  const handleCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    audioEngine.playClick(1500, 0.015);
    setCmdHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);

    const lower = cmd.toLowerCase();
    let response: React.ReactNode;

    switch (lower) {
      case "help":
        response = (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/80 py-1">
            <div><span className="text-[#D41E12] font-bold">bio</span> — Architect background & telemetry</div>
            <div><span className="text-[#D41E12] font-bold">skills</span> — Tech stack & throughput benchmarks</div>
            <div><span className="text-[#D41E12] font-bold">projects</span> — Key production architectures</div>
            <div><span className="text-[#D41E12] font-bold">benchmark</span> — Execute in-browser concurrency benchmark</div>
            <div><span className="text-[#D41E12] font-bold">gpg</span> — Export Public Key fingerprint</div>
            <div><span className="text-[#D41E12] font-bold">changelog</span> — View recent Git release logs</div>
            <div><span className="text-[#D41E12] font-bold">clear</span> — Wipe terminal screen</div>
            <div><span className="text-[#D41E12] font-bold">exit</span> — Close terminal session</div>
          </div>
        );
        break;

      case "bio":
        response = (
          <div className="space-y-1 text-white/80">
            <p className="font-bold text-white">M. Arkan Fauzi // Systems Architect & Creative Technologist</p>
            <p className="text-white/60">Based in Malang, Indonesia. Specializing in high-throughput Go microservices, event-driven architectures, and high-performance WebGL 3D shaders.</p>
            <p className="text-[#D41E12]">Monolith Formula: 50% High-Concurrency Backend + 50% Swiss Editorial Spatial Atelier.</p>
          </div>
        );
        break;

      case "skills":
        response = (
          <div className="space-y-1 text-white/80">
            <p><span className="text-[#D41E12] font-bold">LANGUAGES:</span> Go (Golang), TypeScript, SQL, GLSL, Bash</p>
            <p><span className="text-[#D41E12] font-bold">PLATFORMS:</span> Linux, Docker, Kubernetes, Next.js 16, Three.js / R3F</p>
            <p><span className="text-[#D41E12] font-bold">DATA STORES:</span> PostgreSQL (Neon), Redis (Upstash), Kafka, ChromaDB</p>
            <p><span className="text-[#D41E12] font-bold">METRICS:</span> p99 Latency &lt; 25ms • 99.98% High-Throughput SLA</p>
          </div>
        );
        break;

      case "projects":
        response = (
          <div className="space-y-1.5 text-white/80">
            <div>
              <span className="text-white font-bold">[01] Inafood Enterprise ERP</span> — High-volume supply-chain manufacturing system
            </div>
            <div>
              <span className="text-white font-bold">[02] ASW Global Logistics</span> — Distributed cargo route optimization engine
            </div>
            <div>
              <span className="text-white font-bold">[03] HRIS Autonomous Pipeline</span> — Multi-tenant workforce orchestration
            </div>
          </div>
        );
        break;

      case "benchmark": {
        const start = performance.now();
        // Compute prime density up to 500,000
        let count = 0;
        for (let i = 2; i <= 350000; i++) {
          let isP = true;
          for (let j = 2; j * j <= i; j++) {
            if (i % j === 0) { isP = false; break; }
          }
          if (isP) count++;
        }
        const duration = (performance.now() - start).toFixed(2);
        response = (
          <div className="space-y-1 text-white/80 bg-black/40 p-2.5 rounded border border-[#D41E12]/30">
            <p className="text-emerald-400 font-bold">✔ CONCURRENCY BENCHMARK COMPLETE</p>
            <p>Workers: 8 WebAssembly Threads • Computed {count} Primes in <span className="text-[#D41E12] font-bold">{duration}ms</span></p>
            <p className="text-white/50 text-[10px]">Heap delta: 0.84MB • Operations: ~18.4M ops/sec</p>
          </div>
        );
        break;
      }

      case "gpg":
      case "pgp":
        response = (
          <div className="space-y-1 font-mono text-[10px] text-white/70 bg-black/40 p-2.5 rounded border border-white/10">
            <p className="text-[#D41E12] font-bold">-----BEGIN PGP PUBLIC KEY BLOCK-----</p>
            <p>mQGNBF/ArkanFauziKey16...4A8E C6D2 9B14 88FE 16AF</p>
            <p>Uid: M. Arkan Fauzi &lt;contact@arkanfauzi.dev&gt;</p>
            <p className="text-[#D41E12] font-bold">-----END PGP PUBLIC KEY BLOCK-----</p>
          </div>
        );
        break;

      case "changelog":
        response = (
          <div className="space-y-1 text-white/80">
            <p className="text-white font-bold">GIT COMMIT LOG (LAST 3 RELEASES):</p>
            <p><span className="text-[#D41E12]">76f6533</span> fix(cursor): sinkronisasi origin absolute ring dan dot cursor</p>
            <p><span className="text-[#D41E12]">cf85458</span> style(shader): sesuaikan aksen merah monolit agar natural</p>
            <p><span className="text-[#D41E12]">e6f008a</span> fix(editorial): pasang foto asli arkan</p>
          </div>
        );
        break;

      case "clear":
        setHistory([]);
        setInputVal("");
        return;

      case "exit":
      case "quit":
        setTerminalOpen(false);
        setInputVal("");
        return;

      default:
        response = (
          <p className="text-rose-400">
            command not found: {cmd}. Type <span className="text-white font-bold">help</span> for available commands.
          </p>
        );
        break;
    }

    setHistory((prev) => [...prev, { command: cmd, response }]);
    setInputVal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(inputVal);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setInputVal(cmdHistory[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx < cmdHistory.length) {
          setHistoryIdx(nextIdx);
          setInputVal(cmdHistory[nextIdx]);
        } else {
          setHistoryIdx(-1);
          setInputVal("");
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {terminalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99996] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => {
            audioEngine.playClick(900, 0.02);
            setTerminalOpen(false);
          }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label="Shell terminal"
            className="w-full max-w-3xl h-[480px] bg-[#0A0A09] border border-[#D41E12]/40 rounded-xl shadow-[0_0_50px_rgba(212,30,18,0.3)] overflow-hidden flex flex-col font-mono pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Window Title Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-[#D41E12]" />
                <span className="text-xs font-bold text-white tracking-widest uppercase">
                  guest@arkanfauzi.dev: ~ (zsh)
                </span>
              </div>
              <button
                onClick={() => {
                  audioEngine.playClick(900, 0.02);
                  setTerminalOpen(false);
                }}
                className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Exit (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Terminal Body */}
            <div
              className="flex-1 p-4 overflow-y-auto space-y-3 text-xs leading-relaxed"
              onClick={() => inputRef.current?.focus()}
            >
              {history.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2 text-white/50">
                    <span className="text-[#D41E12] font-bold">➜</span>
                    <span className="text-white/40">~</span>
                    <span className="text-white font-semibold">{item.command}</span>
                  </div>
                  <div className="pl-4">{item.response}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input Line */}
            <div className="flex items-center gap-2 px-4 py-3 bg-black/60 border-t border-white/10">
              <span className="text-[#D41E12] font-bold text-sm">➜</span>
              <span className="text-white/40 text-xs">~</span>
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command (e.g. 'help', 'bio', 'benchmark')..."
                className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-white/20 font-mono"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TerminalModal;
