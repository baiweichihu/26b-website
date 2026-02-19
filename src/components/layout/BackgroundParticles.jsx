import React, { useEffect, useRef } from 'react';

const BackgroundParticles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let frameId = 0;
    let particles = [];

    const getPalette = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme === 'dark') {
        return ['rgba(124, 197, 255, 0.55)', 'rgba(255, 200, 140, 0.45)'];
      }
      return ['rgba(88, 150, 255, 0.35)', 'rgba(255, 186, 120, 0.35)'];
    };

    let colors = getPalette();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(90, Math.max(40, Math.floor((width * height) / 22000)));
      particles = Array.from({ length: count }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 0.6,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.5 + 0.2,
        colorIndex: Math.random() > 0.5 ? 0 : 1,
      }));
    };

    const renderFrame = (animate) => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        if (animate) {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x <= 0 || particle.x >= width) {
            particle.vx *= -1;
          }
          if (particle.y <= 0 || particle.y >= height) {
            particle.vy *= -1;
          }
        }

        ctx.beginPath();
        ctx.fillStyle = colors[particle.colorIndex];
        ctx.globalAlpha = particle.alpha;
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
    };

    const step = () => {
      renderFrame(true);
      frameId = window.requestAnimationFrame(step);
    };

    resize();
    renderFrame(false);
    if (!prefersReducedMotion) {
      frameId = window.requestAnimationFrame(step);
    }

    const handleResize = () => {
      resize();
      renderFrame(false);
    };
    window.addEventListener('resize', handleResize);

    const themeObserver = new MutationObserver(() => {
      colors = getPalette();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      themeObserver.disconnect();
    };
  }, []);

  return <canvas className="particle-canvas" ref={canvasRef} aria-hidden="true" />;
};

export default BackgroundParticles;
