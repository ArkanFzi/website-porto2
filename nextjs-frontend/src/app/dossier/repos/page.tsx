"use client";

import React, { useEffect, useState } from "react";
import TimedCarousel, { CarouselItem } from "@/components/Dossier/TimedCarousel";
import SuperCTA from "@/components/Dossier/SuperCTA";
import { Star, GitFork, BookOpen, ExternalLink } from "lucide-react";

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  fork: boolean;
}

// Curated high-quality unsplash backgrounds for repose
const REPO_BACKGROUNDS = [
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000"
];

export default function ReposPage() {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [allRepos, setAllRepos] = useState<GitHubRepo[]>([]);

  useEffect(() => {
    fetch("/api/github-repos")
      .then((r) => r.ok ? r.json() : [])
      .then((data: GitHubRepo[]) => {
        const filtered = data
            .filter((r) => !r.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count);
            
        setAllRepos(filtered);

        const top5 = filtered.slice(0, 5); // Take top 5 for the carousel so it's not overwhelming

        const mappedItems: CarouselItem[] = top5.map((repo, idx) => {
            return {
                id: repo.id,
                title: repo.name,
                subtitle: repo.language || "Open Source",
                imageUrl: REPO_BACKGROUNDS[idx % REPO_BACKGROUNDS.length],
                metrics: (
                    <div className="flex items-center gap-6 mt-4">
                        <span className="flex items-center gap-2 font-mono text-xl"><Star className="w-5 h-5 text-yellow-500" /> {repo.stargazers_count}</span>
                        <span className="flex items-center gap-2 font-mono text-xl"><GitFork className="w-5 h-5" /> {repo.forks_count}</span>
                        <a 
                            href={repo.html_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="ml-4 px-6 py-3 border border-white/30 rounded-full text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
                        >
                            View Source
                        </a>
                    </div>
                )
            };
        });
        setItems(mappedItems);
      })
      .catch((e) => console.error(e));
  }, []);

  return (
    <main className="w-full bg-[#111111] min-h-screen font-sans selection:bg-[#c49a56]/30">
        <TimedCarousel 
            items={items} 
            backHref="/dossier" 
            categoryName="Repositories" 
            autoPlayInterval={6000} 
        />
        
        {/* Deep Dive Archive Section */}
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-32 text-white border-b border-white/5 relative z-10 bg-[#111]">
            <div className="mb-16">
                <span className="text-[#c49a56] font-mono text-sm tracking-widest uppercase mb-4 block">Archive</span>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">All Repositories</h2>
                <div className="flex gap-8 mt-8 border-b border-white/10 pb-4 text-sm font-mono text-white/40 uppercase tracking-widest">
                    <span className="flex-1">Repository</span>
                    <span className="w-32 hidden md:block">Language</span>
                    <span className="w-24 text-right">Stars</span>
                    <span className="w-24 text-right">Action</span>
                </div>
            </div>

            <div className="flex flex-col">
                {allRepos.map((repo) => (
                    <a 
                        key={repo.id}
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-wrap md:flex-nowrap items-center gap-4 py-6 border-b border-white/5 hover:bg-white/5 transition-colors group px-4 -mx-4 rounded-xl"
                    >
                        <div className="flex-1 min-w-[200px]">
                            <h3 className="text-xl font-bold text-white group-hover:text-[#c49a56] transition-colors flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-white/30" />
                                {repo.name}
                            </h3>
                            <p className="text-white/40 text-sm mt-2 line-clamp-1">{repo.description || "No description provided."}</p>
                        </div>
                        <div className="w-full md:w-32 text-sm font-mono text-white/50 hidden md:block">
                            {repo.language || "Unknown"}
                        </div>
                        <div className="w-24 text-right flex items-center justify-end gap-1 text-white/70 font-mono">
                            <Star className="w-3.5 h-3.5 text-yellow-500/50" /> {repo.stargazers_count}
                        </div>
                        <div className="w-24 text-right">
                            <ExternalLink className="w-5 h-5 ml-auto text-white/20 group-hover:text-white transition-colors" />
                        </div>
                    </a>
                ))}
            </div>
        </section>

        <SuperCTA />
    </main>
  );
}
