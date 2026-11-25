import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — PageForge",
  description: "How to get in touch with PageForge.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">Contact</h1>
      <div className="mt-6 space-y-5 leading-relaxed text-slate-700">
        <p>
          Found a bug, or have a suggestion for a tool? We would like to hear about it.
        </p>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">Email (placeholder)</p>
          <p className="mt-1 font-mono text-sm text-amber-900">contact@example.invalid</p>
          <p className="mt-2 text-sm text-amber-800">
            This is a placeholder address, not a real mailbox — a real contact email has not
            been set up for this site yet. Please do not send mail here; it will not be
            received. A working contact address will replace this placeholder when one is
            arranged.
          </p>
        </div>
        <p>
          When reporting a problem, it helps to say which tool you were using, what kind of
          file you tried (for example, a 10-page PDF), and what happened instead of what you
          expected. Please never send us your documents or your passwords.
        </p>
      </div>
    </div>
  );
}
