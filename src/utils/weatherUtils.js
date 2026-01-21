export const getWeatherStatus = (tempRaw, humRaw, air) => {
  const temp = parseFloat(tempRaw);
  const hum = parseFloat(humRaw);

  if (isNaN(temp) || isNaN(hum)) {
    return {
      label: "데이터 오류",
      icon: "AlertCircle",
      color: "slate", // 무채색 slate로 변경
      desc: "날씨 정보를 읽어올 수 없습니다.",
    };
  }

  // 1. 공기 질 (나쁨/매우 나쁨)
  if (air === "VB" || air === "B") {
    return {
      label: "미세먼지",
      icon: "CloudFog",
      color: "slate", // 탁한 느낌의 slate로 변경
      desc: "공기가 탁해요. 가급적 실내에 머무세요.",
    };
  }

  // 2. 극한 기온 상황
  if (temp >= 33) {
    return {
      label: "폭염 경보",
      icon: "Flame",
      color: "rose", // 강렬한 빨간색 계열 rose로 변경
      desc: "매우 뜨거운 날씨예요. 수분을 충분히 섭취하세요.",
    };
  }
  if (temp <= -10) {
    return {
      label: "강력 한파",
      icon: "ThermometerSnowflake",
      color: "violet", // 깊고 차가운 violet으로 변경
      desc: "매우 위험한 추위예요. 외출을 자제하세요.",
    };
  }
  if (temp < 0) {
    return {
      label: "영하 추위",
      icon: "Snowflake",
      color: "indigo", // 차가운 indigo로 변경
      desc: "기온이 영하예요. 빙판길 조심하세요!",
    };
  }

  // 3. 습도 관련 특수 상황
  if (temp >= 25 && hum >= 75) {
    return {
      label: "덥고 습함",
      icon: "Waves",
      color: "orange", // 불쾌지수가 느껴지는 orange로 유지
      desc: "후덥지근한 날씨예요. 불쾌지수가 높을 수 있어요.",
    };
  }
  if (hum <= 20) {
    return {
      label: "매우 건조",
      icon: "Wind",
      color: "cyan", // 건조하고 쨍한 느낌의 cyan으로 변경
      desc: "공기가 매우 건조해요. 수분 크림을 발라주세요.",
    };
  }

  // 4. 쾌적 상태
  if (temp >= 17 && temp <= 28 && (air === "VG" || air === "G" || air === "N")) {
    return {
      label: "쾌적함",
      icon: "Sparkles",
      color: "teal", // 싱그러운 teal로 변경
      desc: "활동하기 딱 좋은 날씨예요. 즐거운 하루 되세요!",
    };
  }

  // 5. 기본 상태
  return {
    label: "평온함",
    icon: "Sun",
    color: "amber", // 따뜻하고 무난한 amber로 변경
    desc: "크게 덥거나 춥지 않은 무난한 날씨입니다.",
  };
};