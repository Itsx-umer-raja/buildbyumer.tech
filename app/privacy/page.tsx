import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | PDF World — Your Files Stay on Your Device",
  description:
    "PDF World's privacy policy: every tool runs in your browser, so your files are never uploaded, stored or seen by us. No accounts and no document tracking.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
    siteName: "PDF World",
    title: "Privacy Policy | PDF World — Your Files Stay on Your Device | PDF World",
    description:
      "PDF World's privacy policy: every tool runs in your browser, so your files are never uploaded, stored or seen by us. No accounts and no document tracking.",
    images: [{ url: "/pdf-world-icon-512.png", width: 512, height: 512, alt: "PDF World logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | PDF World — Your Files Stay on Your Device | PDF World",
    description:
      "PDF World's privacy policy: every tool runs in your browser, so your files are never uploaded, stored or seen by us. No accounts and no document tracking.",
    images: ["/pdf-world-icon-512.png"],
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">Privacy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 24 November 2026</p>
      <div className="mt-6 space-y-5 leading-relaxed text-slate-700">
        <h2 className="pt-2 font-display text-2xl font-bold text-slate-900">Your files stay on your device</h2>
        <p>
          <strong>Your files stay on your device.</strong> Every PDF World tool runs entirely
          in your web browser. When you choose a file, it is read from your disk and processed
          in your browser&apos;s memory. It is never uploaded to a server, never sent to any
          third party, and never stored by us — because we never receive it.
        </p>
        <p>
          Two exceptions are stated on their tool pages: the Translate tool sends the text
          extracted from your PDF (not the file itself) to the free MyMemory translation
          service, and the OCR tool loads its text-recognition engine from a CDN the first
          time you use it.
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900">No accounts</h2>
        <p>
          <strong>No accounts.</strong> PDF World does not ask you to create an account, sign
          in, or give us your name or email address to use the tools.
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900">No tracking of your documents</h2>
        <p>
          <strong>No ads are shown on this site yet.</strong> The site loads the
          Google AdSense script and carries an AdSense account verification tag, so
          Google may set cookies as described in Google&apos;s own privacy policy; no
          ad units are placed yet, so no advertisements display. It does not run
          analytics code that inspects your files, and it does not embed
          third-party trackers in the tools. Apart from loading the site itself, the
          AdSense script, and the two exceptions above (Translate and OCR), the tools
          make no network requests with your files.
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900">Passwords</h2>
        <p>
          <strong>Passwords.</strong> If you use the Protect tool, the password you type is
          used only in your browser to encrypt the file, and it is never sent anywhere. If
          you use the Unlock tool, the password you type is used only in your browser to open
          your file. We cannot recover a password you forget.
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900">Contact</h2>
        <p>
          <strong>Contact.</strong> There is no email address for this site yet. To report a
          problem or suggest a tool, please open an issue on the project&apos;s GitHub
          repository (linked from the contact page). Anything you post there is public,
          so never include documents or passwords.
        </p>
        <h2 className="font-display text-2xl font-bold text-slate-900">Changes</h2>
        <p>
          <strong>Changes.</strong> If this policy changes, the updated version will be posted
          on this page with a new date.
        </p>
      </div>
    </div>
  );
}
