import confetti from "canvas-confetti";

export const fireSuccessConfetti = () => {
  confetti({
    gravity: 2.5,
    particleCount: 60,
    spread: 60,
    origin: { y: 0.7 },
  });
};

export const fireInfoConfetti = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    startVelocity: 20,
    spread: 360,
    ticks: 200,
    zIndex: 1500,
    scar: 1.2,
  }; // Dialog보다 높게 zIndex 설정

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);

    confetti({
      ...defaults,
      particleCount: 10,
      gravity: 0.7,
      origin: { x: 0.2, y: 0.4 },
    });
    confetti({
      ...defaults,
      particleCount: 10,
      gravity: 0.7,
      origin: { x: 0.8, y: 0.4 },
    });
  }, 250);
};
