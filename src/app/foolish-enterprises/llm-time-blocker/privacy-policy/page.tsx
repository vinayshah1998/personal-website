import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - LLM Time Blocker',
  description: 'Privacy policy for the LLM Time Blocker Chrome extension, detailing how we collect, use, and protect your information.',
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <Link
        href="/foolish-enterprises"
        className="inline-block mb-8 text-blue-600 dark:text-blue-400 hover:underline"
      >
        &larr; Back to Foolish Enterprises
      </Link>

      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Privacy Policy
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">LLM Time Blocker</p>
        <span className="inline-block bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-md text-sm text-blue-600 dark:text-blue-400">
          Effective Date: January 31, 2026
        </span>
      </header>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          This Privacy Policy describes how LLM Time Blocker (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Extension&rdquo;) collects, uses, and protects your information when you use our Chrome extension and related services.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          1. Information We Collect
        </h2>

        <h3 className="text-xl font-medium mt-6 mb-3 text-gray-800 dark:text-gray-200">
          1.1 Account Information
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          When you create an account, we collect:
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Email address</strong> &mdash; provided directly or via Google OAuth sign-in.</li>
          <li><strong>Password</strong> &mdash; if you register with email and password (stored as a salted hash; we never store plain-text passwords).</li>
          <li><strong>Google account profile data</strong> &mdash; limited to your email address and name when you authenticate with Google OAuth.</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3 text-gray-800 dark:text-gray-200">
          1.2 Browsing Data Stored Locally
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          The Extension stores the following data in your browser&apos;s local storage (<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">chrome.storage.local</code>):
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Blocked site list</strong> &mdash; the domains you have configured to block.</li>
          <li><strong>Approval records</strong> &mdash; timestamps recording when you were granted temporary access to a blocked site.</li>
          <li><strong>Schedule configuration</strong> &mdash; time windows during which blocking is active.</li>
          <li><strong>Authentication tokens</strong> &mdash; JWT access and refresh tokens used to authenticate with our backend.</li>
        </ul>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          This data remains on your device and is not transmitted to our servers except as described below.
        </p>

        <h3 className="text-xl font-medium mt-6 mb-3 text-gray-800 dark:text-gray-200">
          1.3 Chat and LLM Interaction Data
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          When you interact with the LLM gatekeeper to request access to a blocked site, the messages you type are sent to our backend server, which forwards them to a third-party LLM provider (Anthropic&apos;s Claude API) for processing. We may retain conversation logs for abuse prevention and service improvement.
        </p>

        <h3 className="text-xl font-medium mt-6 mb-3 text-gray-800 dark:text-gray-200">
          1.4 Payment Information
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Subscription payments are processed by <strong>Stripe</strong>. We do not directly collect or store your credit card number or banking details. Stripe handles all payment data in accordance with PCI-DSS standards. We receive and store only:
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li>Stripe customer and subscription identifiers.</li>
          <li>Subscription status and billing period information.</li>
        </ul>

        <h3 className="text-xl font-medium mt-6 mb-3 text-gray-800 dark:text-gray-200">
          1.5 Technical and Usage Data
        </h3>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Our backend server may automatically collect:
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li>IP address and request metadata (for rate limiting and security).</li>
          <li>Timestamps of API requests.</li>
          <li>Error logs for debugging purposes.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          2. How We Use Your Information
        </h2>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Provide and maintain the service</strong> &mdash; authenticate your account, manage subscriptions, and process LLM requests.</li>
          <li><strong>Process payments</strong> &mdash; manage your subscription through Stripe.</li>
          <li><strong>Prevent abuse</strong> &mdash; detect and prevent misuse of the LLM gatekeeper feature.</li>
          <li><strong>Improve the service</strong> &mdash; analyze usage patterns in aggregate to enhance functionality and performance.</li>
          <li><strong>Communicate with you</strong> &mdash; send transactional emails related to your account or subscription.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          3. Data Sharing and Third Parties
        </h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          We share your data only with the following third-party services, and only to the extent necessary to provide the Extension&apos;s functionality:
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li>
            <strong>Anthropic (Claude API)</strong> &mdash; receives chat messages you send to the LLM gatekeeper. Subject to{' '}
            <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
              Anthropic&apos;s Privacy Policy
            </a>.
          </li>
          <li>
            <strong>Stripe</strong> &mdash; processes subscription payments. Subject to{' '}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
              Stripe&apos;s Privacy Policy
            </a>.
          </li>
          <li>
            <strong>Google</strong> &mdash; facilitates OAuth authentication. Subject to{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
              Google&apos;s Privacy Policy
            </a>.
          </li>
          <li>
            <strong>Railway</strong> &mdash; hosts our backend infrastructure. Subject to{' '}
            <a href="https://railway.app/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
              Railway&apos;s Privacy Policy
            </a>.
          </li>
        </ul>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          We do not sell, rent, or trade your personal information to any third party for marketing purposes.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          4. Data Retention
        </h2>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Account data</strong> is retained for as long as your account is active. You may request deletion at any time.</li>
          <li><strong>LLM conversation logs</strong> may be retained for up to 90 days for abuse prevention.</li>
          <li><strong>Local browser data</strong> is retained until you uninstall the Extension or clear it manually.</li>
          <li><strong>Payment records</strong> are retained as required by applicable tax and financial regulations.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          5. Data Security
        </h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          We implement appropriate technical and organizational measures to protect your data, including:
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li>Encrypted data transmission over HTTPS/TLS.</li>
          <li>Hashed and salted password storage.</li>
          <li>Short-lived JWT access tokens (15 minutes) with secure refresh token rotation.</li>
          <li>Server-side rate limiting and input validation.</li>
        </ul>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          No method of electronic storage or transmission is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          6. Chrome Extension Permissions
        </h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          The Extension requests the following browser permissions:
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>webNavigation</strong> &mdash; to detect when you navigate to a blocked website.</li>
          <li><strong>storage</strong> &mdash; to store your blocked site list, approval records, and authentication tokens locally.</li>
          <li><strong>tabs</strong> &mdash; to redirect blocked navigations to the gatekeeper page.</li>
        </ul>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          These permissions are used solely to deliver the Extension&apos;s core blocking functionality. We do not collect or transmit your general browsing history.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          7. Your Rights
        </h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Depending on your jurisdiction, you may have the right to:
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your account and associated data.</li>
          <li>Export your data in a portable format.</li>
          <li>Withdraw consent for data processing where applicable.</li>
        </ul>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          To exercise any of these rights, please contact us at the email address listed below.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          8. Children&apos;s Privacy
        </h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          The Extension is not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us so we can take appropriate action.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          9. Changes to This Policy
        </h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy with a revised effective date. Your continued use of the Extension after any changes constitutes your acceptance of the updated policy.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
          10. Contact Us
        </h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          <strong>Email:</strong>{' '}
          <a href="mailto:vinayshah2006@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            vinayshah2006@gmail.com
          </a>
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <Link
          href="/foolish-enterprises"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; Back to Foolish Enterprises
        </Link>
      </footer>
    </div>
  );
}
