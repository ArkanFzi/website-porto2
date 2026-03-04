"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface ScrambleTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  as?: React.ElementType;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*()_+{}:<>?";

export const ScrambleText: React.FC<ScrambleTextProps> = ({
  text,
  className = "",
  delay = 0,
  duration = 1.5,
  as = motion.span
}) => {
  const [displayText, setDisplayText] = useState("");
  const [isScrambling, setIsScrambling] = useState(false);
  const frameRef = useRef<number>(0);

  const Component = as as any;

  const scramble = () => {
    let iteration = 0;
    const maxIterations = duration * 60; // Assuming 60fps

    cancelAnimationFrame(frameRef.current);

    const update = () => {
      setDisplayText((prev) =>
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < (iteration / maxIterations) * text.length) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );

      iteration += 1;

      if (iteration <= maxIterations) {
        frameRef.current = requestAnimationFrame(update);
      } else {
        setDisplayText(text);
        setIsScrambling(false);
      }
    };

    frameRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsScrambling(true);
      scramble();
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frameRef.current);
    };
  }, [text, delay, duration]);

  if (!isScrambling && displayText === "") {
    return <Component className={`opacity-0 ${className}`}>{text}</Component>;
  }

  return (
    <Component
      onMouseEnter={scramble}
      className={className}
    >
      {displayText || text}
    </Component>
  );
};
