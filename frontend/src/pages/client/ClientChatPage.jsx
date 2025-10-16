import { MessageSquare, Send } from 'lucide-react';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';

const ClientChatPage = () => {
  return (
    <ClientDashboardLayout>
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <MessageSquare className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Chat Support</h2>
          <p className="text-gray-600 mb-6">
            Real-time chat support is coming soon! You'll be able to communicate with our support team directly from here.
          </p>
          <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl p-6 border-2 border-orange-200">
            <p className="text-sm text-gray-700">
              <strong>Coming Soon:</strong> Live chat, file sharing, ticket management, and instant support.
            </p>
          </div>
        </div>
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientChatPage;