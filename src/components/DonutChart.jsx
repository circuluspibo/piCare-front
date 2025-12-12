// src/components/DonutChart.js

import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto"; // Chart.js v3+ 사용

const DonutChart = ({ value, max, color, chartId = "FLAG_donut" }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    const ctx = chartRef.current.getContext("2d");

    // 차트 초기화
    chartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [value, max - value], // 현재 값, 나머지 값
            backgroundColor: [color, "#e0e0e0"], // 지정 색상, 배경색
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "80%", // 도넛 두께
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    });

    // 클린업: 컴포넌트 언마운트 시 차트 인스턴스 파괴
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [max, color]); // max, color가 변경될 때만 차트 초기화

  // value가 변경될 때만 차트 데이터 업데이트
  useEffect(() => {
    if (
      chartInstance.current &&
      chartInstance.current.data.datasets.length > 0
    ) {
      chartInstance.current.data.datasets[0].data = [value, max - value];
      chartInstance.current.update();
    }
  }, [value, max]);

  return (
    <div style={{ position: "relative", width: "160px", height: "160px" }}>
      <canvas id={chartId} ref={chartRef}></canvas>
      {/* 중앙 텍스트 표시 */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "60px",
          fontWeight: "bold",
          color: color,
        }}
      >
        {value}
      </div>
    </div>
  );
};

export default DonutChart;
