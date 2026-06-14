'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourStep {
  target: string;
  title: string;
  description: string;
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="new-task"]',
    title: 'Create Your First Task',
    description: 'Click the "New Task" button or press Cmd/Ctrl+N to quickly add a new task to your inbox.',
  },
  {
    target: '[data-tour="search"]',
    title: 'Search Tasks',
    description: 'Use the search bar or press Cmd/Ctrl+K to find tasks by name, description, or labels.',
  },
  {
    target: '[data-tour="filters"]',
    title: 'Filter and Sort',
    description: 'Use the filter buttons to narrow down tasks by list, label, or priority.',
  },
  {
    target: '[data-tour="views"]',
    title: 'Switch Views',
    description: 'Navigate between different views: Today, Upcoming, Calendar, and Kanban board.',
  },
  {
    target: '[data-tour="keyboard-shortcuts"]',
    title: 'Keyboard Shortcuts',
    description: 'Press Cmd/Ctrl+K to focus search, Cmd/Ctrl+N for new task, and use arrow keys to navigate.',
  },
];

export default function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenOnboarding') === 'true';
    if (!hasSeenTour) {
      setIsVisible(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setIsVisible(false);
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setIsVisible(false);
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 border border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">Tour Step {currentStep + 1} of {tourSteps.length}</h3>
          <button
            onClick={handleSkip}
            className="p-1 rounded hover:bg-gray-700/50"
            title="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h4 className="text-xl font-bold mb-2">{step.title}</h4>
        <p className="text-gray-300 mb-6">{step.description}</p>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
          >
            {currentStep === tourSteps.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Trigger button for re-opening tour
export function TourTrigger() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenTour) {
      setShowTour(true);
    }
  }, []);

  if (!showTour) return null;

  const handleShowTour = () => {
    // Dispatch event to parent component
    window.dispatchEvent(new CustomEvent('show-onboarding-tour'));
  };

  return (
    <button
      onClick={handleShowTour}
      className="fixed bottom-4 right-4 p-3 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
      title="Show tour"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}