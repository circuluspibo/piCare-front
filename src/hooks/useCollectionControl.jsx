import { useState, useCallback, useRef } from "react";
import { getStartCollection, getStopCollection } from "@/api/npuService";

export const useCollectionControl = () => {
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const activeRequests = useRef(new Set());
  const isTransitioning = useRef(false);
  const engineStateRef = useRef(false); // 물리적 가동 상태 즉시 추적

  const requestStart = useCallback(async (requestId) => {
    if (activeRequests.current.has(requestId)) return true;
    activeRequests.current.add(requestId);
    
    if (engineStateRef.current || isTransitioning.current) return true;

    isTransitioning.current = true;
    try {
      await getStartCollection();
      engineStateRef.current = true;
      setIsEngineRunning(true);
      console.log(`[Engine] 🚀 Started by: ${requestId}`);
      return true;
    } catch (error) {
      console.error(`[Engine] Start Error (${requestId}):`, error);
      activeRequests.current.delete(requestId);
      return false;
    } finally {
      isTransitioning.current = false;
    }
  }, []);

  const requestStop = useCallback(async (requestId) => {
    activeRequests.current.delete(requestId);
    console.log(`[Engine] Released by: ${requestId}. Active: ${activeRequests.current.size}`);
    
    if (activeRequests.current.size === 0 && engineStateRef.current && !isTransitioning.current) {
      isTransitioning.current = true;
      try {
        await getStopCollection();
        engineStateRef.current = false;
        setIsEngineRunning(false);
        console.log(`[Engine] 🛑 Stopped by: ${requestId}`);
      } catch (error) {
        console.error(`[Engine] Stop Error:`, error);
      } finally {
        isTransitioning.current = false;
      }
    }
  }, []);

  return { isEngineRunning, requestStart, requestStop };
};