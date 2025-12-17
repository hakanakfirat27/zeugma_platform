// frontend/src/components/help/FloatingHelpButton.jsx
// Animated circular Help button with radial expanding menu

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HelpCircle, 
  X, 
  BookOpen, 
  Compass,
  FileText,
  Video,
  Sparkles
} from 'lucide-react';

const FloatingHelpButton = ({ onStartTour }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        const activeElement = document.activeElement;
        const isTyping = activeElement.tagName === 'INPUT' || 
                        activeElement.tagName === 'TEXTAREA' || 
                        activeElement.isContentEditable;
        if (!isTyping) {
          setIsOpen(prev => !prev);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const menuItems = [
    {
      icon: <Compass className="w-5 h-5" />,
      label: 'Take a Tour',
      onClick: () => {
        setIsOpen(false);
        onStartTour?.();
      },
      color: 'from-blue-500 to-cyan-500',
      delay: '0ms',
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: 'Help Center',
      onClick: () => {
        setIsOpen(false);
        navigate('/client/help-center');
      },
      color: 'from-purple-500 to-pink-500',
      delay: '50ms',
    },
    {
      icon: <Video className="w-5 h-5" />,
      label: 'Tutorials',
      onClick: () => {
        setIsOpen(false);
        navigate('/client/help-center?tab=videos');
      },
      color: 'from-orange-500 to-red-500',
      delay: '100ms',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'FAQ',
      onClick: () => {
        setIsOpen(false);
        navigate('/client/faq');
      },
      color: 'from-emerald-500 to-teal-500',
      delay: '150ms',
    },
  ];

  return (
    <>
      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4), 0 0 40px rgba(99, 102, 241, 0.2); }
          50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(99, 102, 241, 0.3); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes bounce-in {
          0% { transform: scale(0) translateY(20px); opacity: 0; }
          50% { transform: scale(1.1) translateY(-5px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
        
        .pulse-ring-animation {
          animation: pulse-ring 2s ease-out infinite;
        }
        
        .glow-animation {
          animation: glow 2s ease-in-out infinite;
        }
        
        .spin-slow-animation {
          animation: spin-slow 20s linear infinite;
        }
        
        .bounce-in-animation {
          animation: bounce-in 0.4s ease-out forwards;
        }
        
        .wiggle-animation {
          animation: wiggle 0.5s ease-in-out;
        }
        
        .menu-item-enter {
          opacity: 0;
          transform: scale(0) translateY(20px);
        }
        
        .menu-item-enter-active {
          opacity: 1;
          transform: scale(1) translateY(0);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      <div ref={menuRef} className="fixed bottom-4 right-3 z-[9000]" data-tour="help-button">
        {/* Backdrop when open */}
        <div 
          className={`fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Items - Vertical stack */}
        <div className={`absolute bottom-20 right-0 flex flex-col items-end gap-3 transition-all duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
              }`}
              style={{ 
                transitionDelay: isOpen ? item.delay : '0ms',
              }}
            >
              {/* Label */}
              <span className="px-3 py-1.5 bg-gray-900/90 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap backdrop-blur-sm">
                {item.label}
              </span>
              
              {/* Icon Button */}
              <button
                onClick={item.onClick}
                className={`w-12 h-12 rounded-full bg-gradient-to-r ${item.color} text-white shadow-lg 
                  hover:scale-110 hover:shadow-xl active:scale-95 transition-all duration-200
                  flex items-center justify-center`}
                style={{
                  boxShadow: `0 4px 15px rgba(0, 0, 0, 0.2)`,
                }}
              >
                {item.icon}
              </button>
            </div>
          ))}
        </div>

        {/* Main Button */}
        <div className="relative">
          {/* Animated rings when not open */}
          {!isOpen && (
            <>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 pulse-ring-animation" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 pulse-ring-animation" style={{ animationDelay: '1s' }} />
            </>
          )}
          
          {/* Rotating border gradient */}
          <div className={`absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 ${!isOpen ? 'spin-slow-animation opacity-70' : 'opacity-0'}`} />
          
          {/* Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${
              isOpen 
                ? 'bg-gray-800 rotate-180' 
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 glow-animation'
            } ${!isOpen && !isHovered ? 'float-animation' : ''}`}
            style={{
              backgroundSize: '200% 200%',
              animation: !isOpen ? 'float 3s ease-in-out infinite, glow 2s ease-in-out infinite' : undefined,
            }}
          >
            {/* Inner glow */}
            {!isOpen && (
              <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
            )}
            
            {/* Icon */}
            <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>
              {isOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <div className="relative">
                  <HelpCircle className={`w-6 h-6 text-white ${isHovered ? 'wiggle-animation' : ''}`} />
                  {/* Sparkle effect on hover */}
                  {isHovered && (
                    <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-300 animate-pulse" />
                  )}
                </div>
              )}
            </div>
          </button>

          {/* Tooltip on hover */}
          {!isOpen && isHovered && (
            <div className="absolute bottom-full right-0 mb-3 bounce-in-animation">
              <div className="relative px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl shadow-xl whitespace-nowrap">
                <span className="flex items-center gap-2">
                  Need help?
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">?</kbd>
                </span>
                {/* Arrow */}
                <div className="absolute -bottom-2 right-4 w-4 h-4 bg-gray-900 rotate-45" />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FloatingHelpButton;
