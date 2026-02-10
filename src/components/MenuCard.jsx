import { Card } from "@radix-ui/themes";
import { BlurFade } from "./magicui/blurFade";

const MenuCard = ({
  index,
  item,
  className,
  textcolor,
  onCardClick,
  total,
  disabled,
}) => {
  return (
    <BlurFade
      delay={total > 4 ? 0.1 * index : 0.25 * index}
      inView
      className="flex flex-col gap-2 justify-center items-center self-stretch w-full"
    >
      <Card
        // h-full, w-full을 추가하여 부모의 높이와 너비를 꽉 채웁니다.
        className={`flex relative flex-col w-full h-full gap-0 justify-between items-center p-4 sm:p-6 cursor-pointer transition-all ${className} ${
          disabled ? "opacity-60 saturate-50 blur-[0.5px]" : ""
        }`}
        onClick={() => !disabled && onCardClick(item)}
      >
        {/* 1. 내부 컨테이너도 부모 높이를 따라가도록 h-full 설정 */}
        <div className="flex flex-col w-full h-full items-center">
          <img
            src={`/images/hani/${item.name}.svg`}
            alt={item.name}
            className="max-w-36 h-36 object-fit"
          />

          {/* 2. 설명 영역: 텍스트 양에 따라 유동적이지만 공간을 일정 부분 차지 */}
          <div className="flex flex-1 flex-col items-center justify-center text-center opacity-80">
            <p className="text-base text-2xl break-keep leading-snug">
              {item.description[0]}
            </p>
            <p className="text-base text-2xl md:text-xl break-keep leading-snug">
              {item.description[1]}
            </p>
          </div>

          {/* 3. 타이틀 영역: 하단에 고정되거나 일정한 비율 유지 */}
          <div
            className={`flex flex-1 items-center justify-center self-stretch 
      text-4xl sm:text-5xl md:text-6xl font-[900] ${textcolor}`}
          >
            {item.title}
          </div>
        </div>
      </Card>
      {disabled && (
        <div className="absolute right-5 bottom-8 w-1/2 -rotate-[16deg]">
          {/* <div className="absolute inset-0 w-full h-full bg-primary mask-complete"></div> */}
          <img
            src="/thumbs-up_filled.png"
            alt="완료"
            className="w-full h-full drop-shadow-lg"
          />
        </div>
      )}
    </BlurFade>
  );
};

export default MenuCard;
