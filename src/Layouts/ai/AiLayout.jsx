import React from "react";
import { Outlet } from "react-router-dom";

export default function AiLayout() {
  return (
    <div className="flex flex-col w-full h-full p-4 bg-white overflow-hidden font-extrabold text-slate-900">
      <main className="flex-grow overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
