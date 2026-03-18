import { useRef, useEffect } from "react";

const getScoreColor = (score) => {
  if (score < 30) return "#00ff41";
  if (score < 60) return "#ffaa00";
  if (score < 80) return "#ff6600";
  return "#ff2222";
};

const GaugeCanvas = ({ score = 0, width = 200, height = 110 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height - 14;
    const r  = Math.min(width, height * 2) / 2 - 12;

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0);
    ctx.strokeStyle = "#003810";
    ctx.lineWidth = 12;
    ctx.stroke();

    // Fill
    const fillAngle = Math.PI * (score / 100);
    const color = getScoreColor(score);
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + fillAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Tick marks at 30, 60, 80
    [30, 60, 80].forEach((pct) => {
      const angle = Math.PI + Math.PI * (pct / 100);
      const x1 = cx + (r - 16) * Math.cos(angle);
      const y1 = cy + (r - 16) * Math.sin(angle);
      const x2 = cx + (r + 2)  * Math.cos(angle);
      const y2 = cy + (r + 2)  * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#00bb30";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Score text
    ctx.font = `bold ${Math.round(r * 0.55)}px 'Courier New', monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillText(score, cx, cy + 2);
    ctx.shadowBlur = 0;

    // Label
    ctx.font = `${Math.round(r * 0.2)}px 'Courier New', monospace`;
    ctx.fillStyle = "#00bb30";
    ctx.shadowBlur = 0;
    ctx.fillText("/100", cx, cy + 16);
  }, [score, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
    />
  );
};

export default GaugeCanvas;
