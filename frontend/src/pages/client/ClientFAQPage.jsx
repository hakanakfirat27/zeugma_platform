import { HelpCircle, Search } from 'lucide-react';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import { useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';

const ClientFAQPage = () => {
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);  
    
  return (
    <ClientDashboardLayout
      pageTitle="FAQ"
      pageSubtitleBottom="Searchable FAQ, video tutorials, documentation, and quick answers."
      breadcrumbs={breadcrumbs}
    >
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <HelpCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-600 mb-6">
            Our comprehensive FAQ section is under construction. Soon you'll find answers to all your questions here.
          </p>
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 border-2 border-pink-200">
            <p className="text-sm text-gray-700">
              <strong>Coming Soon:</strong> Searchable FAQ, video tutorials, documentation, and quick answers.
            </p>
          </div>
        </div>
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientFAQPage;