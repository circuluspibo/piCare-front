import { useRef, useCallback, useEffect } from "react";
import { postInteraction } from "@/api/picareService";

const AMBIENT_INTERVAL_MS = 5 * 60 * 1000;
const EMOTION_COOLDOWN_MS = 30 * 1000;

export const useHeartbeatLog = () => {
  const latestDataRef = useRef(null);
  const prevEmotionRef = useRef(null);
  const lastEmotionLogRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const curr = latestDataRef.current;
      if (!curr) return;
      postInteraction({
        type: "ambient",
        content: {
          cntLive: curr.cnt_live,
          cntObject: curr.cnt_object,
          env: curr.env,
        },
      }).catch(() => {});
    }, AMBIENT_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const compareAndLog = useCallback((newData) => {
    latestDataRef.current = newData;

    const currEmotion = newData.human?.emotion;
    if (!currEmotion || currEmotion === prevEmotionRef.current) return;

    const now = Date.now();
    if (now - lastEmotionLogRef.current < EMOTION_COOLDOWN_MS) return;

    const human = newData.human;
    postInteraction({
      type: "emotion",
      content: {
        emotion: currEmotion,
        cntLive: newData.cnt_live,
        position: human?.position,
        gender: human?.gender,
        age: human?.age,
      },
    }).catch(() => {});

    prevEmotionRef.current = currEmotion;
    lastEmotionLogRef.current = now;
  }, []);

  return { compareAndLog };
};
