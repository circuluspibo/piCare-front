import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { IconRenderer } from "@/components/ui/IconRenderer";
import { cn } from "@/lib/utils";
import { buttonLabels } from "@/assets/data/buttonLabels";

export default function ActionSidebar({
  weatherStatus,
  temperature,
  isAutoMode,
  setIsAutoMode,
  onWeatherClick,
  onMenuClick,
}) {
  return (
    <div className="w-2/12 flex flex-col h-full gap-4">
      {/* 날씨 정보 카드 */}
      <div
        onClick={onWeatherClick}
        className={cn(
          "flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer transition-all",
          `bg-${weatherStatus.color}-200`,
        )}
      >
        <div className="flex items-center gap-2">
          <IconRenderer
            icon={weatherStatus.icon}
            className={cn("w-10 h-10", `text-${weatherStatus.color}-600`)}
          />
          <span
            className={cn(
              "text-3xl font-black tracking-tighter",
              `text-${weatherStatus.color}-800`,
            )}
          >
            {temperature}°
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-black mt-1 uppercase",
            `text-${weatherStatus.color}-800`,
          )}
        >
          {weatherStatus.label}
        </span>
      </div>

      {/* NOTE: 임시 주석 AI 모드 스위치 */}
      {/* <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        <span
          className={cn(
            "text-lg font-black",
            isAutoMode ? "text-blue-600" : "text-gray-400",
          )}
        >
          AI 모드
        </span>
        <Switch checked={isAutoMode} onCheckedChange={setIsAutoMode} />
      </div> */}

      {/* 메뉴 버튼 리스트 */}
      {buttonLabels.map((v, i) => (
        <Button
          key={i}
          onClick={() => onMenuClick(v)}
          className={cn(
            "flex flex-1 flex-col justify-center text-xl font-black rounded-2xl border-b-[8px] active:border-b-0 active:translate-y-1 shadow-sm transition-all",
            `bg-${v.color}-200 text-${v.color}-800 border-${v.color}-300`,
          )}
        >
          <IconRenderer icon={v.icon} style={{ width: 60, height: 60 }} />
        </Button>
      ))}
    </div>
  );
}
