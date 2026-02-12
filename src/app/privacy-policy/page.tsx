import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="bg-brand-charcoal flex-1">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="w-36 flex-shrink-0 pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-brand-white hover:text-brand-orange transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Toolbox
            </Link>
          </div>
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-3xl font-bold text-brand-white mb-2">
              Privacy Policy
            </h1>
            <p className="text-brand-white/80">
              Your privacy matters to us. Learn how we handle your data.
            </p>
          </div>
          <div className="w-36 flex-shrink-0" aria-hidden />
        </div>

        {/* Privacy Policy Content */}
        <div className="prose prose-invert max-w-4xl mx-auto text-brand-white space-y-6">
          <p className="text-sm text-brand-white/70 mb-8">
            Last updated: June 30, 2025
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
                Our Commitment to Your Privacy
              </h2>
              <p className="text-brand-white leading-relaxed mb-4">
                At Lefty Studios, we are committed to protecting your privacy and ensuring 
                the security of your personal information. We believe in transparency and 
                want you to understand exactly how we handle your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-orange mb-4">
                Data We Do NOT Share or Sell
              </h2>
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
                <p className="text-green-200 font-medium">
                  ✓ We do not share your data with third parties
                </p>
                <p className="text-green-200 font-medium">
                  ✓ We do not sell your personal information
                </p>
                <p className="text-green-200 font-medium">
                  ✓ We do not use your images for training or other purposes
                </p>
              </div>
              <p className="text-brand-white leading-relaxed">
                Your images and personal data remain private and are never shared, 
                sold, or used for any purpose other than providing you with our image 
                processing services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-orange mb-4">
                How We Handle Your Images
              </h2>
              <p className="text-brand-white leading-relaxed mb-4">
                When you use our image processing tools:
              </p>
              <ul className="list-disc list-inside text-brand-white leading-relaxed mb-4 space-y-2">
                <li>
                  <strong>Client-side processing:</strong> Most of our tools process 
                  images directly in your browser, meaning your images never leave 
                  your device.
                </li>
                <li>
                  <strong>Temporary server storage:</strong> Some tools may temporarily 
                  store your images on our servers to perform processing operations.
                </li>
                <li>
                  <strong>Automatic deletion:</strong> Any images temporarily stored 
                  on our servers are automatically deleted immediately after the 
                  processing job is completed.
                </li>
                <li>
                  <strong>No permanent storage:</strong> We do not maintain any 
                  permanent copies of your images.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-orange mb-4">
                Security Measures
              </h2>
              <p className="text-brand-white leading-relaxed mb-4">
                We implement appropriate technical and organizational measures to 
                protect your data, including:
              </p>
              <ul className="list-disc list-inside text-brand-white leading-relaxed mb-4 space-y-2">
                <li>Secure HTTPS connections for all data transmission</li>
                <li>Automated deletion of temporary files</li>
                <li>No logging or storage of image content</li>
                <li>Regular security updates and monitoring</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-orange mb-4">
                Analytics and Cookies
              </h2>
              <p className="text-brand-white leading-relaxed mb-4">
                We may use analytics services to understand how our website is used 
                and to improve our services. This may include:
              </p>
              <ul className="list-disc list-inside text-brand-white leading-relaxed mb-4 space-y-2">
                <li>Basic usage statistics (page views, user interactions)</li>
                <li>Technical information (browser type, device type)</li>
                <li>Performance metrics to improve our services</li>
              </ul>
              <p className="text-brand-white leading-relaxed">
                No personal information or image content is shared with analytics 
                providers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-orange mb-4">
                Your Rights
              </h2>
              <p className="text-brand-white leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-brand-white leading-relaxed mb-4 space-y-2">
                <li>Use our services without creating an account</li>
                <li>Process images locally in your browser</li>
                <li>Contact us with any privacy concerns</li>
                <li>Request information about how your data is handled</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-brand-orange mb-4">
                Contact Us
              </h2>
              <p className="text-brand-white leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or how we handle 
                your data, please don&apos;t hesitate to contact us:
              </p>
              <div className="bg-brand-charcoal border border-brand-grey rounded-lg p-4">
                <p className="text-brand-white font-medium">
                  Email: <a 
                    href="mailto:contactus@leftystudios.com" 
                    className="text-brand-orange underline hover:text-brand-200"
                  >
                    contactus@leftystudios.com
                  </a>
                </p>
                <p className="text-brand-white/80 mt-2">
                  We typically respond to privacy inquiries within 48 hours.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-brand-orange mb-4">
                Updates to This Policy
              </h2>
              <p className="text-brand-white leading-relaxed">
                We may update this Privacy Policy from time to time. Any changes 
                will be posted on this page with an updated date. We encourage you 
                to review this policy periodically to stay informed about how we 
                protect your privacy.
              </p>
            </section>
        </div>
      </div>
    </div>
  );
} 