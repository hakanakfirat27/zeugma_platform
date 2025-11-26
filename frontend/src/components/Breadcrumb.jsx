// frontend/src/components/Breadcrumb.jsx

import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Breadcrumb component for navigation
 * @param {Array} items - Array of breadcrumb items {label, path}
 * @param {boolean} showHome - Whether to show home icon
 */
const Breadcrumb = ({ items, showHome = true }) => {
  // Styling for content area (below header)
  const styles = {
    home: 'text-indigo-500 hover:text-indigo-700',
    link: 'text-indigo-600 hover:text-indigo-900',
    current: 'text-indigo-900 font-semibold',
    separator: 'text-indigo-400'
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center flex-wrap gap-2 text-sm" aria-label="Breadcrumb">
      {showHome && (
        <>
          <Link
            to="/"
            className={`flex items-center transition-colors ${styles.home}`}
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className={`w-4 h-4 ${styles.separator}`} />
        </>
      )}
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2">
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className={`transition-colors font-medium  ${styles.link}`}
              >
                {item.label}
              </Link>
            ) : (
              <span 
                className={isLast ? styles.current : styles.link}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRight className={`w-4 h-4 ${styles.separator}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;