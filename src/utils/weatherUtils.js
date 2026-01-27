export const getWeatherStatus = (tempRaw, humRaw, air) => {
  const temp = parseFloat(tempRaw).toFixed(1);
  const hum = parseFloat(humRaw).toFixed(1);

  // 0. 데이터 유효성 검사
  if (isNaN(temp) || isNaN(hum)) {
    return {
      label: "데이터 오류",
      icon: "AlertCircle",
      color: "slate",
      desc: "날씨 정보를 읽어올 수 없습니다.",
    };
  }

  // 1. 공기 질 우선순위 (매우 나쁨/나쁨)
  if (air === "VB") {
    return {
      label: "최악의 공기",
      icon: "Skull",
      color: "zinc",
      desc: "공기가 매우 해롭습니다! 반드시 마스크를 착용하세요.",
    };
  }
  if (air === "B") {
    return {
      label: "공기 나쁨",
      icon: "CloudFog",
      color: "gray",
      desc: "미세먼지가 많아 공기가 탁합니다. 환기를 자제하세요.",
    };
  }

  // 2. 기온 극한 상황 (폭염/한파)
  if (temp >= 35) {
    return {
      label: "극한 폭염",
      icon: "SunExtreme", // Lucide 아이콘 명칭 확인 필요 (Sun 도 가능)
      color: "red",
      desc: "살인적인 더위입니다. 야외 활동을 즉시 중단하세요.",
    };
  }
  if (temp >= 30) {
    return {
      label: "무더위",
      icon: "Flame",
      color: "rose",
      desc: "땀이 많이 나는 무더운 날씨입니다. 물을 자주 마셔요.",
    };
  }
  if (temp <= -10) {
    return {
      label: "극심한 한파",
      icon: "ThermometerSnowflake",
      color: "purple",
      desc: "전국이 꽁꽁 얼어붙은 한파입니다. 보온에 유의하세요.",
    };
  }
  if (temp <= 0) {
    return {
      label: "영하권 추위",
      icon: "Snowflake",
      color: "blue",
      desc: "기온이 영하로 떨어졌습니다. 따뜻하게 입고 나가세요.",
    };
  }

  // 3. 습도 및 불쾌지수 조합
  if (temp >= 24 && hum >= 80) {
    return {
      label: "찜통 더위",
      icon: "Droplets",
      color: "orange",
      desc: "습도가 높아 매우 후덥지근합니다. 불쾌지수 주의!",
    };
  }
  if (temp < 15 && hum <= 25) {
    return {
      label: "쌀쌀하고 건조",
      icon: "Wind",
      color: "cyan",
      desc: "바람이 차고 건조합니다. 산불과 피부 건조에 주의하세요.",
    };
  }

  // 4. 봄/가을 및 환절기 세분화
  if (temp >= 18 && temp <= 25) {
    if (hum >= 40 && hum <= 60 && (air === "VG" || air === "G")) {
      return {
        label: "최고의 날씨",
        icon: "Sparkles",
        color: "emerald",
        desc: "더할 나위 없이 완벽한 날씨입니다. 산책은 어떠신가요?",
      };
    }
    return {
      label: "포근함",
      icon: "Sun",
      color: "teal",
      desc: "활동하기 적당하고 포근한 날씨가 이어집니다.",
    };
  }

  if (temp >= 5 && temp < 18) {
    return {
      label: "선선한 날씨",
      icon: "Leaf",
      color: "lime",
      desc: "약간 쌀쌀할 수 있으니 가벼운 겉옷을 챙기세요.",
    };
  }

  // 5. 기본 상태 (상기 조건에 해당하지 않는 평범한 날씨)
  return {
    label: "평온함",
    icon: "CloudSun",
    color: "amber",
    desc: "크게 덥거나 춥지 않은 평온한 하루입니다.",
  };
};
