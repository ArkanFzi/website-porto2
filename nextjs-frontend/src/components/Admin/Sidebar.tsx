"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Inbox, Briefcase, LogOut } from "lucide-react";
import { removeAuthToken } from "@/lib/auth";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        removeAuthToken();
        router.push("/admin/login");
    };

    const navItems = [
        { label: "Dashboard (Inbox)", href: "/admin/dashboard", icon: Inbox },
        { label: "Projects", href: "/admin/projects", icon: Briefcase },
    ];

    return (
        <div className="w-64 min-h-screen bg-[#0a0000] border-r border-red-900/30 p-6 flex flex-col">
            <div className="mb-10">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-accent-primary">
                    Admin Panel
                </h2>
                <p className="text-xs text-gray-500 mt-1">Elaris Noir System</p>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <span
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/50"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <item.icon size={18} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto pt-6 border-t border-red-900/30">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full text-left"
                >
                    <LogOut size={18} />
                    <span className="font-medium text-sm">Logout</span>
                </button>
            </div>
        </div>
    );
}
