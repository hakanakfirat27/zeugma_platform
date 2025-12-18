import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import {
  Search,
  BookOpen,
  Video,
  ChevronRight,
  ChevronDown,
  Play,
  Clock,
  ArrowLeft,
  Settings,
  HelpCircle,
  Compass,
  PieChart,
  Grid,
  MessageCircle,
  Lightbulb,
  FileSpreadsheet,
  ThumbsUp,
  ThumbsDown,
  CheckCircle
} from 'lucide-react';

const ClientHelpCenter = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'guides');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState(['getting-started']);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleFeedback, setArticleFeedback] = useState({});
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null); // { articleId, isHelpful }
  const [feedbackComment, setFeedbackComment] = useState('');

  // Fetch existing feedback from backend on mount
  const fetchFeedback = useCallback(async () => {
    try {
      const response = await api.get('/api/client/help-article-feedback/');
      setArticleFeedback(response.data);
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      // Fall back to localStorage if API fails
      const saved = localStorage.getItem('helpCenterFeedback');
      if (saved) {
        setArticleFeedback(JSON.parse(saved));
      }
    }
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // Fetch feedback on component mount
  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSelectedArticle(null);
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Handle article feedback - submits to backend API
  const handleFeedback = async (articleId, isHelpful) => {
    // Set pending feedback to show comment input
    setPendingFeedback({ articleId, isHelpful });
    setFeedbackComment('');
  };

  // Submit feedback with optional comment
  const submitFeedback = async () => {
    if (!pendingFeedback) return;
    
    const { articleId, isHelpful } = pendingFeedback;
    setFeedbackLoading(true);
    
    // Optimistically update UI
    setArticleFeedback(prev => ({
      ...prev,
      [articleId]: {
        helpful: isHelpful,
        comment: feedbackComment || null,
        timestamp: new Date().toISOString()
      }
    }));

    try {
      await api.post('/api/client/help-article-feedback/', {
        article_id: articleId,
        is_helpful: isHelpful,
        comment: feedbackComment || null
      });
      
      // Also save to localStorage as backup
      const updatedFeedback = {
        ...articleFeedback,
        [articleId]: {
          helpful: isHelpful,
          comment: feedbackComment || null,
          timestamp: new Date().toISOString()
        }
      };
      localStorage.setItem('helpCenterFeedback', JSON.stringify(updatedFeedback));
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setFeedbackLoading(false);
      setPendingFeedback(null);
      setFeedbackComment('');
    }
  };

  // Skip comment and submit immediately
  const skipComment = () => {
    submitFeedback();
  };

  // Guide sections with articles
  const guideSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Compass className="w-5 h-5" />,
      color: 'bg-blue-100 text-blue-600',
      articles: [
        {
          id: 'welcome',
          title: 'Welcome to A Data',
          readTime: '2 min',
          content: `## Welcome to A Data Platform

A Data is your comprehensive solution for accessing plastic industry data.

### What you can do:
- View Reports: Access detailed reports about plastic manufacturers
- Analyze Data: Use our visualization tools
- Export Data: Download reports in PDF or Excel format
- Filter & Search: Find exactly what you need

### Need Help?
- Use the floating help button (?) in the bottom right
- Check our FAQ section
- Contact support through the chat feature`
        },
        {
          id: 'dashboard-overview',
          title: 'Understanding Your Dashboard',
          readTime: '3 min',
          content: `## Dashboard Overview

Your dashboard is the central hub for accessing all platform features.

### Dashboard Components
- Statistics Cards showing totals and updates
- Quick Actions for frequent tasks
- Recent Activity feed

### Navigation
Use the sidebar menu to access all sections.`
        },
        {
          id: 'navigation',
          title: 'Navigating the Platform',
          readTime: '2 min',
          content: `## Platform Navigation

### Sidebar Menu
The left sidebar provides quick access to all main sections:
- Dashboard - Main overview page
- My Reports - All your purchased reports
- Subscriptions - Manage subscriptions
- Help Center - Guides and tutorials

### Top Navigation
- Profile Menu: Click your avatar for settings
- Notifications Bell: View recent notifications`
        }
      ]
    },
    {
      id: 'reports',
      title: 'Working with Reports',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      color: 'bg-purple-100 text-purple-600',
      articles: [
        {
          id: 'viewing-reports',
          title: 'How to View Your Reports',
          readTime: '3 min',
          content: `## Viewing Your Reports

### Accessing Reports
1. Click "My Reports" in the sidebar
2. You'll see a list of all reports you have access to
3. Click on any report to open it

### Report Details
When you open a report, you can:
- View company data in a table format
- Access visualization tools
- Download data in various formats`
        },
        {
          id: 'filtering-data',
          title: 'Filtering and Searching Data',
          readTime: '4 min',
          content: `## Filtering and Searching

### Quick Search
Use the search bar to quickly find companies by name, location, or category.

### Advanced Filters
- Country: Filter by country
- Region: Filter by specific regions
- Category: Filter by production category
- Materials: Filter by materials processed`
        },
        {
          id: 'exporting-data',
          title: 'Exporting Data',
          readTime: '3 min',
          content: `## Exporting Your Data

### Export Formats
- PDF: For presentations and sharing
- Excel: For data analysis

### How to Export
1. Open your report
2. Apply any filters (optional)
3. Click the "Export" button
4. Choose your format
5. Download starts automatically`
        }
      ]
    },
    {
      id: 'visualization',
      title: 'Data Visualization',
      icon: <PieChart className="w-5 h-5" />,
      color: 'bg-green-100 text-green-600',
      articles: [
        {
          id: 'visualization-overview',
          title: 'Visualization Tools Overview',
          readTime: '3 min',
          content: `## Data Visualization

### Accessing Visualizations
From your report, click "Visualization" to access visual analysis tools.

### Available Charts
- Bar Charts: Compare categories and regions
- Pie Charts: Market share distribution
- Maps: Geographic distribution with interactive markers`
        },
        {
          id: 'maps',
          title: 'Using the Map Feature',
          readTime: '3 min',
          content: `## Interactive Maps

### Map Controls
- Zoom: Use +/- buttons or scroll
- Pan: Click and drag
- Markers: Click markers for company details

### Map Filters
Filter map data by country, region, category, and company type.`
        }
      ]
    },
    {
      id: 'focus-view',
      title: 'Focus View',
      icon: <Grid className="w-5 h-5" />,
      color: 'bg-orange-100 text-orange-600',
      articles: [
        {
          id: 'focus-view-intro',
          title: 'Introduction to Focus View',
          readTime: '3 min',
          content: `## Focus View

Focus View provides an Excel-like interface for detailed data analysis.

### Features
- Spreadsheet Layout: Familiar Excel-like interface
- Column Sorting: Click headers to sort
- Column Filtering: Filter individual columns
- Pagination: Navigate through large datasets`
        },
        {
          id: 'focus-view-export',
          title: 'Exporting from Focus View',
          readTime: '2 min',
          content: `## Exporting Focus View Data

### Export Options
- Current View: Export visible columns only
- All Data: Export complete dataset
- Filtered Data: Export with current filters applied`
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Settings',
      icon: <Settings className="w-5 h-5" />,
      color: 'bg-pink-100 text-pink-600',
      articles: [
        {
          id: 'profile-settings',
          title: 'Managing Your Profile',
          readTime: '2 min',
          content: `## Profile Settings

### Accessing Settings
Click your profile avatar then "Settings"

### Profile Information
Update your name, email, phone number, and company information.

### Password
Change your password in Settings > Security.`
        },
        {
          id: 'notifications',
          title: 'Notification Settings',
          readTime: '2 min',
          content: `## Notifications

### Notification Types
- Report Updates: When your reports are updated
- Subscription Alerts: Subscription status changes
- System Announcements: Platform updates

### Managing Notifications
Access Settings > Notifications to configure your preferences.`
        }
      ]
    }
  ];

  // Video tutorials
  const videoTutorials = [
    { id: 'intro', title: 'Getting Started with A Data', duration: '3:45', thumbnail: '🎬', description: 'A complete introduction to the A Data platform', category: 'Getting Started' },
    { id: 'reports', title: 'How to View and Filter Reports', duration: '5:20', thumbnail: '📊', description: 'Learn how to navigate and filter your reports', category: 'Reports' },
    { id: 'visualization', title: 'Using Data Visualization Tools', duration: '4:15', thumbnail: '📈', description: 'Master charts, graphs, and map features', category: 'Visualization' },
    { id: 'focus-view', title: 'Focus View Tutorial', duration: '3:30', thumbnail: '📋', description: 'Excel-like interface for data analysis', category: 'Focus View' },
    { id: 'export', title: 'Exporting Data (PDF & Excel)', duration: '2:45', thumbnail: '💾', description: 'Download your data in various formats', category: 'Export' },
    { id: 'account', title: 'Managing Your Account', duration: '2:00', thumbnail: '⚙️', description: 'Profile settings and preferences', category: 'Account' }
  ];

  const filterContent = (content, query) => {
    if (!query) return content;
    const lowerQuery = query.toLowerCase();
    return content.filter(item => item.title?.toLowerCase().includes(lowerQuery) || item.description?.toLowerCase().includes(lowerQuery));
  };

  const filterGuideSections = (sections, query) => {
    if (!query) return sections;
    const lowerQuery = query.toLowerCase();
    return sections.map(section => ({
      ...section,
      articles: section.articles.filter(article => article.title.toLowerCase().includes(lowerQuery) || article.content.toLowerCase().includes(lowerQuery))
    })).filter(section => section.articles.length > 0);
  };

  const renderArticleContent = (article) => {
    const lines = article.content.trim().split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold text-gray-800 dark:text-white mt-6 mb-4">{line.replace('## ', '')}</h2>;
      if (line.startsWith('### ')) return <h3 key={index} className="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      if (line.startsWith('- ')) return <li key={index} className="ml-4 text-gray-600 dark:text-gray-400">{line.replace('- ', '')}</li>;
      if (line.trim() === '') return <br key={index} />;
      return <p key={index} className="text-gray-600 dark:text-gray-400 my-1">{line}</p>;
    });
  };

  // Render feedback section
  const renderFeedbackSection = (articleId) => {
    const feedback = articleFeedback[articleId];
    const isPending = pendingFeedback?.articleId === articleId;
    
    if (feedback) {
      // User has already given feedback
      return (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Thanks for your feedback!</p>
              <p className="text-sm text-green-600">
                {feedback.helpful 
                  ? "We're glad this article was helpful." 
                  : "We'll work on improving this article."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Show comment input after selecting feedback
    if (isPending) {
      return (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className={`p-4 rounded-xl border ${pendingFeedback.isHelpful ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              {pendingFeedback.isHelpful ? (
                <ThumbsUp className="w-5 h-5 text-green-600" />
              ) : (
                <ThumbsDown className="w-5 h-5 text-orange-600" />
              )}
              <span className={`font-medium ${pendingFeedback.isHelpful ? 'text-green-700' : 'text-orange-700'}`}>
                {pendingFeedback.isHelpful ? 'Glad it helped!' : 'Sorry to hear that'}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {pendingFeedback.isHelpful 
                ? 'Would you like to share any additional thoughts? (optional)' 
                : 'How can we improve this article? (optional)'}
            </p>
            
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={pendingFeedback.isHelpful 
                ? 'What did you find most helpful?' 
                : 'What information was missing or unclear?'}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
            
            <div className="flex gap-3 mt-3">
              <button
                onClick={submitFeedback}
                disabled={feedbackLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
              </button>
              <button
                onClick={skipComment}
                disabled={feedbackLoading}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      );
    }

    // User hasn't given feedback yet
    return (
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-4">Was this article helpful?</p>
        <div className="flex gap-3">
          <button 
            onClick={() => handleFeedback(articleId, true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 border border-green-200 transition-all hover:scale-105"
          >
            <ThumbsUp className="w-4 h-4" />
            Yes, helpful
          </button>
          <button 
            onClick={() => handleFeedback(articleId, false)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 border border-gray-200 transition-all hover:scale-105"
          >
            <ThumbsDown className="w-4 h-4" />
            Not really
          </button>
        </div>
      </div>
    );
  };

  const filteredSections = filterGuideSections(guideSections, searchQuery);

  return (
    <ClientDashboardLayout pageTitle="Help Center" breadcrumbs={breadcrumbs} pageSubtitleBottom="Find guides, tutorials, and answers to help you get the most out of A Data">
      <div className="p-6">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-2xl p-8 mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                <Lightbulb className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">How can we help you?</h1>
                <p className="text-cyan-100">Search our knowledge base or browse topics below</p>
              </div>
            </div>
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for guides, tutorials, or topics..." className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex gap-1 p-1">
            {[{ id: 'guides', label: 'Guides & Documentation', icon: <BookOpen className="w-4 h-4" /> }, { id: 'videos', label: 'Video Tutorials', icon: <Video className="w-4 h-4" /> }].map(tab => (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guides Tab */}
        {activeTab === 'guides' && (
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-72 flex-shrink-0">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Topics
                </h3>
                <nav className="space-y-1">
                  {filteredSections.map(section => (
                    <div key={section.id}>
                      <button onClick={() => toggleSection(section.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${expandedSections.includes(section.id) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${section.color} flex items-center justify-center`}>{section.icon}</div>
                          <span className="font-medium text-sm">{section.title}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.includes(section.id) ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.includes(section.id) && (
                        <div className="ml-10 mt-1 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-600 pl-3">
                          {section.articles.map(article => (
                            <button key={article.id} onClick={() => setSelectedArticle(article)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedArticle?.id === article.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                              {article.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Links</h4>
                  <div className="space-y-2">
                    <Link to="/client/faq" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><HelpCircle className="w-4 h-4" />FAQ</Link>
                    <Link to="/client/chat" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><MessageCircle className="w-4 h-4" />Contact Support</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {selectedArticle ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                  <button onClick={() => setSelectedArticle(null)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium mb-6"><ArrowLeft className="w-4 h-4" />Back to all topics</button>
                  <div className="flex items-center gap-3 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedArticle.title}</h1>
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full"><Clock className="w-4 h-4" />{selectedArticle.readTime} read</span>
                  </div>
                  <div className="prose max-w-none">{renderArticleContent(selectedArticle)}</div>
                  
                  {/* Feedback Section */}
                  {renderFeedbackSection(selectedArticle.id)}
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredSections.map(section => (
                    <div key={section.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl ${section.color} flex items-center justify-center`}>{section.icon}</div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-800 dark:text-white">{section.title}</h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{section.articles.length} articles</p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {section.articles.map(article => (
                          <button key={article.id} onClick={() => { setSelectedArticle(article); if (!expandedSections.includes(section.id)) toggleSection(section.id); }} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group">
                            <div>
                              <span className="text-gray-800 dark:text-gray-200 font-medium text-sm group-hover:text-blue-700 dark:group-hover:text-blue-400">{article.title}</span>
                              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs mt-1"><Clock className="w-3 h-3" />{article.readTime}</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredSections.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                      <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No results found</h3>
                      <p className="text-gray-500 dark:text-gray-400">Try searching with different keywords</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterContent(videoTutorials, searchQuery).map(video => (
                <div key={video.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all group cursor-pointer">
                  <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-6xl">{video.thumbnail}</span>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <Play className="w-8 h-8 text-blue-600 ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">{video.duration}</div>
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">{video.category}</span>
                    <h3 className="text-gray-800 dark:text-white font-semibold mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{video.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{video.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-amber-800 mb-2">Video Tutorials Coming Soon</h3>
              <p className="text-amber-700 max-w-md mx-auto">We're working on creating comprehensive video tutorials. Check back soon!</p>
            </div>
          </div>
        )}

        {/* Quick Help Banner */}
        <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Still need help?</h3>
                <p className="text-gray-300">Can't find what you're looking for? Our support team is here to help.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to="/client/faq" className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-colors flex items-center gap-2"><HelpCircle className="w-5 h-5" />View FAQ</Link>
              <Link to="/client/chat" className="px-6 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"><MessageCircle className="w-5 h-5" />Contact Support</Link>
            </div>
          </div>
        </div>
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientHelpCenter;
