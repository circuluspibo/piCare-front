export const getWeatherStatus = (temp, hum, air) => {
  // 1. 공기 질 (최우선: 나쁨 이상일 때만)
  if (air === "VB" || air === "B") {
    return {
      label: "미세먼지",
      icon: "CloudFog",
      color: "gray",
      desc: "공기가 탁해요. 가급적 실내에 머무세요.",
    };
  }

  // 2. 극한 기온 (한파/영하/폭염)
  if (temp <= -10)
    return {
      label: "강력 한파",
      icon: "ThermometerSnowflake",
      color: "purple",
      desc: "매우 위험한 추위예요. 동파에 주의하세요!",
    };
  if (temp < 0)
    return {
      label: "영하 추위",
      icon: "Snowflake",
      color: "blue",
      desc: "기온이 영하예요. 빙판길 조심하세요!",
    };
  if (temp >= 33)
    return {
      label: "폭염 경보",
      icon: "Flame",
      color: "red",
      desc: "매우 뜨거운 날씨예요. 야외활동을 자제하세요.",
    };

  // 3. 고온/저온 특수 상황 (습도 결합)
  if (temp >= 28 && hum >= 70)
    return {
      label: "덥고 습함",
      icon: "Waves",
      color: "orange",
      desc: "후덥지근한 날씨예요. 제습이 필요해요.",
    };
  if (temp < 15 && hum <= 30)
    return {
      label: "춥고 건조",
      icon: "Wind",
      color: "cyan",
      desc: "찬바람이 불고 건조해요. 감기 조심하세요.",
    };

  // 4. [유연함] 쾌적 상태 (범위를 대폭 넓힘)
  // 온도: 17~27도 (봄, 가을 날씨 전체)
  // 습도: 30~70% (지나치게 축축하거나 마르지 않으면 OK)
  // 공기: 보통(Normal)까지 포함
  if (
    temp >= 17 &&
    temp <= 27 &&
    hum >= 30 &&
    hum <= 70 &&
    (air === "VG" || air === "G" || air === "N")
  ) {
    return {
      label: "쾌적함",
      icon: "Sparkles",
      color: "emerald",
      desc: "활동하기 딱 좋은 날씨예요. 기분 좋은 하루 되세요!",
    };
  }

  // 5. 기본 상태 (그 외 모든 경우) - '보통'을 좀 더 긍정적으로 표현
  return {
    label: "평온함",
    icon: "Sun",
    color: "yellow",
    desc: "크게 덥거나 춥지 않은 무난한 날씨입니다.",
  };
};
