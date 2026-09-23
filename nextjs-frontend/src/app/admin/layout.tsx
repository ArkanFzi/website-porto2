"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import { Sidebar } from "@/components/Admin/Sidebar";

const EMPTY_SUBSCRIBE = () => () => {};
const getTokenSnapshot = () => getAuthToken();
const getServerSnapshot = () => null;

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const token = useSyncExternalStore(EMPTY_SUBSCRIBE, getTokenSnapshot, getServerSnapshot);
    const isAuthorized = token !== null;

    useEffect(() => {
        if (pathname === "/admin/login") return;
        if (!token) router.push("/admin/login");
    }, [pathname, router, token]);

    // Login page layout — render independently of auth state
    if (pathname === "/admin/login") {
        return <main className="min-h-screen bg-[#050000]">{children}</main>;
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#050000] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Dashboard layout
    return (
        <div className="min-h-screen bg-[#050000] flex text-gray-200">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
    );
}
