// frontend/src/pages/legal/TermsOfServicePage.jsx
import { useLocation } from 'react-router-dom';
import { FileText, CheckCircle, AlertTriangle, Scale, Ban, CreditCard, RefreshCw, Gavel } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';

const TermsOfServicePage = () => {
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
      icon: CheckCircle,
      title: 'Acceptance of Terms',
      content: `By accessing or using A Data's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services.

These Terms of Service apply to all users of the platform, including without limitation users who are browsers, vendors, customers, merchants, and/or contributors of content.`
    },
    {
      icon: FileText,
      title: 'Use of Services',
      content: `You may use our services only for lawful purposes and in accordance with these Terms. You agree not to:

• Use the services in any way that violates applicable laws or regulations
• Attempt to gain unauthorized access to any part of the services
• Interfere with or disrupt the integrity or performance of the services
• Transmit any viruses, malware, or other malicious code
• Collect or harvest any information from other users
• Use the services for any commercial purpose without our consent
• Reproduce, duplicate, copy, sell, or resell any portion of the services`
    },
    {
      icon: Scale,
      title: 'Intellectual Property',
      content: `The services and all contents, including but not limited to text, images, graphics, logos, icons, software, and data compilations, are the property of A Data or its licensors and are protected by copyright, trademark, and other intellectual property laws.

You are granted a limited, non-exclusive, non-transferable license to access and use the services for your internal business purposes only. This license does not include the right to:

• Modify or copy the materials
• Use the materials for any commercial purpose
• Remove any copyright or proprietary notations
• Transfer the materials to another person`
    },
    {
      icon: CreditCard,
      title: 'Payment Terms',
      content: `Certain features of our services may require payment of fees. You agree to pay all fees associated with your use of such features. All fees are non-refundable unless otherwise stated.

• Subscription fees are billed in advance on a monthly or annual basis
• You authorize us to charge your payment method for all fees due
• We reserve the right to change our fees upon 30 days' notice
• Failure to pay fees may result in suspension or termination of your account

All prices are exclusive of applicable taxes, which will be added where required.`
    },
    {
      icon: AlertTriangle,
      title: 'Disclaimers',
      content: `THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:

• The services will be uninterrupted, timely, secure, or error-free
• The results obtained from the services will be accurate or reliable
• Any errors in the services will be corrected

We do not guarantee the accuracy, completeness, or usefulness of any information provided through the services. Your use of the services is at your sole risk.`
    },
    {
      icon: Ban,
      title: 'Limitation of Liability',
      content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, A DATA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:

• Loss of profits, data, or goodwill
• Service interruption or computer damage
• Cost of substitute services
• Any damages arising from your use of the services

Our total liability for any claims arising from these Terms shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.`
    },
    {
      icon: RefreshCw,
      title: 'Modifications',
      content: `We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.

By continuing to access or use our services after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you must stop using the services.`
    },
    {
      icon: Gavel,
      title: 'Governing Law',
      content: `These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard to its conflict of law provisions.

Any disputes arising out of or relating to these Terms or the services shall be resolved through binding arbitration in accordance with the rules of [Arbitration Body]. The arbitration shall take place in [Location], and the language of arbitration shall be English.

You agree to waive any right to a jury trial or to participate in a class action lawsuit.`
    }
  ];

  return (
    <LayoutComponent
      pageTitle="Terms of Service"
      pageSubtitleBottom="Please read these terms carefully before using our services"
      breadcrumbs={breadcrumbs}
    >
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Terms of Service</h1>
              <p className="text-white/80">Last updated: December 25, 2025</p>
            </div>
          </div>
          <p className="text-white/90 leading-relaxed">
            Welcome to A Data. These Terms of Service govern your use of our platform and services. 
            By using our services, you agree to these terms. Please read them carefully.
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
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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

        {/* Contact Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Contact Us</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>A Data Limited</strong><br />
              Email: legal@adata.com<br />
              Address: [Company Address]
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            By using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our services.
          </p>
        </div>
      </div>
    </LayoutComponent>
  );
};

export default TermsOfServicePage;
