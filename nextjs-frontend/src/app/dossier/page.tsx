import React from "react";
import DossierScene from "@/components/3D/DossierScene";
import Navigation from "@/app/components/Navigation";

export const metadata = {
    title: "Dossier — M. Arkan Fauzi",
    description: "Classified professional record and experience of M. Arkan Fauzi.",
};

export default function DossierPage() {
    return (
        <main className="w-full relative bg-[#020307] min-h-screen text-white overflow-hidden">
            {/* We reuse the Navigation but force it to have a dark background if needed, 
          or let it be transparent over the dark 3D scene */}
            <div className="fixed top-0 z-[1000] w-full">
                <Navigation />
            </div>

            {/* The 3D Scene which handles scroll interactions via ScrollControls */}
            <DossierScene />

        </main>
    );
}
