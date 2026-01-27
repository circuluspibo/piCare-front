import { useAnalytics } from "@/hooks/useAnalytics";
import { Outlet } from "react-router-dom";

export default function IndexLayout() {
  useAnalytics();
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-red-500 overflow-hidden caret-transparent">
      <div
        className="w-full h-full bg-white shadow-2xl overflow-auto"
        style={{
          transformOrigin: "center",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
