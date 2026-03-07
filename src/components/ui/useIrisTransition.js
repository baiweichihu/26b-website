import { useContext } from 'react';
import { IrisTransitionContext } from './IrisTransitionContext';

export const useIrisTransition = () => {
  const context = useContext(IrisTransitionContext);
  return context || { triggerIris: null };
};
