import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://coreaxis.com"),
  alternates: {
    canonical: "https://coreaxis.com",
  },
  title: {
    default: "Core Axis | The Action-Oriented AI CRM for High-Velocity Teams",
    template: "%s | Core Axis"
  },
  description: "Experience the most robust, action-oriented AI CRM for enterprise sales. Secure multi-tenant architecture with PBAC, built-in payments, and predictive lead insights for high-velocity teams.",
  keywords: [
    "Enterprise CRM", 
    "AI Sales Automation", 
    "Multi-tenant CRM", 
    "PBAC Security CRM", 
    "No-code Sales Workflows", 
    "High-velocity Lead Tracking", 
    "SaaS CRM Architecture",
    "Action-Oriented CRM"
  ],
  authors: [{ name: "DigiCare House" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://coreaxis.com",
    title: "Core Axis | Future-Proof Your Sales Infrastructure",
    description: "Stop managing leads, start closing deals. Enterprise-grade AI CRM with workflow automation and multi-tenant security.",
    siteName: "Core Axis",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Core Axis - Advanced AI CRM for Enterprise",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Core Axis | Enterprise Scalable AI CRM",
    description: "Multi-tenant, PBAC-secured, and action-oriented sales automation for power teams.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "Core Axis",
      "operatingSystem": "Web-based",
      "applicationCategory": "BusinessApplication",
      "offers": { "@type": "Offer", "price": "49.00", "priceCurrency": "USD" },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "512" }
    },
    {
      "@type": "Organization",
      "name": "Core Axis",
      "url": "https://coreaxis.com",
      "logo": "https://coreaxis.com/icon.svg",
      "sameAs": [
        "https://twitter.com/coreaxis",
        "https://linkedin.com/company/coreaxis"
      ]
    },
    {
      "@type": "WebSite",
      "name": "Core Axis",
      "url": "https://coreaxis.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://coreaxis.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ]
};

const navigationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Platform Navigation",
  "itemListElement": [
    { "@type": "SiteNavigationElement", "position": 1, "name": "Features", "url": "https://coreaxis.com/features" },
    { "@type": "SiteNavigationElement", "position": 2, "name": "Pricing", "url": "https://coreaxis.com/pricing" },
    { "@type": "SiteNavigationElement", "position": 3, "name": "Workflow Engine", "url": "https://coreaxis.com/features/workflow" },
    { "@type": "SiteNavigationElement", "position": 4, "name": "API Docs", "url": "https://coreaxis.com/docs" },
    { "@type": "SiteNavigationElement", "position": 5, "name": "Login", "url": "https://coreaxis.com/auth/signin" }
  ]
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What makes Core Axis different from traditional CRMs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Core Axis is an 'Action-Oriented' platform that surfaces your next best action automatically, focusing teams on closing deals rather than organizing data."
      }
    },
    {
      "@type": "Question",
      "name": "Does Core Axis support multi-tenant isolation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Our architecture allows for completely isolated workspaces, providing data sovereignty and enterprise-grade security for teams of any size."
      }
    },
    {
      "@type": "Question",
      "name": "Can I automate my manual sales workflows?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Absolutely. Core Axis features a robust no-code workflow engine that allows you to automate lead routing, task assignments, and follow-up notifications."
      }
    },
    {
      "@type": "Question",
      "name": "Is there an AI feature for lead reporting?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Core Axis includes AI-powered reporting tools that analyze your sales pipeline to provide predictive insights and high-velocity focus areas."
      }
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(navigationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://coreaxis.com" },
              { "@type": "ListItem", "position": 2, "name": "Features", "item": "https://coreaxis.com/features" },
              { "@type": "ListItem", "position": 3, "name": "Pricing", "item": "https://coreaxis.com/pricing" }
            ]
          }) }}
        />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            if (navigator.userAgent.indexOf('Core Axis-Capacitor-Mobile') !== -1) {
              document.documentElement.classList.add('is-mobile-app');
            }
          })();
        `}} />
        <style dangerouslySetInnerHTML={{ __html: `
          #initial-loader {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #0d1b4b;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 1;
            transition: opacity 0.4s ease-out;
            pointer-events: none;
          }
          /* Hide instantly if NOT the mobile app to avoid web penalties */
          html:not(.is-mobile-app) #initial-loader {
            display: none;
            opacity: 0;
          }
          .loader-hidden {
            opacity: 0 !important;
          }
        `}} />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground transition-colors duration-300`}
        suppressHydrationWarning
      >
        <div id="initial-loader" suppressHydrationWarning>
          <svg width="100" height="100" viewBox="0 0 32 32" fill="none">
             <rect x="5" y="20" width="5" height="7" rx="1.5" fill="white" opacity="0.4" />
             <rect x="13" y="15" width="5" height="12" rx="1.5" fill="white" opacity="0.7" />
             <rect x="21" y="9" width="5" height="18" rx="1.5" fill="white" />
             <polyline points="23.5,4 26,8.5 21,8.5" fill="#be123c" />
          </svg>
          <div style={{ marginTop: '20px', color: 'white', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.2em', opacity: 0.3 }}>
            INITIALIZING SECURE INSTANCE
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          // Automatic fade-out fallback to prevent app lockout
          setTimeout(function() {
            var loader = document.getElementById('initial-loader');
            if (loader) loader.classList.add('loader-hidden');
            setTimeout(function() { if(loader) loader.style.display = 'none'; }, 500);
          }, 2500);
        `}} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
