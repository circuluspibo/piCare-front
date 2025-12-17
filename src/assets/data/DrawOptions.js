const SAMPLE_SIZE = 0.8;
const DRAW_OPTIONS = [
  {
    name: "Circle",
    draw: (ctx, canvas) => {
      const size = Math.min(canvas.width, canvas.height) * SAMPLE_SIZE;
      const center = { x: canvas.width / 2, y: canvas.height / 2 };
      ctx.beginPath();
      ctx.arc(center.x, center.y, size / 2, 0, 2 * Math.PI);
      ctx.stroke();
    },
  },
  {
    name: "Square",
    draw: (ctx, canvas) => {
      const size = Math.min(canvas.width, canvas.height) * SAMPLE_SIZE;
      const startX = (canvas.width - size) / 2;
      const startY = (canvas.height - size) / 2;
      ctx.strokeRect(startX, startY, size, size);
    },
  },
  {
    name: "Triangle",
    draw: (ctx, canvas) => {
      const size = Math.min(canvas.width, canvas.height) * SAMPLE_SIZE;
      const centerX = canvas.width / 2;
      const startY = (canvas.height - size) / 2 + size;
      ctx.beginPath();
      ctx.moveTo(centerX, startY - size); // Top
      ctx.lineTo(centerX + size / 2, startY); // Right bottom
      ctx.lineTo(centerX - size / 2, startY); // Left bottom
      ctx.closePath();
      ctx.stroke();
    },
  },
];

export default DRAW_OPTIONS;
