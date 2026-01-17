import { useEffect, useRef } from "react";
import "./EasterEgg.css"; // Use plain CSS for global body class

const LONG_PRESS_TIME = 2000;

export default function EasterEgg() {
  const longPressTimer = useRef(null);
  const glitchActive = useRef(false);

  const triggerGlitch = () => {
    if (!glitchActive.current) {
      document.body.classList.add("glitch-mode");
      glitchActive.current = true;
      console.log("Glitch mode activated!");
    }
  };

  const resetGlitch = () => {
    if (glitchActive.current) {
      document.body.classList.remove("glitch-mode");
      glitchActive.current = false;
      console.log("Glitch mode deactivated!");
    }
  };

  useEffect(() => {
    const handleMouseDown = (e) => {
      longPressTimer.current = setTimeout(triggerGlitch, LONG_PRESS_TIME);
    };
    const handleMouseUp = () => clearTimeout(longPressTimer.current);
    const handleTouchStart = (e) => {
      longPressTimer.current = setTimeout(triggerGlitch, LONG_PRESS_TIME);
    };
    const handleTouchEnd = () => clearTimeout(longPressTimer.current);
    const handleDoubleClick = () => resetGlitch();

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("dblclick", handleDoubleClick);

    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("dblclick", handleDoubleClick);
    };
  }, []);

  return null; // no UI, purely global effect
}
