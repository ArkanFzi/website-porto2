"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import { Sidebar } from "@/components/Admin/Sidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Exclude login page from auth check
        if (pathname === "/admin/login") {
            setIsAuthorized(true);
            return;
        }

        const token = getAuthToken();
        if (!token) {
            router.push("/admin/login");
        } else {
            setIsAuthorized(true);
        }
    }, [pathname, router]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#050000] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Login page layout
    if (pathname === "/admin/login") {
        return <main className="min-h-screen bg-[#050000]">{children}</main>;
    }

    // Dashboard layout
    return (
        <div className="min-h-screen bg-[#050000] flex text-gray-200">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
    );
}
