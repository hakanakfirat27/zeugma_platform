// Tour step configurations for different pages/contexts

export const clientDashboardTourSteps = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    content: 'Use the sidebar to navigate between different sections of the platform. You can collapse it for more space.',
    position: 'right',
    icon: '📍',
    path: null // Stay on current page
  },
  {
    target: '[data-tour="dashboard-stats"]',
    title: 'Dashboard Statistics',
    content: 'Here you can see an overview of your reports, subscriptions, and recent activity at a glance.',
    position: 'bottom',
    icon: '📊',
    path: '/client/dashboard' // Navigate to Dashboard
  },
  {
    target: '[data-tour="my-reports"]',
    title: 'My Reports',
    content: 'Access all your purchased reports here. Click on any report to view detailed company data.',
    position: 'right',
    icon: '📁',
    path: '/client/reports' // Navigate to Reports
  },
  {
    target: '[data-tour="subscriptions"]',
    title: 'Subscriptions',
    content: 'Manage your active subscriptions and see when they expire or need renewal.',
    position: 'right',
    icon: '📈',
    path: '/client/subscriptions' // Navigate to Subscriptions
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Notifications',
    content: 'Stay updated with important announcements and report updates through the notification bell.',
    position: 'bottom',
    icon: '🔔',
    path: null // Stay on current page
  },
  {
    target: '[data-tour="profile-menu"]',
    title: 'Profile Menu',
    content: 'Click your avatar to access profile settings, preferences, and logout.',
    position: 'bottom',
    icon: '👤',
    path: null // Stay on current page
  },
  {
    target: '[data-tour="help-button"]',
    title: 'Need Help?',
    content: 'Click this button anytime to access guides, tutorials, and support options. You can also press "?" on your keyboard!',
    position: 'top',
    icon: '❓',
    path: null // Stay on current page
  }
];

export const reportViewTourSteps = [
  {
    target: '[data-tour="report-header"]',
    title: 'Report Information',
    content: 'This shows the report name, description, and key statistics about the included companies.',
    position: 'bottom',
    icon: '📋'
  },
  {
    target: '[data-tour="report-filters"]',
    title: 'Filter Options',
    content: 'Use these filters to narrow down the data by country, region, category, and more.',
    position: 'bottom',
    icon: '🔍'
  },
  {
    target: '[data-tour="report-table"]',
    title: 'Company Data',
    content: 'Browse through company information in this table. Click on any row to see full details.',
    position: 'top',
    icon: '📊'
  },
  {
    target: '[data-tour="visualization-btn"]',
    title: 'Visualization',
    content: 'Click here to see charts, graphs, and an interactive map of the data.',
    position: 'bottom',
    icon: '📈'
  },
  {
    target: '[data-tour="focus-view-btn"]',
    title: 'Focus View',
    content: 'Switch to an Excel-like spreadsheet view for detailed data analysis.',
    position: 'bottom',
    icon: '📋'
  },
  {
    target: '[data-tour="export-btn"]',
    title: 'Export Data',
    content: 'Download the report as PDF or Excel file for offline use and sharing.',
    position: 'bottom',
    icon: '💾'
  }
];

export const visualizationTourSteps = [
  {
    target: '[data-tour="viz-charts"]',
    title: 'Charts & Graphs',
    content: 'Interactive charts showing data distribution, top categories, and trends.',
    position: 'bottom',
    icon: '📊'
  },
  {
    target: '[data-tour="viz-map"]',
    title: 'Interactive Map',
    content: 'See the geographic distribution of companies. Click markers for details.',
    position: 'top',
    icon: '🗺️'
  },
  {
    target: '[data-tour="viz-filters"]',
    title: 'Visualization Filters',
    content: 'Filter the visualizations to focus on specific regions or categories.',
    position: 'right',
    icon: '🔍'
  }
];

export const focusViewTourSteps = [
  {
    target: '[data-tour="focus-table"]',
    title: 'Spreadsheet View',
    content: 'An Excel-like interface for browsing and analyzing company data in detail.',
    position: 'top',
    icon: '📋'
  },
  {
    target: '[data-tour="focus-columns"]',
    title: 'Column Settings',
    content: 'Show or hide columns and rearrange them to customize your view.',
    position: 'bottom',
    icon: '⚙️'
  },
  {
    target: '[data-tour="focus-search"]',
    title: 'Quick Search',
    content: 'Quickly find companies by name, location, or any other field.',
    position: 'bottom',
    icon: '🔍'
  },
  {
    target: '[data-tour="focus-export"]',
    title: 'Export to Excel',
    content: 'Download the current view or all data to an Excel spreadsheet.',
    position: 'bottom',
    icon: '💾'
  }
];
