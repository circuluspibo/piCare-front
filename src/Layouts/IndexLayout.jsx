import { Outlet } from "react-router-dom";

const scaleFactor = 960 / 1024;

export default function IndexLayout() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-50 overflow-hidden">
      <div
        className="w-[1024px] h-[600px] max-w-[1024zpx] max-h-[600px] bg-white shadow-2xl h-[min(100vh,600px)] mx-auto overflow-auto relative"
        style={{
          transform: `scale(${scaleFactor})`,
          transformOrigin: "center",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
