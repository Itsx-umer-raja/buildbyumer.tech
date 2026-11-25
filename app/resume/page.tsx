import type { Metadata } from "next";
import {
  Playfair_Display,
  Montserrat,
  Poppins,
  Raleway,
  Dancing_Script,
  Bebas_Neue,
  Oswald,
  Lora,
} from "next/font/google";
import { ResumeBuilder } from "@/components/resume/resume-builder";
import { SITE_URL } from "@/lib/site";

// Stylish resume fonts (free, OFL licence) — loaded as CSS variables so the
// resume preview and font picker can use them. The browser only downloads a
// font file when text actually uses it.
const playfair = Playfair_Display({ variable: "--font-resume-playfair", subsets: ["latin"], weight: ["400", "600", "700"] });
const montserrat = Montserrat({ variable: "--font-resume-montserrat", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const poppins = Poppins({ variable: "--font-resume-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const raleway = Raleway({ variable: "--font-resume-raleway", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const dancing = Dancing_Script({ variable: "--font-resume-dancing", subsets: ["latin"], weight: ["500", "600", "700"] });
const bebas = Bebas_Neue({ variable: "--font-resume-bebas", subsets: ["latin"], weight: ["400"] });
const oswald = Oswald({ variable: "--font-resume-oswald", subsets: ["latin"], weight: ["400", "500", "600"] });
const lora = Lora({ variable: "--font-resume-lora", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const RESUME_FONT_VARS = [
  playfair.variable,
  montserrat.variable,
  poppins.variable,
  raleway.variable,
  dancing.variable,
  bebas.variable,
  oswald.variable,
  lora.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Free Resume Builder — Make a Professional Resume Online",
  description:
    "Build a professional resume free in your browser: ten original templates including an ATS-friendly one, live preview, PDF and Word export. Upload an existing resume to edit it. Nothing is uploaded.",
  keywords: ["free resume builder", "free resume builder online", "resume maker", "resume maker online"],
  alternates: { canonical: "/resume" },
  openGraph: {
    type: "website",
    url: "/resume",
    siteName: "PDF World",
    title: "Free Resume Builder — Make a Professional Resume Online | PDF World",
    description:
      "Build a professional resume free in your browser: four original templates including an ATS-friendly one, live preview, PDF and Word export. Nothing is uploaded.",
    images: [{ url: "/pdf-world-icon-512.png", width: 512, height: 512, alt: "PDF World logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Resume Builder — Make a Professional Resume Online | PDF World",
    description:
      "Build a professional resume free in your browser: four original templates including an ATS-friendly one, live preview, PDF and Word export. Nothing is uploaded.",
    images: ["/pdf-world-icon-512.png"],
  },
};

export default function ResumePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "PDF World Resume Builder",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web browser",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description:
          "Free resume builder with ten original templates including an ATS-friendly one, live preview, and PDF and Word export. Runs in the browser; nothing is uploaded.",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Resume Builder", item: `${SITE_URL}/resume` },
        ],
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className={RESUME_FONT_VARS}>
        <ResumeBuilder />
      </div>
    </>
  );
}
