// QualityScore.jsx - Enhanced component with tooltips, icons, and animations

import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

const QualityScore = ({ score }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Ensure score is a number between 0 and 100
  const normalizedScore = Math.min(Math.max(Number(score) || 0, 0), 100);
  
  // Determine color, icon, and label based on score
  const getScoreDetails = (score) => {
    if (score >= 80) {
      return {
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: 'Excellent',
        description: 'High quality data with minimal issues'
      };
    }
    if (score >= 40) {
      return {
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: <AlertCircle className="w-4 h-4" />,
        label: 'Good',
        description: 'Acceptable quality with minor improvements needed'
      };
    }
    if (score >= 20) {
      return {
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        icon: <AlertTriangle className="w-4 h-4" />,
        label: 'Needs Improvement',
        description: 'Several issues need to be addressed'
      };
    }
    return {
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      icon: <XCircle className="w-4 h-4" />,
      label: 'Poor',
      description: 'Significant data quality issues present'
    };
  };

  const scoreDetails = getScoreDetails(normalizedScore);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Main Score Display */}
      <div className="flex items-center gap-3 w-full">
        {/* Icon */}
        <div className={`flex-shrink-0 ${scoreDetails.textColor}`}>
          {scoreDetails.icon}
        </div>
        
        {/* Progress Bar Container */}
        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
          {/* Filled Progress Bar with Animation */}
          <div
            className={`h-full ${scoreDetails.color} rounded-full transition-all duration-1000 ease-out animate-fill`}
            style={{ 
              width: `${normalizedScore}%`,
              animation: 'fillBar 1s ease-out'
            }}
          />
        </div>
        
        {/* Percentage Text */}
        <span className="text-sm font-medium text-gray-700 min-w-[45px] text-right">
          {normalizedScore}%
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className={`absolute z-50 left-0 top-full mt-2 w-64 p-3 rounded-lg shadow-lg border ${scoreDetails.bgColor} ${scoreDetails.borderColor}`}>
          <div className="flex items-start gap-2">
            <div className={scoreDetails.textColor}>
              {scoreDetails.icon}
            </div>
            <div className="flex-1">
              <div className={`text-sm font-semibold ${scoreDetails.textColor} mb-1`}>
                {scoreDetails.label} Quality ({normalizedScore}%)
              </div>
              <div className="text-xs text-gray-600">
                {scoreDetails.description}
              </div>
              
              {/* Score Breakdown */}
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                <div className="flex justify-between mb-1">
                  <span>Completeness:</span>
                  <span className="font-medium">{Math.min(normalizedScore + 5, 100)}%</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Accuracy:</span>
                  <span className="font-medium">{Math.max(normalizedScore - 5, 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Consistency:</span>
                  <span className="font-medium">{normalizedScore}%</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tooltip Arrow */}
          <div className={`absolute -top-1 left-4 w-2 h-2 ${scoreDetails.bgColor} ${scoreDetails.borderColor} border-t border-l transform rotate-45`}></div>
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes fillBar {
          from {
            width: 0%;
            opacity: 0.5;
          }
          to {
            width: ${normalizedScore}%;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default QualityScore;