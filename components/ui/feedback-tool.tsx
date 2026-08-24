"use client";

import { useMemo, useState } from "react";
import { Mail, Star, MessageSquare, Bug, Lightbulb } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeedbackData {
  type: "general" | "bug" | "feature" | "improvement";
  rating: number;
  message: string;
  email?: string;
}

const FEEDBACK_TYPES = [
  { id: "general", label: "General Feedback", icon: MessageSquare, color: "text-blue-600" },
  { id: "bug", label: "Bug Report", icon: Bug, color: "text-red-600" },
  { id: "feature", label: "Feature Request", icon: Lightbulb, color: "text-green-600" },
  { id: "improvement", label: "Improvement", icon: Star, color: "text-purple-600" },
] as const;

function buildFeedbackMailto(feedback: FeedbackData): string {
  const subject = encodeURIComponent(`RetentionOS feedback: ${feedback.type}`);
  const lines = [
    `Type: ${feedback.type}`,
    feedback.rating > 0 ? `Rating: ${feedback.rating}/5` : null,
    feedback.email?.trim() ? `Reply-to: ${feedback.email.trim()}` : null,
    "",
    feedback.message.trim(),
  ].filter((line): line is string => line !== null);

  return `mailto:support@retention-os.com?subject=${subject}&body=${encodeURIComponent(lines.join("\n"))}`;
}

export function FeedbackTool() {
  const [feedback, setFeedback] = useState<FeedbackData>({
    type: "general",
    rating: 0,
    message: "",
    email: "",
  });

  const mailtoHref = useMemo(() => buildFeedbackMailto(feedback), [feedback]);
  const canSend = feedback.message.trim().length > 0;

  const handleRatingClick = (rating: number) => {
    setFeedback((prev) => ({ ...prev, rating }));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Share Your Feedback
        </CardTitle>
        <CardDescription>
          Draft your note here, then send it by email. In-app submission is not connected in this MVP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <FieldLabel className="text-sm font-medium text-gray-700 mb-3 block">
            What type of feedback is this?
          </FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFeedback((prev) => ({ ...prev, type: type.id }))}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    feedback.type === type.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${type.color} mb-1`} />
                  <div className="text-xs font-medium text-gray-700">{type.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel className="text-sm font-medium text-gray-700 mb-3 block">
            How would you rate your experience?
          </FieldLabel>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRatingClick(rating)}
                className={`p-1 transition-colors ${
                  rating <= feedback.rating
                    ? "text-yellow-500"
                    : "text-gray-300 hover:text-yellow-400"
                }`}
              >
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
          </div>
        </div>

        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="feedback-message">Your Feedback</FieldLabel>
              <Textarea
                id="feedback-message"
                placeholder="Tell us what's on your mind..."
                rows={4}
                value={feedback.message}
                onChange={(e) => setFeedback((prev) => ({ ...prev, message: e.target.value }))}
                className="resize-none"
              />
              <FieldDescription>
                Be specific about your experience, suggestions, or issues
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="feedback-email">Email (Optional)</FieldLabel>
              <input
                id="feedback-email"
                type="email"
                placeholder="your@email.com"
                value={feedback.email}
                onChange={(e) => setFeedback((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <FieldDescription>
                Included in the email draft if you want a reply
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FieldSet>

        <Button asChild={canSend} disabled={!canSend} className="w-full">
          {canSend ? (
            <a href={mailtoHref}>
              <Mail className="w-4 h-4 mr-2" />
              Email support
            </a>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Email support
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Opens your email client with a draft to{" "}
          <a href="mailto:support@retention-os.com" className="text-blue-600 hover:underline">
            support@retention-os.com
          </a>
          . Nothing is submitted inside the app.
        </p>
      </CardContent>
    </Card>
  );
}
