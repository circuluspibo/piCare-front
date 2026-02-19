import React from "react";
import { Outlet, useNavigate } from "react-router-dom";

export default function TrainingLayout() {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate("/training");
  };
  return (
    <div className="flex flex-col w-full h-full p-4 bg-white overflow-hidden font-extrabold text-slate-900">
      {/* 메인 영역 */}
      <main className="flex-grow overflow-hidden">
        <Outlet context={{ onComplete: handleComplete }} />
      </main>
    </div>
  );
}
