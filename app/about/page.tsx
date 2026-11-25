import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — PageForge",
  description: "What PageForge is, and why its PDF tools run entirely in your browser.",
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
      <div className="mt-6 space-y-5 leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <Shell title="About PageForge">
      <p>
        PageForge is a small collection of everyday PDF tools: merge, split, compress, convert,
        rotate, organize, watermark, number, protect and unlock. It was built for people who
        need to get a PDF task done quickly, without creating an account or handing their
        documents to a server.
      </p>
      <p>
        The key idea is simple: <strong>your files never leave your device.</strong> Every tool
        runs in your web browser, using code that is downloaded to your computer when you open
        the page. The file you choose is read from your disk, processed in your browser&apos;s
        memory, and the result is downloaded straight back to you. There is no upload, no
        queue, and no copy kept anywhere.
      </p>
      <p>
        PageForge is an independent, original project. Its design, text and code were written
        for this site, and the code is released under the MIT License. It is not affiliated
        with, endorsed by, or connected to any other PDF tool provider.
      </p>
      <p>
        The tools are honest about their limits. Where a result is approximate — for example,
        compression that rebuilds pages as images, or a password that uses the basic 40-bit
        encryption level — the tool page says so, right where you use it.
      </p>
      <p>
        <Link href="/#tools" className="font-semibold text-teal-700 hover:underline">
          Browse all tools →
        </Link>
      </p>
    </Shell>
  );
}
