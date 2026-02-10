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

        const probs = tf.tidy(() => {
          let tensor = tf.browser.fromPixels(canvas);
          tensor = tf.image.resizeBilinear(tensor, [224, 224]);
          const normalized = tensor.toFloat().div(tf.scalar(255)).expandDims(0);
          return model.predict(normalized).dataSync();
        });

        // ✅ 확률이 높은 순서대로 인덱스 정렬
        const rankedIndices = Array.from(probs)
          .map((p, i) => ({ index: i, probability: p }))
          .sort((a, b) => b.probability - a.probability);

        // ✅ 상위 3개의 라벨만 추출해서 배열로 반환
        const topKLabels = rankedIndices
          .slice(0, 3)
          .map((item) => labels[item.index]);
        return topKLabels; // ["ㅏ", "ㅑ", "ㅓ"] 형태
      } catch (error) {
        console.error(error);
        return [];
      } finally {
        setIsPredicting(false);
      }
    },
    [loadModel],
  );

  return { runInference, isPredicting };
};
