import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About PDF World — Free PDF Tools That Run in Your Browser",
  description:
    "PDF World is a free collection of PDF tools that run entirely in your browser. Your files never leave your device — no accounts, no uploads, no queues.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    url: "/about",
    siteName: "PDF World",
    title: "About PDF World — Free PDF Tools That Run in Your Browser | PDF World",
    description:
      "PDF World is a free collection of PDF tools that run entirely in your browser. Your files never leave your device — no accounts, no uploads, no queues.",
    images: [{ url: "/pdf-world-icon-512.png", width: 512, height: 512, alt: "PDF World logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About PDF World — Free PDF Tools That Run in Your Browser | PDF World",
    description:
      "PDF World is a free collection of PDF tools that run entirely in your browser. Your files never leave your device — no accounts, no uploads, no queues.",
    images: ["/pdf-world-icon-512.png"],
  },
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-2 font-display text-2xl font-bold text-slate-900">{children}</h2>;
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">About PDF World</h1>
      <div className="mt-6 space-y-5 leading-relaxed text-slate-700">
        <p>
          PDF World is a small collection of everyday PDF tools: merge, split, compress, convert,
          rotate, organize, watermark, number, protect and unlock. It was built for people who
          need to get a PDF task done quickly, without creating an account or handing their
          documents to a server.
        </p>
        <H2>How it works</H2>
        <p>
          The key idea is simple: <strong>your files never leave your device.</strong> Every tool
          runs in your web browser, using code that is downloaded to your computer when you open
          the page. The file you choose is read from your disk, processed in your browser&apos;s
          memory, and the result is downloaded straight back to you. There is no upload, no
          queue, and no copy kept anywhere.
        </p>
        <p>
          Two exceptions are stated on their tool pages: the Translate tool sends the text
          extracted from your PDF (not the file) to a free translation service, and the OCR tool
          loads its text-recognition engine from a CDN the first time you use it.
        </p>
        <H2>Honest limits</H2>
        <p>
          The tools are honest about their limits. Where a result is approximate — for example,
          compression that rebuilds pages as images, or a password that uses the basic 40-bit
          encryption level — the tool page says so, right where you use it.
        </p>
        <H2>Independent project</H2>
        <p>
          PDF World is an independent, original project. Its design, text and code were written
          for this site, and the code is released under the MIT License. It is not affiliated
          with, endorsed by, or connected to any other PDF tool provider.
        </p>
        <p>
          <Link href="/tools" className="font-semibold text-teal-700 hover:underline">
            Browse all tools →
          </Link>
        </p>
      </div>
    </div>
  );
}
