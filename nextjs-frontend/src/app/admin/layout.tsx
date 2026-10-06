"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import { Sidebar } from "@/components/Admin/Sidebar";

const BELUM_TERSEDIA = "belum-terbaca";
const TANPA_TOKEN = "tanpa-token";
const PAKAI_TOKEN = "pakai-token";

const EMPTY_SUBSCRIBE = () => () => {};
const getTokenStatus = () => (getAuthToken() ? PAKAI_TOKEN : TANPA_TOKEN);
// Nilai hidrasi sengaja dibedakan dari kedua nilai client agar efek mount pertama
// tidak melempar ke login hanya karena localStorage belum sempat terbaca.
const getInitialStatus = () => BELUM_TERSEDIA;

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const status = useSyncExternalStore(EMPTY_SUBSCRIBE, getTokenStatus, getInitialStatus);

    useEffect(() => {
        if (pathname === "/admin/login") return;
        if (status === TANPA_TOKEN) router.push("/admin/login");
    }, [pathname, router, status]);

    // Login page layout — render independently of auth state
    if (pathname === "/admin/login") {
        return <main className="min-h-screen bg-[#050000]">{children}</main>;
    }

    if (status !== PAKAI_TOKEN) {
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
