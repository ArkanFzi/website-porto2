"use client";

import React from "react";
import { GlassCard } from "@/components/UI/GlassCard";
import { TiltCard } from "@/components/UI/TiltCard";
import { motion } from "framer-motion";
import { TechCloud } from "@/components/Three/TechCloud";
import { Canvas } from "@react-three/fiber";
import { staticSkills } from "@/data/skills";

const Skills: React.FC = () => {
  const groupedSkills = staticSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, typeof staticSkills>);

  return (
    <section id="skills" className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-6 mb-12"
        >
          <h2
            className="text-6xl md:text-8xl text-white"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
          >
            SKILLS
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-accent-primary/50 to-transparent" />
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Left: Skills List */}
          <div className="w-full lg:w-1/2 grid gap-6">
            {Object.entries(groupedSkills).map(([category, categorySkills], idx) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <GlassCard className="p-6 border-red-900/40 hover:border-accent-primary/50">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-accent-primary rounded-full" />
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categorySkills.map((skill) => (
                      <span
                        key={skill.id}
                        className="px-3 py-1 bg-black/40 border border-white/10 rounded-md text-sm text-gray-300 flex items-center gap-2"
                      >
                        {skill.name}
                        <span className="text-xs text-accent-primary font-bold">{skill.proficiency}%</span>
                      </span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <TiltCard className="w-full lg:w-1/2 h-[350px] lg:h-[500px]">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-transparent blur-3xl rounded-full opacity-20" />
              <GlassCard className="h-full w-full border-red-900/20 bg-black/20" hoverEffect={false}>
                <Canvas camera={{ position: [0, 0, 8] }} gl={{ alpha: true, antialias: false }}>
                  <ambientLight intensity={0.8} />
                  <pointLight position={[10, 10, 10]} intensity={1.5} color="#DC143C" />
                  <TechCloud />
                </Canvas>
              </GlassCard>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
};

export default Skills;
