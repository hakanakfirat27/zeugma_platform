// frontend/src/components/Breadcrumb.jsx

import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Breadcrumb component for navigation
 * @param {Array} items - Array of breadcrumb items {label, path}
 * @param {boolean} showHome - Whether to show home icon
 */
const Breadcrumb = ({ items, showHome = true }) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center flex-wrap gap-2 text-sm" aria-label="Breadcrumb">
      {showHome && (
        <>
          <Link
            to="/"
            className="flex items-center transition-colors text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className="w-4 h-4 text-indigo-400 dark:text-gray-500" />
        </>
      )}
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2">
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="transition-colors font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {item.label}
              </Link>
            ) : (
              <span 
                className={isLast 
                  ? 'text-indigo-900 dark:text-white font-semibold' 
                  : 'text-indigo-600 dark:text-indigo-400'
                }
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRight className="w-4 h-4 text-indigo-400 dark:text-gray-500" />
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
