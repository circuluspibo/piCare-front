import { useRef, useCallback } from "react";
import { postInteraction } from "@/api/picareService";

export const useHeartbeatLog = () => {
  const prevHeartbeatRef = useRef(null);

  const compareAndLog = useCallback(async (newData) => {
    if (!prevHeartbeatRef.current) {
      prevHeartbeatRef.current = newData;
      return;
    }

    const prev = prevHeartbeatRef.current;
    const curr = newData;

    const isLiveCountChanged = prev.cnt_live !== curr.cnt_live;
    const isObjectCountChanged = prev.cnt_object !== curr.cnt_object;
    const isEmotionChanged = prev.human?.emotion !== curr.human?.emotion;

    if (isLiveCountChanged || isObjectCountChanged || isEmotionChanged) {
      const essentialData = {
        cnt_live: curr.cnt_live,
        cnt_object: curr.cnt_object,
        human: curr.human,
        env: curr.env,
      };

      try {
        await postInteraction({
          type: "heartbeat",
          content: essentialData,
        });
      } catch (err) {
        console.log("[FAILED] REQ useHeartbeatLog MSG: ", err);
      }
    }
    prevHeartbeatRef.current = curr;
  }, []);

  return { compareAndLog };
};
