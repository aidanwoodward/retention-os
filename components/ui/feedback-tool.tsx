"use client";

import { useState } from "react";
import { Send, Star, MessageSquare, Bug, Lightbulb, CheckCircle } from "lucide-react";
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
  type: 'general' | 'bug' | 'feature' | 'improvement';
  rating: number;
  message: string;
  email?: string;
}

export function FeedbackTool() {
  const [feedback, setFeedback] = useState<FeedbackData>({
    type: 'general',
    rating: 0,
    message: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const feedbackTypes = [
    { id: 'general', label: 'General Feedback', icon: MessageSquare, color: 'text-blue-600' },
    { id: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-600' },
    { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'text-green-600' },
    { id: 'improvement', label: 'Improvement', icon: Star, color: 'text-purple-600' }
  ];

  const handleSubmit = async () => {
    if (!feedback.message.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would typically send to your feedback API
      console.log('Feedback submitted:', feedback);
      
      setIsSubmitted(true);
      setFeedback({ type: 'general', rating: 0, message: '', email: '' });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClick = (rating: number) => {
    setFeedback(prev => ({ ...prev, rating }));
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank You!</h3>
          <p className="text-gray-600 mb-4">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
          <Button 
            onClick={() => setIsSubmitted(false)}
            variant="outline"
            className="w-full"
          >
            Submit Another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Share Your Feedback
        </CardTitle>
        <CardDescription>
          Help us improve Retention OS with your thoughts and suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Feedback Type Selection */}
        <div>
          <FieldLabel className="text-sm font-medium text-gray-700 mb-3 block">
            What type of feedback is this?
          </FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {feedbackTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setFeedback(prev => ({ ...prev, type: type.id as any }))}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    feedback.type === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${type.color} mb-1`} />
                  <div className="text-xs font-medium text-gray-700">{type.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rating */}
        <div>
          <FieldLabel className="text-sm font-medium text-gray-700 mb-3 block">
            How would you rate your experience?
          </FieldLabel>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRatingClick(rating)}
                className={`p-1 transition-colors ${
                  rating <= feedback.rating
                    ? 'text-yellow-500'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
              >
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
          </div>
          {feedback.rating > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              {feedback.rating === 1 && "Poor"}
              {feedback.rating === 2 && "Fair"}
              {feedback.rating === 3 && "Good"}
              {feedback.rating === 4 && "Very Good"}
              {feedback.rating === 5 && "Excellent"}
            </p>
          )}
        </div>

        {/* Feedback Message */}
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="feedback-message">Your Feedback</FieldLabel>
              <Textarea
                id="feedback-message"
                placeholder="Tell us what's on your mind..."
                rows={4}
                value={feedback.message}
                onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                className="resize-none"
              />
              <FieldDescription>
                Be specific about your experience, suggestions, or issues
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FieldSet>

        {/* Email (Optional) */}
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="feedback-email">Email (Optional)</FieldLabel>
              <input
                id="feedback-email"
                type="email"
                placeholder="your@email.com"
                value={feedback.email}
                onChange={(e) => setFeedback(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <FieldDescription>
                We'll only use this to follow up if needed
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FieldSet>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!feedback.message.trim() || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </>
          )}
        </Button>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 text-center">
          Your feedback is anonymous unless you provide an email. We use this data to improve our product.
        </p>
      </CardContent>
    </Card>
  );
}
