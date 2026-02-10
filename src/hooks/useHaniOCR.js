import { useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";

export const useHaniOCR = () => {
  const [isPredicting, setIsPredicting] = useState(false);

  // 모델 로드 및 캐싱
  const loadModel = useCallback(async (target) => {
    const storageKey = `indexeddb://model-${target}`;
    try {
      return await tf.loadLayersModel(storageKey);
    } catch (e) {
      const base = target === "vowel" ? "/tm-vowel" : "/tm-cons";
      const model = await tf.loadLayersModel(`${base}/model.json`);
      await model.save(storageKey);
      return model;
    }
  }, []);

  // 실제 인식 실행 함수
  // useHaniOCR.js 내 runInference 수정
  const runInference = useCallback(
    async (canvas, target) => {
      setIsPredicting(true);
      try {
        const [model, labels] = await Promise.all([
          loadModel(target),
          fetch(`/${target === "vowel" ? "tm-vowel" : "tm-cons"}/metadata.json`)
            .then((r) => r.json())
            .then((meta) => meta.labels),
        ]);

        const predictedLabel = tf.tidy(() => {
          const tensor = tf.browser.fromPixels(canvas);
          const normalized = tf.image
            .resizeBilinear(tensor, [224, 224])
            .toFloat()
            .div(tf.scalar(255))
            .expandDims(0);

          const prediction = model.predict(normalized);
          const data = prediction.dataSync();
          // 가장 큰 값의 인덱스 찾기
          const maxIndex = data.indexOf(Math.max(...data));
          return labels[maxIndex];
        });

        return String(predictedLabel).trim(); // ✅ 확실하게 공백 제거된 문자열 반환
      } catch (error) {
        console.error(error);
        return "";
      } finally {
        setIsPredicting(false);
      }
    },
    [loadModel],
  );

  return { runInference, isPredicting };
};
