import React from 'react';

interface DealTimelineProps {
  currentStep: number;
}

const DealTimeline: React.FC<DealTimelineProps> = ({ currentStep }) => {
  return (
    <div className="deal-timeline">
      {currentStep >= 1 && (
        <div className={`step ${currentStep > 1 ? 'completed' : ''}`}>
          Initiated
        </div>
      )}
      {currentStep >= 2 && (
        <div className={`step ${currentStep > 2 ? 'completed' : ''}`}>
          Deposit Agreement Documents
        </div>
      )}
      {currentStep >= 3 && (
        <div className={`step ${currentStep > 3 ? 'completed' : ''}`}>
          DLD Completed
        </div>
      )}
    </div>
  );
};

export default DealTimeline;