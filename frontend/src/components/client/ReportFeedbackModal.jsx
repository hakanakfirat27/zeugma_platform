// frontend/src/components/client/ReportFeedbackModal.jsx
// Feedback button with vertical text, expands with animations on hover

import { useState } from 'react';
import { X, MessageSquare, Star, Sparkles } from 'lucide-react';
import ReportFeedbackSection from './ReportFeedbackSection';

const ReportFeedbackModal = ({ reportId, reportTitle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* CSS Animations */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes glow-blue {
          0%, 100% { box-shadow: 0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.7), 0 0 35px rgba(59, 130, 246, 0.4); }
        }
        
        @keyframes star-twinkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.7; transform: scale(1.2) rotate(10deg); }
        }
        
        @keyframes bounce-icon {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        .shimmer-animation {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.5) 50%,
            rgba(255,255,255,0) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        .glow-blue-animation {
          animation: glow-blue 1.5s ease-in-out infinite;
        }
        
        .star-twinkle-animation {
          animation: star-twinkle 1s ease-in-out infinite;
        }
        
        .bounce-icon-animation {
          animation: bounce-icon 0.6s ease-in-out infinite;
        }

        @keyframes modal-enter {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .modal-enter {
          animation: modal-enter 0.3s ease-out forwards;
        }
      `}</style>

      {/* Floating Feedback Button - Matches screenshot design */}
      <button
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 group"
      >
        <div className={`
          relative overflow-hidden rounded-l-lg transition-all duration-300 ease-out
          ${isHovered 
            ? 'bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-600 glow-blue-animation' 
            : 'bg-blue-500'
          }
          px-2 py-3
        `}>
          {/* Shimmer overlay - only on hover */}
          {isHovered && (
            <div className="absolute inset-0 shimmer-animation pointer-events-none" />
          )}
          
          {/* Content - Icon on top, vertical text below */}
          <div className="relative flex flex-col items-center gap-1.5">
            {/* Icon at top */}
            <MessageSquare className={`text-white transition-all duration-300 w-4 h-4 ${
              isHovered ? 'bounce-icon-animation' : ''
            }`} />
            
            {/* Vertical Text */}
            <span 
              className={`font-semibold text-white tracking-wide transition-all duration-300 ${
                isHovered ? 'text-[11px]' : 'text-[11px]'
              }`}
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Feedback
            </span>
            
            {/* Star - only visible on hover */}
            <Star className={`text-yellow-300 fill-yellow-300 transition-all duration-300 ${
              isHovered ? 'w-3.5 h-3.5 opacity-100 star-twinkle-animation' : 'w-0 h-0 opacity-0'
            }`} />
          </div>

          {/* Left border indicator on hover */}
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white/60 rounded-r transition-all duration-300 ${
            isHovered ? 'h-12 opacity-100' : 'h-0 opacity-0'
          }`} />
          
          {/* Border glow */}
          <div className={`absolute inset-0 rounded-l-lg border border-white/30 pointer-events-none transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`} />
        </div>

        {/* Tooltip on hover */}
        <div className={`absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
        }`}>
          <div className="relative px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-xl">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Rate this report
            </span>
            {/* Arrow */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden modal-enter">
            {/* Header with gradient */}
            <div className="relative overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
              
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -bottom-5 -left-5 w-20 h-20 bg-white/10 rounded-full" />
              
              {/* Content */}
              <div className="relative flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Report Feedback</h2>
                    <p className="text-sm text-white/80 mt-0.5">{reportTitle || 'Share your experience'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <ReportFeedbackSection 
                reportId={reportId} 
                reportTitle={reportTitle}
                onSuccess={() => {
                  // Optionally close modal after successful submission
                  // setTimeout(() => setIsOpen(false), 2000);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportFeedbackModal;
