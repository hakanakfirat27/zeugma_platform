// frontend/src/pages/legal/PrivacyPolicyPage.jsx
import { useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, Database, Globe, Clock, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';

const PrivacyPolicyPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const getLayoutComponent = () => {
    if (user?.role === 'CLIENT') return ClientDashboardLayout;
    if (user?.role === 'DATA_COLLECTOR') return DataCollectorLayout;
    return DashboardLayout;
  };

  const LayoutComponent = getLayoutComponent();

  const sections = [
    {
      icon: Database,
      title: 'Information We Collect',
      content: `We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This includes:

• Account information (name, email, company name, phone number)
• Usage data and analytics
• Communication preferences
• Payment information (processed securely through third-party providers)
• Any data you upload or input into our platform`
    },
    {
      icon: Eye,
      title: 'How We Use Your Information',
      content: `We use the information we collect to:

• Provide, maintain, and improve our services
• Process transactions and send related information
• Send technical notices, updates, and support messages
• Respond to your comments, questions, and requests
• Monitor and analyze trends, usage, and activities
• Detect, investigate, and prevent fraudulent transactions and other illegal activities
• Personalize and improve your experience`
    },
    {
      icon: Lock,
      title: 'Data Security',
      content: `We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:

• Encryption of data in transit and at rest
• Regular security assessments and audits
• Access controls and authentication mechanisms
• Employee training on data protection
• Incident response procedures`
    },
    {
      icon: Globe,
      title: 'Data Sharing',
      content: `We do not sell your personal information. We may share your information only in the following circumstances:

• With your consent or at your direction
• With service providers who assist in our operations
• To comply with legal obligations
• To protect our rights, privacy, safety, or property
• In connection with a merger, acquisition, or sale of assets`
    },
    {
      icon: UserCheck,
      title: 'Your Rights',
      content: `Depending on your location, you may have certain rights regarding your personal data:

• Access: Request a copy of your personal data
• Correction: Request correction of inaccurate data
• Deletion: Request deletion of your personal data
• Portability: Request transfer of your data
• Objection: Object to certain processing activities
• Restriction: Request restriction of processing

To exercise these rights, please contact us at privacy@adata.com`
    },
    {
      icon: Clock,
      title: 'Data Retention',
      content: `We retain your personal data for as long as necessary to fulfill the purposes for which it was collected, including to satisfy legal, accounting, or reporting requirements. The retention period may vary depending on the context and our legal obligations.

When data is no longer needed, we securely delete or anonymize it in accordance with our data retention policies.`
    },
    {
      icon: Mail,
      title: 'Contact Us',
      content: `If you have any questions about this Privacy Policy or our data practices, please contact us at:

A Data Limited
Email: privacy@adata.com
Address: [Company Address]

We will respond to your inquiry within 30 days.`
    }
  ];

  return (
    <LayoutComponent
      pageTitle="Privacy Policy"
      pageSubtitleBottom="How we collect, use, and protect your data"
      breadcrumbs={breadcrumbs}
    >
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Privacy Policy</h1>
              <p className="text-white/80">Last updated: December 25, 2025</p>
            </div>
          </div>
          <p className="text-white/90 leading-relaxed">
            At A Data, we are committed to protecting your privacy and ensuring the security of your personal information. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div 
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      {section.title}
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            By using our services, you acknowledge that you have read and understood this Privacy Policy. 
            We may update this policy from time to time, and we will notify you of any material changes.
          </p>
        </div>
      </div>
    </LayoutComponent>
  );
};

export default PrivacyPolicyPage;
