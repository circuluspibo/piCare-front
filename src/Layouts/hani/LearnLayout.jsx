import HaniBreadcrumb from "@/components/HaniBradcrumb";
import TopContentList from "@/components/TabContentList";
import { useLearnContext } from "@/contexts/learnContext";
import { COLORS, METHODS, TARGETS } from "@/utils/haniUtil";
import { ArrowBigLeft } from "lucide-react";
import { useMemo } from "react";
import { Outlet, useNavigate, useSearchParams } from "react-router-dom";

export default function LearnLayout() {
  const navigate = useNavigate();
  const {
    character,
    chapter,
    method,
    openContentList,
    currentItemIdx,
    contentData,
    handleContentSelect,
    handleContentListClose,
  } = useLearnContext();
  const [searchParam] = useSearchParams();
  const target = searchParam.get("target") || "";

  const getTitle = useMemo(() => {
    if (!target) return "학습";
    if (target in TARGETS) {
      return target === "letter"
        ? `${TARGETS[target]}를`
        : `${TARGETS[target]}을`;
    }
    if (target in METHODS) {
      return target === "write"
        ? `${METHODS[target]}를`
        : `${METHODS[target]}을`;
    }
    return "컨텐츠";
  }, [target]);

  const isMenu = useMemo(() => {
    if (!character && !chapter)
      return { header: "👦🏻👧🏻 나는 누구일까요?", route: "/" };
    if (character && !target)
      return { header: "📚 무엇을 배울까요?", route: "/learn" };
    else if (target)
      return {
        header: `🎯 ${getTitle} 어떻게 배울까요?`,
        route: `/learn/${character}`,
      };
    else return { header: "", route: "/learn" };
  }, [character, chapter, target, getTitle]);

  return (
    <div className="flex flex-col w-full h-full p-4 bg-white overflow-hidden font-extrabold text-slate-900">
      {!method && (
        <header className="flex flex-col items-start pb-4 border-b border-stone-200 mb-4">
          <div className="flex items-center text-4xl font-black cursor-pointer">
            <ArrowBigLeft
              className="size-14 mr-2 cursor-pointer hover:scale-110 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                navigate(isMenu.route);
              }}
            />
            {isMenu.header}
          </div>
        </header>
      )}

      {method && (
        <header className="relative flex w-full flex-col items-start pb-4 border-b border-stone-200 mb-4">
          {/** 컨텐츠 리스트 정보 불러오기 */}
          <TopContentList
            open={openContentList}
            color={COLORS[method]}
            currentIndex={currentItemIdx}
            data={contentData?.contents || []} // Provider 구조에 맞게 .contents로 변경 권장
            onSelect={handleContentSelect}
            onClose={handleContentListClose}
          />
          <HaniBreadcrumb />
        </header>
      )}

      <main className="flex-grow overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
