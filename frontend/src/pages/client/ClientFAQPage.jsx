import { useState, useMemo } from 'react';
import { 
  HelpCircle, Search, ChevronDown, ChevronRight,
  Compass, FileText, CreditCard, Shield, Wrench,
  MessageCircle, BookOpen, Mail, Phone
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';

// FAQ Data organized by categories
const faqData = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Compass,
    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500',
    questions: [
      {
        id: 'gs-1',
        question: 'What is A Data and what services do you offer?',
        answer: 'A Data is a comprehensive platform providing detailed data and analytics about plastic manufacturers across Europe. We offer reports on Injection Moulders, Blow Moulders, various Extruders (Film, Sheet, Pipe, Profile, and Other), Compounders, and Recyclers. Our data helps businesses identify potential partners, analyze market trends, and make informed decisions.'
      },
      {
        id: 'gs-2',
        question: 'How do I access my dashboard after logging in?',
        answer: 'After logging in, you\'ll be automatically directed to your dashboard. The dashboard provides an overview of your subscriptions, recent reports, and quick access to all platform features. You can also navigate to your dashboard anytime by clicking "Dashboard" in the sidebar menu.'
      },
      {
        id: 'gs-3',
        question: 'How do I navigate the platform?',
        answer: 'Use the sidebar menu on the left to navigate between sections: Dashboard (overview), Reports (your subscribed reports), Collections (saved companies), Subscriptions (manage your plans), Chat (contact support), and Settings (profile and preferences). The header provides quick access to notifications and your profile.'
      },
      {
        id: 'gs-4',
        question: 'Is there a mobile app available?',
        answer: 'Currently, A Data is available as a web application optimized for both desktop and mobile browsers. You can access all features through your mobile browser. A dedicated mobile app is on our roadmap for future development.'
      },
      {
        id: 'gs-5',
        question: 'How do I get help if I\'m stuck?',
        answer: 'You have several options: Use the floating help button (?) at the bottom right of any page for quick tips, visit the Help Center for guides and tutorials, check this FAQ section, or contact our support team directly through the Chat feature. Our team typically responds within 24 hours.'
      }
    ]
  },
  {
    id: 'reports-data',
    title: 'Reports & Data',
    icon: FileText,
    color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500',
    questions: [
      {
        id: 'rd-1',
        question: 'What information is included in the reports?',
        answer: 'Our reports include comprehensive company data: company name, contact information (address, phone, email, website), production capacity, number of machines, materials processed, product types, certifications, and geographic location. Data availability varies by company and region.'
      },
      {
        id: 'rd-2',
        question: 'How often is the data updated?',
        answer: 'We continuously update our database through our data collection team. Major updates occur quarterly, with ongoing corrections and additions made as new information becomes available. Each report shows the last update date for the data it contains.'
      },
      {
        id: 'rd-3',
        question: 'Can I filter and search within reports?',
        answer: 'Yes! Each report offers powerful filtering options including: country, region, company type, materials processed, machine count, and more. The search bar allows you to quickly find specific companies by name, location, or other criteria.'
      },
      {
        id: 'rd-4',
        question: 'How do I export data from reports?',
        answer: 'From any report view, click the "Export" button in the top toolbar. You can export data in Excel (.xlsx) or PDF format. Exports include all currently visible data based on your applied filters. Premium subscribers can export unlimited data.'
      },
      {
        id: 'rd-5',
        question: 'What is Focus View and how do I use it?',
        answer: 'Focus View provides an Excel-like spreadsheet interface for detailed data analysis. Access it from any report by clicking "Focus View" in the toolbar. You can sort columns, apply filters, resize columns, and export directly from this view.'
      },
      {
        id: 'rd-6',
        question: 'Can I save companies to view later?',
        answer: 'Yes! Use the Collections feature to save companies you\'re interested in. Click the bookmark icon on any company to add it to your collection. You can create multiple collections to organize companies by project, region, or any criteria you choose.'
      }
    ]
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions & Billing',
    icon: CreditCard,
    color: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    iconBg: 'bg-green-500',
    questions: [
      {
        id: 'sub-1',
        question: 'What subscription plans are available?',
        answer: 'We offer flexible subscription options: individual reports for specific categories, regional packages covering multiple categories in a region, and comprehensive packages for full database access. Contact our sales team for custom enterprise solutions.'
      },
      {
        id: 'sub-2',
        question: 'How do I subscribe to a new report?',
        answer: 'Visit the Subscriptions page and browse available reports. Click "Subscribe" on any report you\'re interested in. You can also contact our team to discuss which reports best fit your needs.'
      },
      {
        id: 'sub-3',
        question: 'When do subscriptions expire?',
        answer: 'Subscription duration varies by plan, typically 12 months from activation. You can view your subscription expiry dates on the Subscriptions page or Dashboard. We\'ll send reminder emails before your subscription expires.'
      },
      {
        id: 'sub-4',
        question: 'Can I upgrade or change my subscription?',
        answer: 'Yes! You can upgrade your subscription at any time by contacting our team. Downgrades or changes take effect at your next renewal period. We\'ll prorate any differences in cost.'
      },
      {
        id: 'sub-5',
        question: 'What payment methods do you accept?',
        answer: 'We accept bank transfers, credit cards (Visa, MasterCard, American Express), and PayPal. Enterprise customers can arrange invoicing with net payment terms. Contact billing@adata.com for specific payment arrangements.'
      },
      {
        id: 'sub-6',
        question: 'How do I get an invoice for my subscription?',
        answer: 'Invoices are automatically generated and sent to your registered email address. You can also download invoices from the Subscriptions page under "Billing History". Contact support if you need invoices re-sent or modified.'
      }
    ]
  },
  {
    id: 'account-security',
    title: 'Account & Security',
    icon: Shield,
    color: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500',
    questions: [
      {
        id: 'as-1',
        question: 'How do I change my password?',
        answer: 'Go to Settings > Security, then click "Change Password". You\'ll need to enter your current password and then your new password twice. Passwords must meet our security requirements: minimum 8 characters, including uppercase, lowercase, numbers, and special characters.'
      },
      {
        id: 'as-2',
        question: 'What is Two-Factor Authentication (2FA)?',
        answer: '2FA adds an extra layer of security to your account. When enabled, you\'ll need to enter a verification code sent to your email each time you log in. This prevents unauthorized access even if someone knows your password.'
      },
      {
        id: 'as-3',
        question: 'How do I enable Two-Factor Authentication?',
        answer: 'Go to Settings > Security and find the Two-Factor Authentication section. Click "Enable 2FA" and follow the prompts. You\'ll receive a verification code to your email to complete the setup. Make sure to save your backup codes!'
      },
      {
        id: 'as-4',
        question: 'I forgot my password. How do I reset it?',
        answer: 'Click "Forgot Password" on the login page and enter your email address. You\'ll receive an email with a link to reset your password. The link expires in 24 hours. If you don\'t receive the email, check your spam folder or contact support.'
      },
      {
        id: 'as-5',
        question: 'How do I update my profile information?',
        answer: 'Go to Settings > Profile to update your personal information including name, email, phone number, and company name. Changes are saved automatically. Note that changing your email may require re-verification.'
      },
      {
        id: 'as-6',
        question: 'What are backup codes and why do I need them?',
        answer: 'Backup codes are one-time use codes that let you access your account if you can\'t receive 2FA emails (e.g., email issues). Store them securely - they\'re your emergency access method. You can regenerate codes in Settings > Security.'
      }
    ]
  },
  {
    id: 'technical',
    title: 'Technical Support',
    icon: Wrench,
    color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-500',
    questions: [
      {
        id: 'tech-1',
        question: 'Which browsers are supported?',
        answer: 'A Data works best on modern browsers: Google Chrome (recommended), Mozilla Firefox, Microsoft Edge, and Safari. We recommend keeping your browser updated to the latest version for the best experience and security.'
      },
      {
        id: 'tech-2',
        question: 'The page isn\'t loading correctly. What should I do?',
        answer: 'Try these steps: 1) Refresh the page (Ctrl/Cmd + R), 2) Clear your browser cache (Ctrl/Cmd + Shift + Delete), 3) Try a different browser, 4) Check your internet connection. If problems persist, contact support with details about the issue.'
      },
      {
        id: 'tech-3',
        question: 'Why can\'t I download my exported file?',
        answer: 'Check that pop-ups aren\'t blocked for our site in your browser settings. Also ensure you have sufficient disk space. Large exports may take a moment to generate. If downloads still fail, try a different browser or contact support.'
      },
      {
        id: 'tech-4',
        question: 'The map isn\'t displaying properly. How do I fix it?',
        answer: 'Map issues are usually caused by browser extensions blocking content. Try disabling ad blockers temporarily, or use an incognito/private window. Ensure JavaScript is enabled in your browser settings.'
      },
      {
        id: 'tech-5',
        question: 'How do I report a bug or technical issue?',
        answer: 'Use the Chat feature to report issues directly to our support team. Include: what you were trying to do, what happened instead, your browser and device type, and any error messages you saw. Screenshots are very helpful!'
      },
      {
        id: 'tech-6',
        question: 'Is my data secure on your platform?',
        answer: 'Yes! We use industry-standard security measures including: SSL/TLS encryption for all data transmission, secure data centers, regular security audits, and strict access controls. We never share your personal data with third parties without consent.'
      }
    ]
  }
];

const ClientFAQPage = () => {
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  // Filter FAQs based on search query
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeCategory 
        ? faqData.filter(cat => cat.id === activeCategory)
        : faqData;
    }

    const query = searchQuery.toLowerCase();
    return faqData.map(category => ({
      ...category,
      questions: category.questions.filter(
        q => q.question.toLowerCase().includes(query) || 
             q.answer.toLowerCase().includes(query)
      )
    })).filter(cat => cat.questions.length > 0);
  }, [searchQuery, activeCategory]);

  // Total question count for display
  const totalQuestions = useMemo(() => {
    return faqData.reduce((acc, cat) => acc + cat.questions.length, 0);
  }, []);

  // Toggle question expansion (accordion style - only one open at a time)
  const toggleQuestion = (questionId) => {
    setExpandedQuestion(prev => prev === questionId ? null : questionId);
  };

  // Collapse current question
  const collapseAll = () => {
    setExpandedQuestion(null);
  };

  return (
    <ClientDashboardLayout
      pageTitle="FAQ"
      pageSubtitleBottom="Find answers to commonly asked questions about A Data"
      breadcrumbs={breadcrumbs}
    >
      <div className="p-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 rounded-2xl p-8 mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 dark:bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 dark:bg-white/5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 dark:bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center">
                <HelpCircle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>
                <p className="text-pink-100 dark:text-gray-400">{totalQuestions} answers to help you get started</p>
              </div>
            </div>
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search for answers..." 
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg" 
              />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveCategory(null); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeCategory === null && !searchQuery
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All Categories
            </button>
            {faqData.map(category => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => { setActiveCategory(category.id); setSearchQuery(''); }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                    activeCategory === category.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="flex items-center justify-between mb-4 px-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found <span className="font-semibold text-purple-600 dark:text-purple-400">
                {filteredFAQs.reduce((acc, cat) => acc + cat.questions.length, 0)}
              </span> results for "{searchQuery}"
            </p>
            {expandedQuestion && (
              <button 
                onClick={collapseAll}
                className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
              >
                Collapse
              </button>
            )}
          </div>
        )}

        {/* FAQ Categories */}
        <div className="space-y-6">
          {filteredFAQs.map(category => {
            const Icon = category.icon;
            return (
              <div 
                key={category.id} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Category Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${category.iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 dark:text-white">{category.title}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{category.questions.length} questions</p>
                    </div>
                  </div>
                </div>

                {/* Questions */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {category.questions.map((faq, index) => {
                    const isExpanded = expandedQuestion === faq.id;
                    return (
                      <div key={faq.id} className="group">
                        <button
                          onClick={() => toggleQuestion(faq.id)}
                          className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                            isExpanded 
                              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20'
                          }`}>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </div>
                          <span className={`font-medium transition-colors ${
                            isExpanded 
                              ? 'text-purple-700 dark:text-purple-400' 
                              : 'text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                          }`}>
                            {faq.question}
                          </span>
                        </button>
                        
                        {/* Answer - Expandable */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}>
                          <div className="px-5 pb-5 pl-17">
                            <div className="ml-12 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-100 dark:border-purple-800/50">
                              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                {faq.answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredFAQs.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No results found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              We couldn't find any FAQs matching "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Still Need Help Banner */}
        <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Still have questions?</h3>
                <p className="text-gray-300">Can't find what you're looking for? We're here to help.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link 
                to="/client/help-center" 
                className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Help Center
              </Link>
              <Link 
                to="/client/chat" 
                className="px-6 py-3 bg-purple-600 rounded-xl text-white font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Contact Support
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Contact Info */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email Support</p>
              <p className="font-semibold text-gray-800 dark:text-white">support@adata.com</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone Support</p>
              <p className="font-semibold text-gray-800 dark:text-white">+44 20 1234 5678</p>
            </div>
          </div>
        </div>
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientFAQPage;
