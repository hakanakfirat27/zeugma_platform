// frontend/src/utils/breadcrumbConfig.js

/**
 * Breadcrumb configuration for the entire platform
 * Define breadcrumb paths for all routes
 * ✅ FIXED: Now supports UUID IDs (not just numbers)
 */

export const getBreadcrumbs = (pathname, dynamicData = {}) => {
  // Remove trailing slash
  const path = pathname.endsWith('/') && pathname !== '/' 
    ? pathname.slice(0, -1) 
    : pathname;

  // Static breadcrumb configurations
  const breadcrumbMap = {
    // Dashboard routes
    '/staff-dashboard': [
      { label: 'Staff Dashboard', path: '/staff-dashboard' }
    ],
    '/client-dashboard': [
      { label: 'Client Dashboard', path: '/client-dashboard' }
    ],
    '/data-collector-dashboard': [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' }
    ],

    // User Management
    '/user-management': [
      { label: 'User Management', path: '/user-management' }
    ],
    '/my-profile': [
      { label: 'My Profile', path: '/my-profile' }
    ],
    '/profile-settings': [
      { label: 'Profile Settings', path: '/profile-settings' }
    ],
    '/update-profile': [
      { label: 'Update Profile', path: '/update-profile' }
    ],
    '/user-activity': [
      { label: 'User Activity', path: '/user-activity' }
    ],

    // Database & Reports
    '/superdatabase': [
      { label: 'Super Database', path: '/superdatabase' }
    ],
    '/unverified-sites': [
      { label: 'Unverified Sites', path: '/unverified-sites' }
    ],
    '/unverified-sites/add': [
      { label: 'Unverified Sites', path: '/unverified-sites' },
      { label: 'Add New Site', path: '/unverified-sites/add' }
    ],
    '/custom-reports': [
      { label: 'Custom Reports', path: '/custom-reports' }
    ],
    '/custom-reports/create': [
      { label: 'Custom Reports', path: '/custom-reports' },
      { label: 'Create Report', path: '/custom-reports/create' }
    ],

    // Subscriptions
    '/subscriptions': [
      { label: 'Subscription Management', path: '/subscriptions' }
    ],
    '/client/subscriptions': [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'My Subscriptions', path: '/client/subscriptions' }
    ],

    // Notifications
    '/staff/notifications': [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Notifications', path: '/staff/notifications' }
    ],
    '/client/notifications': [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'Notifications', path: '/client/notifications' }
    ],
    '/notifications': [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' },
      { label: 'Notifications', path: '/notifications' }
    ],

    // Chat
    '/staff-chat': [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Chat', path: '/staff-chat' }
    ],
    '/client/chat': [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'Chat', path: '/client/chat' }
    ],
    '/data-collector-chat': [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' },
      { label: 'Chat', path: '/data-collector-chat' }
    ],

    // Announcements
    '/announcements-management': [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Announcements Management', path: '/announcements-management' }
    ],
    '/announcements/new': [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Announcements Management', path: '/announcements-management' },
      { label: 'Create Announcement', path: '/announcements/new' }
    ],
    '/announcements': [
      { label: 'Announcements', path: '/announcements' }
    ],
    '/client/announcements': [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'Announcements', path: '/client/announcements' }
    ],

    // Projects - Data Collector
    '/projects': [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' },
      { label: 'My Projects', path: '/projects' }
    ],

    // Projects - Admin
    '/admin/projects': [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Projects Management', path: '/admin/projects' }
    ],

    // Tasks
    '/my-tasks': [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' },
      { label: 'My Tasks', path: '/my-tasks' }
    ],

    // Company Research
    '/company-research': [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' },
      { label: 'Company Research', path: '/company-research' }
    ],

    // Client Reports
    '/client/reports': [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'Reports', path: '/client/reports' }
    ],

    // FAQ
    '/client/faq': [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'FAQ', path: '/client/faq' }
    ],

    // Help Center
    '/client/help-center': [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'Help Center', path: '/client/help-center' }
    ],

    // Widget Management
    '/widget-management': [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Widget Management', path: '/widget-management' }
    ],

    // Company Database
    '/company-database': [
      { label: 'Company Database', path: '/company-database' }
    ],
    '/company-database/new': [
      { label: 'Company Database', path: '/company-database' },
      { label: 'Add Company', path: '/company-database/new' }
    ],

    // Company Reports (from Company Database)
    '/company-reports/create': [
      { label: 'Company Database', path: '/company-database' },
      { label: 'Create Report', path: '/company-reports/create' }
    ],
  };

  // Check for exact match first
  if (breadcrumbMap[path]) {
    return breadcrumbMap[path];
  }

  // Handle dynamic routes
  // ✅ FIXED: Changed \d+ to [^/]+ to support UUIDs
  // [^/]+ matches one or more characters that are NOT a slash
  
  // Projects - Data Collector
  if (path.match(/^\/projects\/[^/]+$/)) {
    const projectId = path.split('/')[2];
    const projectName = dynamicData.projectName || `Project #${projectId}`;
    return [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' },
      { label: 'My Projects', path: '/projects' },
      { label: projectName, path: `/projects/${projectId}` }
    ];
  }

  if (path.match(/^\/projects\/[^/]+\/add-site$/)) {
    const projectId = path.split('/')[2];
    const projectName = dynamicData.projectName || `Project #${projectId}`;
    return [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' },
      { label: 'My Projects', path: '/projects' },
      { label: projectName, path: `/projects/${projectId}` },
      { label: 'Add Site', path: `/projects/${projectId}/add-site` }
    ];
  }

  if (path.match(/^\/projects\/[^/]+\/sites\/[^/]+\/view$/)) {
    const [, , projectId, , siteId] = path.split('/');
    const projectName = dynamicData.projectName || `Project #${projectId}`;
    const siteName = dynamicData.siteName || `Site #${siteId}`;
    return [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' },
      { label: 'My Projects', path: '/projects' },
      { label: projectName, path: `/projects/${projectId}` },
      { label: siteName, path: `/projects/${projectId}/sites/${siteId}/view` }
    ];
  }

  if (path.match(/^\/projects\/[^/]+\/sites\/[^/]+\/edit$/)) {
    const [, , projectId, , siteId] = path.split('/');
    const projectName = dynamicData.projectName || `Project #${projectId}`;
    const siteName = dynamicData.siteName || `Site #${siteId}`;
    return [
      { label: 'Data Collector Dashboard', path: '/data-collector-dashboard' },
      { label: 'My Projects', path: '/projects' },
      { label: projectName, path: `/projects/${projectId}` },
      { label: siteName, path: `/projects/${projectId}/sites/${siteId}/view` },
      { label: 'Edit', path: `/projects/${projectId}/sites/${siteId}/edit` }
    ];
  }

  // Projects - Admin
  if (path.match(/^\/admin\/projects\/[^/]+$/)) {
    const projectId = path.split('/')[3];
    const projectName = dynamicData.projectName || `Project #${projectId}`;
    return [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Projects Management', path: '/admin/projects' },
      { label: projectName, path: `/admin/projects/${projectId}` }
    ];
  }

  if (path.match(/^\/admin\/projects\/[^/]+\/add-site$/)) {
    const projectId = path.split('/')[3];
    const projectName = dynamicData.projectName || `Project #${projectId}`;
    return [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Projects Management', path: '/admin/projects' },
      { label: projectName, path: `/admin/projects/${projectId}` },
      { label: 'Add Site', path: `/admin/projects/${projectId}/add-site` }
    ];
  }

  if (path.match(/^\/admin\/projects\/[^/]+\/sites\/[^/]+\/view$/)) {
    const [, , , projectId, , siteId] = path.split('/');
    const projectName = dynamicData.projectName || `Project #${projectId}`;
    const siteName = dynamicData.siteName || `Site #${siteId}`;
    return [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Projects Management', path: '/admin/projects' },
      { label: projectName, path: `/admin/projects/${projectId}` },
      { label: siteName, path: `/admin/projects/${projectId}/sites/${siteId}/view` }
    ];
  }

  if (path.match(/^\/admin\/projects\/[^/]+\/sites\/[^/]+\/edit$/)) {
    const [, , , projectId, , siteId] = path.split('/');
    const projectName = dynamicData.projectName || `Project #${projectId}`;
    const siteName = dynamicData.siteName || `Site #${siteId}`;
    return [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Projects Management', path: '/admin/projects' },
      { label: projectName, path: `/admin/projects/${projectId}` },
      { label: siteName, path: `/admin/projects/${projectId}/sites/${siteId}/view` },
      { label: 'Edit', path: `/admin/projects/${projectId}/sites/${siteId}/edit` }
    ];
  }

  // Unverified Sites
  if (path.match(/^\/unverified-sites\/[^/]+$/)) {
    const siteId = path.split('/')[2];
    const siteName = dynamicData.siteName || `Site #${siteId}`;
    return [
      { label: 'Unverified Sites', path: '/unverified-sites' },
      { label: siteName, path: `/unverified-sites/${siteId}` }
    ];
  }

  if (path.match(/^\/unverified-sites\/[^/]+\/edit$/)) {
    const siteId = path.split('/')[2];
    const siteName = dynamicData.siteName || `Site #${siteId}`;
    return [
      { label: 'Unverified Sites', path: '/unverified-sites' },
      { label: siteName, path: `/unverified-sites/${siteId}` },
      { label: 'Edit', path: `/unverified-sites/${siteId}/edit` }
    ];
  }

  // Custom Reports
  if (path.match(/^\/custom-reports\/[^/]+$/)) {
    const reportId = path.split('/')[2];
    const reportName = dynamicData.reportName || `Report #${reportId}`;
    return [
      { label: 'Custom Reports', path: '/custom-reports' },
      { label: reportName, path: `/custom-reports/${reportId}` }
    ];
  }

  if (path.match(/^\/custom-reports\/[^/]+\/edit$/)) {
    const reportId = path.split('/')[2];
    const reportName = dynamicData.reportName || `Report #${reportId}`;
    return [
      { label: 'Custom Reports', path: '/custom-reports' },
      { label: reportName, path: `/custom-reports/${reportId}` },
      { label: 'Edit', path: `/custom-reports/${reportId}/edit` }
    ];
  }

  // Client Reports
  if (path.match(/^\/client\/reports\/[^/]+$/)) {
    const reportId = path.split('/')[3];
    const reportName = dynamicData.reportName || `Report #${reportId}`;
    return [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'Reports', path: '/client/reports' },
      { label: reportName, path: `/client/reports/${reportId}` }
    ];
  }

  if (path.match(/^\/client\/reports\/[^/]+\/visualization$/)) {
    const reportId = path.split('/')[3];
    const reportName = dynamicData.reportName || `Report #${reportId}`;
    return [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'Reports', path: '/client/reports' },
      { label: reportName, path: `/client/reports/${reportId}` },
      { label: 'Visualization', path: `/client/reports/${reportId}/visualization` }
    ];
  }

  // Client Reports - Focus View
  if (path.match(/^\/client\/reports\/[^/]+\/focus$/)) {
    const reportId = path.split('/')[3];
    const reportName = dynamicData.reportName || `Report #${reportId}`;
    return [
      { label: 'Client Dashboard', path: '/client-dashboard' },
      { label: 'Reports', path: '/client/reports' },
      { label: reportName, path: `/client/reports/${reportId}` },
      { label: 'Focus View', path: `/client/reports/${reportId}/focus` }
    ];
  }

  // Announcements with ID
  if (path.match(/^\/announcements-management\/[^/]+$/)) {
    const announcementId = path.split('/')[2];
    const announcementTitle = dynamicData.announcementTitle || `Announcement #${announcementId}`;
    return [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Announcements Management', path: '/announcements-management' },
      { label: announcementTitle, path: `/announcements-management/${announcementId}` }
    ];
  }

  if (path.match(/^\/announcements\/edit\/[^/]+$/)) {
    const announcementId = path.split('/')[3];
    const announcementTitle = dynamicData.announcementTitle || `Announcement #${announcementId}`;
    return [
      { label: 'Staff Dashboard', path: '/staff-dashboard' },
      { label: 'Announcements Management', path: '/announcements-management' },
      { label: announcementTitle, path: `/announcements-management/${announcementId}` },
      { label: 'Edit', path: `/announcements/edit/${announcementId}` }
    ];
  }

  // Company Database - Company Detail
  if (path.match(/^\/companies\/[^/]+$/)) {
    const companyId = path.split('/')[2];
    const companyName = dynamicData.companyName || 'Company Details';
    return [
      { label: 'Company Database', path: '/company-database' },
      { label: companyName, path: `/companies/${companyId}` }
    ];
  }

  // Company Database - Versions Page
  if (path.match(/^\/companies\/[^/]+\/sites\/[^/]+\/versions$/)) {
    const [, , companyId, , siteId] = path.split('/');
    const companyName = dynamicData.companyName || 'Company Details';
    const categoryName = dynamicData.categoryName || 'Version History';
    return [
      { label: 'Company Database', path: '/company-database' },
      { label: companyName, path: `/companies/${companyId}` },
      { label: categoryName, path: `/companies/${companyId}/sites/${siteId}/versions` }
    ];
  }

  // Company Reports - Edit
  if (path.match(/^\/company-reports\/[^/]+\/edit$/)) {
    const reportId = path.split('/')[2];
    const reportName = dynamicData.reportName || `Report #${reportId}`;
    return [
      { label: 'Company Database', path: '/company-database' },
      { label: 'Custom Reports', path: '/custom-reports' },
      { label: reportName, path: `/custom-reports/${reportId}` },
      { label: 'Edit', path: `/company-reports/${reportId}/edit` }
    ];
  }

  // Feedback (Admin) - Combined page
  if (path === '/feedback') {
    return [
      { label: 'Dashboard', path: '/staff-dashboard' },
      { label: 'Feedback', path: '/feedback' }
    ];
  }

  // Default: return empty array
  return [];
};

/**
 * Hook to use breadcrumbs with dynamic data
 * Usage in component:
 * 
 * const breadcrumbs = useBreadcrumbs({ 
 *   projectName: project?.name,
 *   siteName: site?.company_name 
 * });
 */
export const useBreadcrumbs = (dynamicData = {}) => {
  const pathname = window.location.pathname;
  return getBreadcrumbs(pathname, dynamicData);
};