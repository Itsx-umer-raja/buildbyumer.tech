import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact PDF World — Report a Bug or Suggest a Tool",
  description:
    "Found a bug in a PDF World tool or have an idea for a new one? Tell us what happened and which tool you were using. Please never send documents or passwords.",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    url: "/contact",
    siteName: "PDF World",
    title: "Contact PDF World — Report a Bug or Suggest a Tool | PDF World",
    description:
      "Found a bug in a PDF World tool or have an idea for a new one? Tell us what happened and which tool you were using. Please never send documents or passwords.",
    images: [{ url: "/pdf-world-icon-512.png", width: 512, height: 512, alt: "PDF World logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact PDF World — Report a Bug or Suggest a Tool | PDF World",
    description:
      "Found a bug in a PDF World tool or have an idea for a new one? Tell us what happened and which tool you were using. Please never send documents or passwords.",
    images: ["/pdf-world-icon-512.png"],
  },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">Contact</h1>
      <div className="mt-6 space-y-5 leading-relaxed text-slate-700">
        <p>
          Found a bug, or have a suggestion for a tool? We would like to hear about it.
        </p>
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4">
          <p className="text-sm font-semibold text-teal-900">Report it on GitHub</p>
          <p className="mt-1 text-sm text-teal-900">
            There is no email mailbox for this site yet, so the way to reach us is to open an
            issue on GitHub — it is public, so please never include documents or passwords.
          </p>
          <p className="mt-3">
            <a
              href="https://github.com/Itsx-umer-raja/buildbyumer.tech/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Open an issue on GitHub
            </a>
          </p>
          <p className="mt-2 text-sm text-teal-800">
            New issue on the buildbyumer.tech repository — you will need a free GitHub account.
            A working contact email will be added here if one is ever set up.
          </p>
        </div>
        <h2 className="pt-2 font-display text-2xl font-bold text-slate-900">How to report a problem</h2>
        <p>
          When reporting a problem, it helps to say which tool you were using, what kind of
          file you tried (for example, a 10-page PDF), and what happened instead of what you
          expected. Please never send us your documents or your passwords.
        </p>
      </div>
    </div>
  );
}
