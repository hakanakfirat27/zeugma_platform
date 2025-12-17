import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';

const ProductTour = ({ steps, onComplete }) => {
  const [highlightStyle, setHighlightStyle] = useState({});
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [isReady, setIsReady] = useState(false);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const { showTour, currentStep, endTour, goToStep, nextStep, prevStep } = useTour();

  const calculatePosition = useCallback(() => {
    if (!showTour || !steps[currentStep]) return false;

    const step = steps[currentStep];
    const element = document.querySelector(step.target);

    if (element) {
      const rect = element.getBoundingClientRect();
      
      // Make sure element has actual dimensions
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }
      
      const padding = 8;

      setHighlightStyle({
        top: rect.top - padding + window.scrollY,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Calculate tooltip position
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = 320;
      const tooltipHeight = 220;

      let position = step.position || 'bottom';
      let top, left;

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - 20 + window.scrollY;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + 20 + window.scrollY;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
          left = rect.left - tooltipWidth - 20;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
          left = rect.right + 20;
          break;
        default:
          top = rect.bottom + 20 + window.scrollY;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
      }

      // Keep tooltip within viewport
      if (left < 20) left = 20;
      if (left + tooltipWidth > viewportWidth - 20) left = viewportWidth - tooltipWidth - 20;
      if (top < 20 + window.scrollY) top = rect.bottom + 20 + window.scrollY;
      if (top + tooltipHeight > viewportHeight + window.scrollY - 20) {
        top = rect.top - tooltipHeight - 20 + window.scrollY;
      }

      setTooltipStyle({ top, left });

      // Scroll element into view smoothly
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      return true;
    }
    
    return false;
  }, [showTour, currentStep, steps]);

  const tryPosition = useCallback(() => {
    const success = calculatePosition();
    
    if (success) {
      setIsReady(true);
      retryCountRef.current = 0;
    } else if (retryCountRef.current < 10) {
      // Retry with exponential backoff
      retryCountRef.current += 1;
      const delay = Math.min(100 * retryCountRef.current, 500);
      timeoutRef.current = setTimeout(tryPosition, delay);
    } else {
      // Give up and show centered
      setHighlightStyle({});
      setTooltipStyle({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      });
      setIsReady(true);
      retryCountRef.current = 0;
    }
  }, [calculatePosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle body overflow
  useEffect(() => {
    if (showTour) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showTour]);

  // Main effect: Handle navigation and positioning
  useEffect(() => {
    if (!showTour || !steps[currentStep]) return;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const step = steps[currentStep];
    
    // Reset state
    setIsReady(false);
    retryCountRef.current = 0;

    // Check if we need to navigate
    if (step.path && location.pathname !== step.path) {
      navigate(step.path);
      // Will trigger position on location change
    } else {
      // Already on correct page - start positioning after delay
      timeoutRef.current = setTimeout(() => {
        tryPosition();
      }, 300);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentStep, showTour, steps, location.pathname, navigate, tryPosition]);

  // Effect: Handle location change (after navigation)
  useEffect(() => {
    if (!showTour || !steps[currentStep]) return;

    const step = steps[currentStep];
    
    // If we're now on the correct page, start positioning
    if (step.path && location.pathname === step.path) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Wait for page to render, then try positioning
      timeoutRef.current = setTimeout(() => {
        tryPosition();
      }, 500);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname]);

  // Handle window resize
  useEffect(() => {
    if (!showTour || !isReady) return;
    
    const handleResize = () => {
      calculatePosition();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showTour, isReady, calculatePosition]);

  const handleNext = () => {
    setIsReady(false);
    if (currentStep < steps.length - 1) {
      nextStep(steps.length);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    setIsReady(false);
    prevStep();
  };

  const handleComplete = () => {
    localStorage.setItem('clientTourCompleted', 'true');
    onComplete?.();
    endTour();
  };

  const handleSkip = () => {
    endTour();
  };

  const handleGoToStep = (index) => {
    setIsReady(false);
    goToStep(index);
  };

  if (!showTour || !steps.length) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Dark overlay */}
      <div 
        className="absolute inset-0 bg-black/60 transition-opacity duration-300"
        style={{ opacity: isReady ? 1 : 0.4 }}
        onClick={handleSkip} 
      />

      {/* Highlighted element overlay */}
      {isReady && highlightStyle.width && (
        <div
          className="absolute bg-transparent border-2 border-blue-400 rounded-lg z-[9999] pointer-events-none"
          style={{
            ...highlightStyle,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.5)',
            transition: 'all 0.3s ease-out'
          }}
        />
      )}

      {/* Tooltip */}
      {isReady ? (
        <div
          className="absolute z-[10000] w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{
            ...tooltipStyle,
            opacity: 1,
            transition: 'opacity 0.2s ease-out'
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step.icon && <span className="text-xl">{step.icon}</span>}
              <span className="text-white font-semibold text-sm">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <button
              onClick={handleSkip}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{step.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{step.content}</p>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1 transition-colors"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="px-4 pb-3 flex justify-center gap-1.5">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => handleGoToStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-blue-600 w-4'
                    : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-300'
                } cursor-pointer hover:scale-125`}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Loading state - centered spinner */
        <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600 font-medium text-sm">Loading step...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTour;
