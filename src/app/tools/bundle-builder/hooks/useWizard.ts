import { useState, useCallback } from "react";
import { WIZARD_STEPS } from "../constants/wizardSteps";

export interface UseWizardReturn {
  step: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  totalSteps: number;
}

export function useWizard(initialStep: number = 1): UseWizardReturn {
  const [step, setStep] = useState(initialStep);

  const nextStep = useCallback(() => {
    setStep((current) => {
      const maxStep = WIZARD_STEPS.length;
      return current < maxStep ? current + 1 : current;
    });
  }, []);

  const previousStep = useCallback(() => {
    setStep((current) => (current > 1 ? current - 1 : current));
  }, []);

  const goToStep = useCallback((newStep: number) => {
    const maxStep = WIZARD_STEPS.length;
    if (newStep >= 1 && newStep <= maxStep) {
      setStep(newStep);
    }
  }, []);

  const isFirstStep = step === 1;
  const isLastStep = step === WIZARD_STEPS.length;
  const totalSteps = WIZARD_STEPS.length;

  return {
    step,
    setStep,
    nextStep,
    previousStep,
    goToStep,
    isFirstStep,
    isLastStep,
    totalSteps
  };
}
