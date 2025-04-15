"use client";

import { ReactElement } from "react";

export function ClientPage(): ReactElement | null {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-gray-100"
    >
      <h1
        className="text-3xl font-bold text-center mt-10"
      >
        Ruby CPS Visualizer
      </h1>
    </div>
  );
}
