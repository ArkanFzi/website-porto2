export const setAuthToken = (token: string) => {
    if (typeof window !== "undefined") {
        localStorage.setItem("admin_token", token);
    }
};

export const getAuthToken = (): string | null => {
    if (typeof window !== "undefined") {
        return localStorage.getItem("admin_token");
    }
    return null;
};

export const removeAuthToken = () => {
    if (typeof window !== "undefined") {
        localStorage.removeItem("admin_token");
    }
};

export const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // Next.js config proxyrewrites automatically forward this to the backend
    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Unauthorized mechanism
        removeAuthToken();
        if (typeof window !== "undefined") {
            window.location.href = "/admin/login";
        }
    }

    return response;
};
