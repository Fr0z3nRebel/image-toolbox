import Link from "next/link";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-brand-charcoal flex-1">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link
          href="/"
          className="text-brand-orange hover:text-brand-200 mb-8 inline-block transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-brand-white mb-8">
          Terms of Use
        </h1>

        <div className="prose prose-invert max-w-none text-brand-white space-y-6">
          <p className="text-sm text-brand-white/70 mb-8">
            Last Updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="leading-relaxed">
              By accessing or using Image Toolbox and related services provided
              by Lefty Studios LLC (&quot;we,&quot; &quot;our,&quot; or
              &quot;us&quot;), you agree to be bound by these Terms of Use
              (&quot;Terms&quot;). If you do not agree to these Terms, you may
              not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              2. Description of Services
            </h2>
            <p className="leading-relaxed">
              Image Toolbox provides free, browser-based image processing tools
              (e.g., format conversion, compression, vectorization, cropping).
              Most tools process images locally in your browser. We reserve the
              right to modify, suspend, or discontinue any tool or feature at
              any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              3. Use of the Services
            </h2>
            <p className="leading-relaxed mb-4">
              You may use our tools for personal or commercial use in accordance
              with these Terms. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-brand-white">
              <li>Use the services only for lawful purposes</li>
              <li>Not upload content you do not have the right to use</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              4. Acceptable Use
            </h2>
            <p className="leading-relaxed mb-4">
              You agree not to use our services to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-brand-white">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the intellectual property or other rights of others</li>
              <li>Transmit harmful, offensive, or illegal content</li>
              <li>Interfere with or disrupt our services or infrastructure</li>
              <li>Attempt to gain unauthorized access to our systems or data</li>
              <li>Use automated systems (e.g., bots, scrapers) to access our services in a way that burdens our systems</li>
              <li>Reverse engineer, decompile, or disassemble our software except as permitted by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              5. Intellectual Property Rights
            </h2>
            <p className="leading-relaxed mb-4">
              All content, features, and functionality of Image Toolbox,
              including text, graphics, logos, and code, are owned by Lefty
              Studios LLC or its licensors and are protected by copyright,
              trademark, and other intellectual property laws.
            </p>
            <p className="leading-relaxed">
              You are granted a limited, non-exclusive, non-transferable license
              to access and use our services for your personal or business
              purposes in accordance with these Terms. This license does not
              include any right to copy, modify, distribute, or create derivative
              works of our services or content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              6. Your Content and Data
            </h2>
            <p className="leading-relaxed mb-4">
              You retain ownership of images and other content you upload or
              process through our tools. Our handling of your data is described
              in our{" "}
              <Link href="/privacy-policy" className="text-brand-orange hover:text-brand-200 underline">
                Privacy Policy
              </Link>
              . By using our services, you grant us only the rights necessary
              to operate the tools (e.g., temporarily process or transmit your
              files as needed). We do not claim ownership of your content.
            </p>
            <p className="leading-relaxed">
              You represent that you have the necessary rights to use and process
              any content you submit and that your use does not violate any
              third-party rights or applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              7. Donations and Optional Support
            </h2>
            <p className="leading-relaxed">
              Image Toolbox is free to use. We may offer optional ways to
              support us (e.g., &quot;Buy Me a Coffee&quot;). Any such support
              is voluntary and does not create a contract for additional
              services. Donations are generally non-refundable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              8. Service Availability
            </h2>
            <p className="leading-relaxed">
              We strive to keep our tools available but do not guarantee
              uninterrupted or error-free operation. We may modify, suspend, or
              discontinue any part of the services at any time. We are not
              liable for any loss or inconvenience resulting from such changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              9. Disclaimer of Warranties
            </h2>
            <p className="leading-relaxed">
              Our services are provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind, either express or
              implied, including but not limited to warranties of
              merchantability, fitness for a particular purpose, or
              non-infringement. We do not warrant that the tools will be
              uninterrupted, secure, or error-free, or that results will meet
              your requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              10. Limitation of Liability
            </h2>
            <p className="leading-relaxed">
              To the maximum extent permitted by law, Lefty Studios LLC shall not
              be liable for any indirect, incidental, special, consequential, or
              punitive damages, or any loss of profits, data, or goodwill,
              arising from your use of our services. In no event shall our total
              liability exceed the amount you paid to us in the twelve months
              preceding the claim (if any), or one hundred U.S. dollars,
              whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              11. Indemnification
            </h2>
            <p className="leading-relaxed">
              You agree to indemnify and hold harmless Lefty Studios LLC and its
              officers, directors, employees, and agents from any claims,
              damages, losses, and expenses (including legal fees) arising from
              your use of our services, violation of these Terms, or infringement
              of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              12. Changes to Terms
            </h2>
            <p className="leading-relaxed">
              We may update these Terms from time to time. We will post the
              updated Terms on this page and update the &quot;Last
              Updated&quot; date. Your continued use of Image Toolbox after
              changes constitutes acceptance of the updated Terms. We encourage
              you to review this page periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-brand-orange mb-4">
              13. Contact Information
            </h2>
            <p className="leading-relaxed">
              If you have questions about these Terms of Use, please contact us:
            </p>
            <p className="leading-relaxed mt-4 text-brand-white">
              <strong>Lefty Studios LLC</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:legal@leftystudios.com"
                className="text-brand-orange hover:text-brand-200 underline"
              >
                legal@leftystudios.com
              </a>
              <br />
              Website: https://www.leftystudios.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
