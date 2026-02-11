import { useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";

export const useHaniOCR = () => {
  const [isPredicting, setIsPredicting] = useState(false);

  const runInference = useCallback(async (rawCanvas, target) => {
    setIsPredicting(true);
    try {
      const sw = rawCanvas.width,
        sh = rawCanvas.height;
      const flat = document.createElement("canvas");
      flat.width = sw;
      flat.height = sh;
      const fctx = flat.getContext("2d");
      fctx.fillStyle = "#fff";
      fctx.fillRect(0, 0, sw, sh);
      fctx.drawImage(rawCanvas, 0, 0);

      // 1. 선명한 이미지를 위한 이진화 및 바운딩 박스 추출
      const id = fctx.getImageData(0, 0, sw, sh);
      const data = id.data;
      let minX = sw,
        minY = sh,
        maxX = 0,
        maxY = 0,
        found = false;

      for (let i = 0; i < data.length; i += 4) {
        // GrayScale 변환 후 200 미만(어두운 부분)을 확실한 검은색(0)으로, 나머지는 흰색(255)으로 강제
        const brightness =
          0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
        if (brightness < 200) {
          const x = (i / 4) % sw,
            y = Math.floor(i / 4 / sw);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          found = true;
          data[i] = data[i + 1] = data[i + 2] = 0;
        } else {
          data[i] = data[i + 1] = data[i + 2] = 255;
        }
      }
      fctx.putImageData(id, 0, 0);

      // 2. 패딩 및 규격화
      const cw = found ? maxX - minX + 1 : sw,
        ch = found ? maxY - minY + 1 : sh;
      const side = Math.max(cw, ch) + 64;
      const box = document.createElement("canvas");
      box.width = box.height = side;
      const bctx = box.getContext("2d");
      bctx.fillStyle = "#fff";
      bctx.fillRect(0, 0, side, side);
      bctx.drawImage(
        flat,
        found ? minX : 0,
        found ? minY : 0,
        cw,
        ch,
        32,
        32,
        cw,
        ch,
      );

      // [DEBUG] 전처리된 이미지를 확인할 수 있는 링크 생성
      // console.log("url = ", box.toDataURL());

      // 3. 모델 로드 및 추론
      const base = target === "vowel" ? "/tm-vowel" : "/tm-cons";
      const [model, labels] = await Promise.all([
        tf
          .loadLayersModel(`indexeddb://model-${target}`)
          .catch(() => tf.loadLayersModel(`${base}/model.json`)),
        fetch(`${base}/metadata.json`)
          .then((r) => r.json())
          .then((m) => m.labels),
      ]);

      return tf.tidy(() => {
        const input = tf.image
          .resizeBilinear(tf.browser.fromPixels(box), [224, 224])
          .toFloat()
          .div(255)
          .expandDims(0);
        const prediction = model.predict(input);
        const probs = prediction.dataSync();

        // 라벨과 확률(p)을 함께 반환하여 명확한 판정 근거 마련
        return Array.from(probs)
          .map((p, i) => ({ label: labels[i], p }))
          .sort((a, b) => b.p - a.p)
          .slice(0, 3);
      });
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setIsPredicting(false);
    }
  }, []);

  return { runInference, isPredicting };
};
