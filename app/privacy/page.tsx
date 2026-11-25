import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — PageForge",
  description: "How PageForge handles your files and your privacy.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">Privacy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 24 November 2026</p>
      <div className="mt-6 space-y-5 leading-relaxed text-slate-700">
        <p>
          <strong>Your files stay on your device.</strong> Every PageForge tool runs entirely
          in your web browser. When you choose a file, it is read from your disk and processed
          in your browser&apos;s memory. It is never uploaded to a server, never sent to any
          third party, and never stored by us — because we never receive it.
        </p>
        <p>
          <strong>No accounts.</strong> PageForge does not ask you to create an account, sign
          in, or give us your name or email address to use the tools.
        </p>
        <p>
          <strong>No analytics or tracking of your documents.</strong> This site does not run
          advertising or analytics code that inspects your files, and it does not embed
          third-party trackers in the tools. The only network requests the tools make are the
          ones your browser makes to load the site itself.
        </p>
        <p>
          <strong>Passwords.</strong> If you use the Protect tool, the password you type is
          used only in your browser to encrypt the file, and it is never sent anywhere. If
          you use the Unlock tool, the password you type is used only in your browser to open
          your file. We cannot recover a password you forget.
        </p>
        <p>
          <strong>Contact.</strong> If you email us using the address on the contact page,
          your message is handled like any email: we will see the address you send from and
          the contents of your message, and we will only use them to reply to you.
        </p>
        <p>
          <strong>Changes.</strong> If this policy changes, the updated version will be posted
          on this page with a new date.
        </p>
      </div>
    </div>
  );
}
