// frontend/src/components/common/ThemeToggle.jsx
// Multiple Theme Toggle Styles - 12 Variants to choose from!
// Now integrates with ThemeContext to use admin-configured variant

import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ 
  variant: propVariant, // Override variant from props (optional)
  size = 'md', 
  showLabel = false,
  className = '' 
}) => {
  const { isDarkMode, toggleTheme, canToggle, showToggle, toggleVariant } = useTheme();

  // Use prop variant if provided, otherwise use context variant
  const variant = propVariant || toggleVariant || 'scene';

  // Don't render if admin disabled the toggle or set show_toggle_in_header to false
  if (!showToggle) {
    return null;
  }

  // Render disabled state if toggle is not allowed
  if (!canToggle) {
    return null; // Or you could show a disabled toggle
  }

  // ============================================
  // STYLE 1: Minimal - Simple icon button
  // ============================================
  const MinimalToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`
        relative w-10 h-10 rounded-full flex items-center justify-center
        transition-all duration-300 ease-out
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        ${isDarkMode 
          ? 'bg-gray-700 hover:bg-gray-600 focus:ring-yellow-400 text-yellow-300' 
          : 'bg-blue-100 hover:bg-blue-200 focus:ring-blue-400 text-blue-600'
        }
        ${className}
      `}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun className={`w-5 h-5 absolute transition-all duration-500 ${isDarkMode ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`} />
      <Moon className={`w-5 h-5 absolute transition-all duration-500 ${isDarkMode ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`} />
    </button>
  );

  // ============================================
  // STYLE 2: Pill - Classic toggle switch
  // ============================================
  const PillToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`
        relative w-16 h-8 rounded-full
        transition-all duration-500 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        shadow-inner
        ${isDarkMode 
          ? 'bg-indigo-900 focus:ring-indigo-400' 
          : 'bg-sky-400 focus:ring-sky-400'
        }
        ${className}
      `}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={`absolute w-1 h-1 bg-white rounded-full top-2 left-2 transition-opacity duration-300 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`} />
      <span className={`absolute w-0.5 h-0.5 bg-white rounded-full top-4 left-4 transition-opacity duration-300 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`} />
      <span className={`absolute w-1 h-1 bg-white rounded-full top-1.5 left-6 transition-opacity duration-300 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`} />
      <span className={`absolute w-3 h-1.5 bg-white/80 rounded-full bottom-2 right-2 transition-all duration-300 ${isDarkMode ? 'opacity-0 translate-x-2' : 'opacity-100'}`} />
      <span className={`absolute w-2 h-1 bg-white/60 rounded-full bottom-3.5 right-4 transition-all duration-300 ${isDarkMode ? 'opacity-0 translate-x-2' : 'opacity-100'}`} />
      <span 
        className={`absolute top-1 w-6 h-6 rounded-full shadow-md transition-all duration-500 ease-out
          ${isDarkMode ? 'left-1 bg-gray-200' : 'left-9 bg-yellow-300'}`}
      >
        {isDarkMode && (
          <>
            <span className="absolute w-1.5 h-1.5 bg-gray-300 rounded-full top-1 right-1 opacity-60" />
            <span className="absolute w-1 h-1 bg-gray-300 rounded-full bottom-1.5 left-1 opacity-40" />
          </>
        )}
      </span>
    </button>
  );

  // ============================================
  // STYLE 3: Scene - Detailed illustrated toggle
  // ============================================
  const SceneToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative w-20 h-10 rounded-full overflow-hidden transition-shadow duration-500
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-400
        shadow-lg hover:shadow-xl ${className}`}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="absolute inset-0 transition-all duration-700"
        style={{ background: isDarkMode ? 'linear-gradient(180deg, #1a365d 0%, #2c5282 100%)' : 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 100%)' }} />
      <div className={`absolute inset-0 transition-opacity duration-500 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}>
        <span className="absolute w-1 h-1 bg-white rounded-full top-2 right-3" style={{ boxShadow: '0 0 3px #fff' }} />
        <span className="absolute w-1.5 h-1.5 bg-white rounded-full top-3 right-6" style={{ boxShadow: '0 0 4px #fff' }} />
        <span className="absolute w-1 h-1 bg-white rounded-full top-1 right-9" style={{ boxShadow: '0 0 3px #fff' }} />
        <span className="absolute w-0.5 h-0.5 bg-white/70 rounded-full top-5 right-4" />
        <span className="absolute w-0.5 h-0.5 bg-white/70 rounded-full top-6 right-8" />
      </div>
      <div className={`absolute inset-0 transition-all duration-500 ${isDarkMode ? 'opacity-0 translate-x-4' : 'opacity-100'}`}>
        <div className="absolute left-2 top-2 w-6 h-3 bg-white/90 rounded-full" />
        <div className="absolute left-3.5 top-1 w-4 h-2.5 bg-white rounded-full" />
        <div className="absolute left-1 bottom-2 w-5 h-2 bg-white/70 rounded-full" />
      </div>
      <div className="absolute top-1 w-8 h-8 rounded-full transition-all duration-500 ease-out"
        style={{
          left: isDarkMode ? '4px' : 'calc(100% - 36px)',
          background: isDarkMode ? 'linear-gradient(135deg, #f0f4f8 0%, #cbd5e0 100%)' : 'linear-gradient(135deg, #fef08a 0%, #facc15 100%)',
          boxShadow: isDarkMode ? '0 0 15px rgba(226, 232, 240, 0.4), inset -2px -2px 4px rgba(0,0,0,0.1)' : '0 0 20px rgba(250, 204, 21, 0.5), inset -2px -2px 4px rgba(0,0,0,0.05)'
        }}>
        <div className={`absolute inset-0 transition-opacity duration-300 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute w-2.5 h-2.5 top-1 left-1 rounded-full" style={{ background: 'radial-gradient(circle, rgba(148,163,184,0.5) 0%, transparent 70%)' }} />
          <div className="absolute w-2 h-2 top-4 left-4 rounded-full" style={{ background: 'radial-gradient(circle, rgba(148,163,184,0.4) 0%, transparent 70%)' }} />
          <div className="absolute w-1.5 h-1.5 top-5 left-1.5 rounded-full" style={{ background: 'radial-gradient(circle, rgba(148,163,184,0.3) 0%, transparent 70%)' }} />
        </div>
      </div>
    </button>
  );

  // ============================================
  // STYLE 4: Glow - Neon glow effect
  // ============================================
  const GlowToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative w-16 h-8 rounded-full transition-all duration-500 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        ${isDarkMode ? 'bg-slate-800 focus:ring-purple-400' : 'bg-amber-100 focus:ring-amber-400'} ${className}`}
      style={{
        boxShadow: isDarkMode 
          ? '0 0 20px rgba(139, 92, 246, 0.3), inset 0 0 10px rgba(0,0,0,0.3)'
          : '0 0 20px rgba(251, 191, 36, 0.3), inset 0 0 10px rgba(255,255,255,0.5)'
      }}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="absolute top-1 w-6 h-6 rounded-full transition-all duration-500 ease-out flex items-center justify-center"
        style={{
          left: isDarkMode ? '4px' : 'calc(100% - 28px)',
          background: isDarkMode ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
          boxShadow: isDarkMode ? '0 0 15px rgba(139, 92, 246, 0.8), 0 0 30px rgba(139, 92, 246, 0.4)' : '0 0 15px rgba(251, 191, 36, 0.8), 0 0 30px rgba(251, 191, 36, 0.4)'
        }}>
        <Sun className={`w-3.5 h-3.5 text-white absolute transition-all duration-300 ${isDarkMode ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`} />
        <Moon className={`w-3.5 h-3.5 text-white absolute transition-all duration-300 ${isDarkMode ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
      </span>
    </button>
  );

  // ============================================
  // STYLE 5: iOS - Apple style toggle
  // ============================================
  const IosToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative w-14 h-8 rounded-full transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-400
        ${isDarkMode ? 'bg-green-500' : 'bg-gray-300'} ${className}`}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span 
        className={`absolute top-0.5 w-7 h-7 bg-white rounded-full shadow-md transition-all duration-300 ease-out
          ${isDarkMode ? 'left-6' : 'left-0.5'}`}
        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
      />
    </button>
  );

  // ============================================
  // STYLE 6: Neumorphic - Soft 3D style
  // ============================================
  const NeumorphicToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative w-16 h-8 rounded-full transition-all duration-500
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-400
        ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} ${className}`}
      style={{
        boxShadow: isDarkMode 
          ? 'inset 4px 4px 8px #1a1a1a, inset -4px -4px 8px #363636'
          : 'inset 4px 4px 8px #bebebe, inset -4px -4px 8px #ffffff'
      }}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span 
        className={`absolute top-1 w-6 h-6 rounded-full transition-all duration-500 flex items-center justify-center
          ${isDarkMode ? 'left-9 bg-gray-700' : 'left-1 bg-gray-100'}`}
        style={{
          boxShadow: isDarkMode 
            ? '4px 4px 8px #1a1a1a, -4px -4px 8px #363636'
            : '4px 4px 8px #bebebe, -4px -4px 8px #ffffff'
        }}
      >
        <Sun className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-0 scale-0 text-gray-400' : 'opacity-100 scale-100 text-amber-500'}`} />
        <Moon className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-100 scale-100 text-yellow-300' : 'opacity-0 scale-0 text-gray-400'}`} />
      </span>
    </button>
  );

  // ============================================
  // STYLE 7: Eclipse - Sun/Moon eclipse effect
  // ============================================
  const EclipseToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative w-12 h-12 rounded-full transition-all duration-700 overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-400
        hover:scale-105 active:scale-95 ${className}`}
      style={{
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
          : 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)'
      }}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div 
        className="absolute w-8 h-8 rounded-full transition-all duration-700"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #fef08a 0%, #facc15 100%)',
          boxShadow: isDarkMode ? 'none' : '0 0 20px rgba(250, 204, 21, 0.6)'
        }}
      />
      <div 
        className="absolute w-8 h-8 rounded-full transition-all duration-700"
        style={{
          top: '50%',
          left: isDarkMode ? '50%' : '100%',
          transform: 'translate(-50%, -50%)',
          background: isDarkMode 
            ? 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)'
            : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          boxShadow: isDarkMode ? '0 0 15px rgba(226, 232, 240, 0.3)' : 'none'
        }}
      >
        {isDarkMode && (
          <>
            <div className="absolute w-2 h-2 top-1 left-2 rounded-full bg-gray-300/50" />
            <div className="absolute w-1.5 h-1.5 top-4 left-5 rounded-full bg-gray-300/40" />
            <div className="absolute w-1 h-1 top-5 left-2 rounded-full bg-gray-300/30" />
          </>
        )}
      </div>
      <div className={`absolute inset-0 transition-opacity duration-500 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}>
        <span className="absolute w-0.5 h-0.5 bg-white rounded-full top-2 left-2" />
        <span className="absolute w-1 h-1 bg-white rounded-full top-1 right-2" />
        <span className="absolute w-0.5 h-0.5 bg-white rounded-full bottom-2 left-3" />
        <span className="absolute w-0.5 h-0.5 bg-white rounded-full bottom-3 right-3" />
      </div>
    </button>
  );

  // ============================================
  // STYLE 8: Neon Border - Glowing border effect
  // ============================================
  const NeonBorderToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative w-16 h-8 rounded-full transition-all duration-500
        focus:outline-none ${className}`}
      style={{
        background: isDarkMode ? '#1a1a2e' : '#f0f0f0',
        border: '2px solid',
        borderColor: isDarkMode ? '#00d4ff' : '#ff9500',
        boxShadow: isDarkMode 
          ? '0 0 10px #00d4ff, 0 0 20px #00d4ff, inset 0 0 10px rgba(0, 212, 255, 0.1)'
          : '0 0 10px #ff9500, 0 0 20px #ff9500, inset 0 0 10px rgba(255, 149, 0, 0.1)'
      }}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span 
        className="absolute top-0.5 w-6 h-6 rounded-full transition-all duration-500 flex items-center justify-center"
        style={{
          left: isDarkMode ? 'calc(100% - 26px)' : '2px',
          background: isDarkMode ? '#00d4ff' : '#ff9500',
          boxShadow: isDarkMode 
            ? '0 0 10px #00d4ff, 0 0 20px #00d4ff'
            : '0 0 10px #ff9500, 0 0 20px #ff9500'
        }}
      >
        <Sun className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-0 scale-0' : 'opacity-100 scale-100 text-white'}`} />
        <Moon className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-100 scale-100 text-gray-900' : 'opacity-0 scale-0'}`} />
      </span>
    </button>
  );

  // ============================================
  // STYLE 9: Liquid - Morphing blob effect
  // ============================================
  const LiquidToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative w-16 h-8 rounded-full transition-all duration-500 overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-400
        ${isDarkMode ? 'bg-slate-900' : 'bg-sky-200'} ${className}`}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div 
        className="absolute transition-all duration-700 ease-in-out rounded-full"
        style={{
          width: '200%',
          height: '200%',
          top: '-50%',
          left: isDarkMode ? '-100%' : '0%',
          background: isDarkMode 
            ? 'radial-gradient(circle, #312e81 0%, #1e1b4b 50%, transparent 70%)'
            : 'radial-gradient(circle, #fef08a 0%, #fde047 50%, transparent 70%)',
        }}
      />
      <span 
        className={`absolute top-1 w-6 h-6 rounded-full transition-all duration-500 ease-out flex items-center justify-center z-10
          ${isDarkMode ? 'left-9' : 'left-1'}`}
        style={{
          background: isDarkMode 
            ? 'linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 100%)'
            : 'linear-gradient(135deg, #fef08a 0%, #facc15 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        <Sun className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-0 rotate-180' : 'opacity-100 rotate-0 text-amber-600'}`} />
        <Moon className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-100 rotate-0 text-indigo-900' : 'opacity-0 -rotate-180'}`} />
      </span>
    </button>
  );

  // ============================================
  // STYLE 10: Rocker - 3D rocker switch
  // ============================================
  const RockerToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative w-10 h-16 rounded-lg transition-all duration-300 overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-gray-400 ${className}`}
      style={{
        background: 'linear-gradient(180deg, #4a4a4a 0%, #2a2a2a 100%)',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.3)'
      }}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div 
        className="absolute inset-1 rounded transition-all duration-300"
        style={{
          background: isDarkMode 
            ? 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #4a4a4a 100%)'
            : 'linear-gradient(0deg, #3a3a3a 0%, #2a2a2a 50%, #4a4a4a 100%)',
          transform: isDarkMode ? 'rotateX(15deg)' : 'rotateX(-15deg)',
          boxShadow: isDarkMode 
            ? 'inset 0 -4px 8px rgba(0,0,0,0.5)'
            : 'inset 0 4px 8px rgba(0,0,0,0.5)'
        }}
      />
      <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-all duration-300 ${!isDarkMode ? 'bg-amber-400 shadow-lg' : 'bg-gray-600'}`}
        style={{ boxShadow: !isDarkMode ? '0 0 8px #f59e0b' : 'none' }} />
      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-indigo-400 shadow-lg' : 'bg-gray-600'}`}
        style={{ boxShadow: isDarkMode ? '0 0 8px #818cf8' : 'none' }} />
    </button>
  );

  // ============================================
  // STYLE 11: Text Slide - Shows Dark/Light text
  // ============================================
  const TextSlideToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative h-8 rounded-full transition-all duration-500 overflow-hidden px-1
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-400
        ${isDarkMode ? 'bg-gray-800 w-20' : 'bg-amber-400 w-20'} ${className}`}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={`absolute top-1/2 -translate-y-1/2 text-xs font-bold transition-all duration-300
        ${isDarkMode ? 'left-2 text-gray-400' : 'right-2 text-amber-800'}`}>
        {isDarkMode ? 'DARK' : 'LIGHT'}
      </span>
      <span 
        className={`absolute top-1 w-6 h-6 rounded-full transition-all duration-500 flex items-center justify-center
          ${isDarkMode ? 'left-12 bg-indigo-500' : 'left-1 bg-white'}`}
        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
      >
        <Sun className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-0' : 'opacity-100 text-amber-500'}`} />
        <Moon className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-100 text-white' : 'opacity-0'}`} />
      </span>
    </button>
  );

  // ============================================
  // STYLE 12: Bouncy - Elastic bounce animation
  // ============================================
  const BouncyToggle = () => (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative w-16 h-8 rounded-full transition-colors duration-500
        focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-blue-400
        ${isDarkMode ? 'bg-indigo-900' : 'bg-sky-400'} ${className}`}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span 
        className="absolute top-1 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          left: isDarkMode ? '4px' : 'calc(100% - 28px)',
          background: isDarkMode 
            ? 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)'
            : 'linear-gradient(135deg, #fef08a 0%, #facc15 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'left 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55), background 0.3s, box-shadow 0.3s'
        }}
      >
        <Sun className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-0 scale-0' : 'opacity-100 scale-100 text-amber-600'}`} />
        <Moon className={`w-3.5 h-3.5 absolute transition-all duration-300 ${isDarkMode ? 'opacity-100 scale-100 text-indigo-800' : 'opacity-0 scale-0'}`} />
      </span>
    </button>
  );

  // Select the variant to render
  const renderToggle = () => {
    switch (variant) {
      case 'minimal': return <MinimalToggle />;
      case 'pill': return <PillToggle />;
      case 'scene': return <SceneToggle />;
      case 'glow': return <GlowToggle />;
      case 'ios': return <IosToggle />;
      case 'neumorphic': return <NeumorphicToggle />;
      case 'eclipse': return <EclipseToggle />;
      case 'neon': return <NeonBorderToggle />;
      case 'liquid': return <LiquidToggle />;
      case 'rocker': return <RockerToggle />;
      case 'text': return <TextSlideToggle />;
      case 'bouncy': return <BouncyToggle />;
      default: return <SceneToggle />;
    }
  };

  if (!showLabel) {
    return renderToggle();
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {renderToggle()}
      <span className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {isDarkMode ? 'Dark' : 'Light'}
      </span>
    </div>
  );
};

export default ThemeToggle;
