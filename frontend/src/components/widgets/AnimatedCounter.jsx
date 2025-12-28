// frontend/src/components/widgets/AnimatedCounter.jsx
import { useState, useEffect, useRef } from 'react';

const AnimatedCounter = ({ 
  value, 
  duration = 1500, 
  decimals = 0,
  prefix = '',
  suffix = '',
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const elementRef = useRef(null);
  const animationFrameRef = useRef(null);
  const previousValueRef = useRef(0);

  // Easing function for smooth animation
  const easeOutExpo = (t) => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };

  const startAnimation = (fromValue, toValue) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      
      const currentValue = fromValue + (toValue - fromValue) * easedProgress;
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(toValue);
        previousValueRef.current = toValue;
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const targetValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    const prevValue = previousValueRef.current;

    // Only animate if value actually changed
    if (targetValue !== prevValue) {
      startAnimation(prevValue, targetValue);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  const formatNumber = (num) => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    return Math.round(num).toLocaleString();
  };

  return (
    <span ref={elementRef} className={className}>
      {prefix}{formatNumber(displayValue)}{suffix}
    </span>
  );
};

export default AnimatedCounter;
