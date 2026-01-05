"use client";

import { ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";

interface ComingSoonProps {
  title: string;
  description: string;
  bullets: string[];
  area?: string;
}

export function ComingSoon({ title, description, bullets, area }: ComingSoonProps) {
  const feedbackUrl = area ? `/feedback?area=${encodeURIComponent(area)}` : "/feedback";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-lg text-gray-600">{description}</p>
        </div>

        <div className="mb-8 rounded-2xl bg-gray-50 p-8 text-left">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h2>
          <ul className="space-y-3">
            {bullets.map((bullet, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-3 mt-1 flex-shrink-0 text-blue-600">•</span>
                <span className="text-gray-700">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center">
          <Link
            href={feedbackUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            Share Feedback
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

