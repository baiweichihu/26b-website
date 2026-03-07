import { useCallback, useEffect, useState } from 'react';
import { logger } from '../../../../utils/logger';

export const useFullscreenState = ({ onExitFullscreen } = {}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);

      if (!inFullscreen) {
        onExitFullscreen?.();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onExitFullscreen]);

  const enterFullscreen = useCallback(async (element) => {
    if (!element) {
      return;
    }

    try {
      await element.requestFullscreen();
    } catch (error) {
      logger.error('无法进入全屏模式:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      return;
    }

    try {
      await document.exitFullscreen();
    } catch (error) {
      logger.error('无法退出全屏模式:', error);
    }
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
};

