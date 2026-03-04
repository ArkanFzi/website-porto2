"use client";

import { ReactNode } from "react";
import {
    motion,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
} from "framer-motion";

interface SmoothScrollSkewProps {
    children: ReactNode;
}

export function SmoothScrollSkew({ children }: SmoothScrollSkewProps) {
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);

    // Smooth the velocity to prevent sudden jumps
    const smoothVelocity = useSpring(scrollVelocity, {
        damping: 50,
        stiffness: 400
    });

    // Map the smooth velocity to a skew degree (subtle: -2 to +2 degrees)
    const skewY = useTransform(smoothVelocity, [-2000, 2000], [-1.5, 1.5]);

    return (
        <motion.div
            style={{
                skewY,
                willChange: "transform",
            }}
            className="w-full origin-center"
        >
            {children}
        </motion.div>
    );
}
