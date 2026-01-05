"use client";

import { MessageSquare, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

interface RoadmapItem {
  name: string;
  description?: string;
  status: "live" | "coming-soon";
  category?: string;
  area?: string;
}

interface FeedbackCard {
  question: string;
  area: string;
}

const liveItems: RoadmapItem[] = [
  // Executive
  {
    name: "Home Overview",
    status: "live",
    category: "Executive",
    area: "executive",
  },
  {
    name: "Data Health",
    status: "live",
    category: "Executive",
    area: "data-health",
  },
  // Revenue Formation
  {
    name: "Revenue Cohorts",
    status: "live",
    category: "Revenue Formation",
    area: "revenue-cohorts",
  },
  // Customer Retention
  {
    name: "Retention Curves",
    status: "live",
    category: "Customer Retention",
    area: "retention-curves",
  },
  {
    name: "Repeat Purchase Rates",
    status: "live",
    category: "Customer Retention",
    area: "repeat-rates",
  },
  // Value Growth
  {
    name: "LTV Curves",
    status: "live",
    category: "Value Growth",
    area: "ltv-curves",
  },
  // Platform
  {
    name: "Integrations",
    status: "live",
    category: "Platform",
    area: "integrations",
  },
  {
    name: "Exports",
    status: "live",
    category: "Platform",
    area: "exports",
  },
  {
    name: "User Settings",
    status: "live",
    category: "Platform",
    area: "user-settings",
  },
  {
    name: "Support & Feedback",
    status: "live",
    category: "Platform",
    area: "support-feedback",
  },
];

const comingSoonItems: RoadmapItem[] = [
  // Customer Intelligence
  {
    name: "Customer Composition",
    description: "Understand who your customers are and how your base is evolving over time.",
    status: "coming-soon",
    category: "Customer Intelligence",
    area: "customer-composition",
  },
  {
    name: "Segments",
    description: "Build and activate segments that move the needle on retention and value.",
    status: "coming-soon",
    category: "Customer Intelligence",
    area: "segments",
  },
  {
    name: "Customer Profiles",
    description: "See the full picture of each customer's journey to inform personalized outreach.",
    status: "coming-soon",
    category: "Customer Intelligence",
    area: "customer-profiles",
  },
  // Product Insights
  {
    name: "Product Performance",
    description: "Identify which products drive retention and which need attention.",
    status: "coming-soon",
    category: "Product Insights",
    area: "product-performance",
  },
  {
    name: "Product Concentration",
    description: "Spot over-reliance on single products before it becomes a risk.",
    status: "coming-soon",
    category: "Product Insights",
    area: "product-concentration",
  },
  {
    name: "Discount Impact",
    description: "Know whether discounts are building loyalty or eroding value.",
    status: "coming-soon",
    category: "Product Insights",
    area: "discount-impact",
  },
  // Activation
  {
    name: "Lifecycle Opportunities",
    description: "Find the right moment to re-engage customers before they churn.",
    status: "coming-soon",
    category: "Activation",
    area: "lifecycle-opportunities",
  },
  {
    name: "Campaign Sync",
    description: "Connect retention insights directly to your marketing channels.",
    status: "coming-soon",
    category: "Activation",
    area: "campaign-sync",
  },
];

const feedbackCards: FeedbackCard[] = [
  {
    question: "What question do you still have to answer outside RetentionOS?",
    area: "missing-insights",
  },
  {
    question: "Where do you feel blind when diagnosing retention or revenue changes?",
    area: "missing-insights",
  },
  {
    question: "What decision still feels risky or unclear with the data available?",
    area: "missing-insights",
  },
  {
    question: "What do you export to Excel that you wish lived here?",
    area: "missing-insights",
  },
];

const statusConfig = {
  live: {
    label: "Live",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  "coming-soon": {
    label: "Coming Soon",
    icon: Clock,
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
};

export default function RoadmapPage() {
  const renderSection = (title: string, items: RoadmapItem[], description: string, isCompact = false) => {
    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
      const category = item.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, RoadmapItem[]>);

    const cardPadding = isCompact ? "p-4" : "p-6";
    const cardGap = isCompact ? "gap-3" : "gap-4";
    const sectionMargin = isCompact ? "mb-8" : "mb-12";
    const categoryMargin = isCompact ? "mb-6" : "mb-8";

    return (
      <div className={sectionMargin}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category} className={categoryMargin}>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">{category}</h3>
            <div className={`grid ${cardGap} md:grid-cols-2 lg:grid-cols-3`}>
              {categoryItems.map((item) => {
                const config = statusConfig[item.status];
                const Icon = config.icon;
                const feedbackUrl = item.area ? `/feedback?area=${encodeURIComponent(item.area)}` : "/feedback";
                const showFeedback = item.status === "coming-soon";

                return (
                  <div
                    key={item.name}
                    className={`bg-white rounded-xl border border-gray-200 ${cardPadding} hover:shadow-md transition-shadow`}
                  >
                    <div className={`flex items-start justify-between ${isCompact ? "mb-2" : "mb-3"}`}>
                      <h4 className="text-lg font-semibold text-gray-900">{item.name}</h4>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    {item.description && (
                      <p className={`text-sm text-gray-600 ${showFeedback ? "mb-4" : ""}`}>{item.description}</p>
                    )}
                    {showFeedback && (
                      <Link
                        href={feedbackUrl}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-4"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Share feedback
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFeedbackSection = () => (
    <div className="mb-12 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl border border-blue-100/50 p-8 md:p-10">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">What&apos;s still missing?</h2>
        <p className="text-lg text-gray-700 font-medium">
          Tell us where RetentionOS still leaves you uncertain or forces you to look elsewhere.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {feedbackCards.map((card, index) => {
          const feedbackUrl = `/feedback?area=${encodeURIComponent(card.area)}`;
          return (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <p className="text-sm text-gray-900 mb-4 font-medium">{card.question}</p>
              <Link
                href={feedbackUrl}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <MessageSquare className="w-4 h-4" />
                Share feedback
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Product Roadmap</h1>
        <p className="text-lg text-gray-600 max-w-3xl">
          Our product roadmap shows what&apos;s live today and what&apos;s coming soon. Your feedback helps shape our priorities.
        </p>
      </div>

      {renderSection(
        "Live",
        liveItems,
        "Core retention and value analysis you can use today across cohorts, curves, and LTV.",
        true
      )}

      {renderSection(
        "Coming Soon",
        comingSoonItems,
        "The next layer: customer, product, and activation intelligence that turns insight into action."
      )}

      {renderFeedbackSection()}
    </div>
  );
}

