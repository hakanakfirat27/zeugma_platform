// frontend/src/contexts/TourContext.jsx
// Context for managing product tour state across navigation

import { createContext, useContext, useState, useEffect } from 'react';

const TourContext = createContext();

export const TourProvider = ({ children }) => {
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Persist tour state to sessionStorage
  useEffect(() => {
    const savedTourState = sessionStorage.getItem('tourActive');
    const savedStep = sessionStorage.getItem('tourStep');
    
    if (savedTourState === 'true') {
      setShowTour(true);
      setCurrentStep(parseInt(savedStep) || 0);
    }
  }, []);

  // Save state changes to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('tourActive', showTour.toString());
    sessionStorage.setItem('tourStep', currentStep.toString());
  }, [showTour, currentStep]);

  const startTour = () => {
    setCurrentStep(0);
    setShowTour(true);
  };

  const endTour = () => {
    setShowTour(false);
    setCurrentStep(0);
    sessionStorage.removeItem('tourActive');
    sessionStorage.removeItem('tourStep');
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  const nextStep = (totalSteps) => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <TourContext.Provider value={{
      showTour,
      currentStep,
      startTour,
      endTour,
      goToStep,
      nextStep,
      prevStep,
      setCurrentStep
    }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

export default TourContext;
