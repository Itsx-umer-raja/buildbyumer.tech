import type { Metadata } from "next";
import { ResumeBuilder } from "@/components/resume/resume-builder";

export const metadata: Metadata = {
  title: "Free Resume Builder — PageForge",
  description:
    "Build a professional resume in your browser: four original templates including an ATS-friendly one, live preview, PDF and Word export. Your details never leave your device.",
};

export default function ResumePage() {
  return <ResumeBuilder />;
}
