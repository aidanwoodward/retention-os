"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  RefreshCw,
  Copy,
  Download,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface AIAnalysisProps {
  filters: Record<string, unknown>;
  cohorts: unknown[];
  onRegenerate?: () => void;
}

interface AIInsight {
  id: string;
  type: 'improvement' | 'decline' | 'anomaly' | 'neutral';
  title: string;
  description: string;
  metric?: string;
  trend?: 'up' | 'down' | 'stable';
}

export function AIAnalysis({ filters, cohorts }: AIAnalysisProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const generateInsights = async () => {
    setLoading(true);
    try {
      // Simulate AI analysis with realistic insights based on cohort data
      const mockInsights: AIInsight[] = [
        {
          id: '1',
          type: 'improvement',
          title: 'Revenue retention improved +12% QoQ',
          description: 'Led by skincare and apparel categories showing strongest cohort performance',
          metric: '+12%',
          trend: 'up'
        },
        {
          id: '2',
          type: 'improvement',
          title: 'High-value customers contributed 64% of retained revenue',
          description: 'Up from 59% in prior quarter, indicating successful premium customer acquisition',
          metric: '64%',
          trend: 'up'
        },
        {
          id: '3',
          type: 'improvement',
          title: 'UK and Germany cohorts compounding fastest',
          description: 'European expansion showing strong retention patterns with 15% YoY growth',
          metric: '15%',
          trend: 'up'
        },
        {
          id: '4',
          type: 'decline',
          title: 'Spain shows declining repeat orders',
          description: 'Consider reviewing discount intensity and expanding replenishment campaigns',
          metric: '-8%',
          trend: 'down'
        },
        {
          id: '5',
          type: 'anomaly',
          title: 'Cohort Mar-24 outperformed all previous cohorts',
          description: 'Day-90 revenue per customer +22% vs historical average',
          metric: '+22%',
          trend: 'up'
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setInsights(mockInsights);
      setLastGenerated(new Date());
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateInsights();
  }, [filters, cohorts]);

  const getInsightIcon = (type: string, trend?: string) => {
    switch (type) {
      case 'improvement':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decline':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'improvement':
        return 'border-green-200 bg-green-50';
      case 'decline':
        return 'border-red-200 bg-red-50';
      case 'anomaly':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const copyToClipboard = async () => {
    const text = insights.map(insight => 
      `${insight.title}: ${insight.description}`
    ).join('\n\n');
    
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const exportAsText = () => {
    const text = insights.map(insight => 
      `${insight.title}: ${insight.description}`
    ).join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-analysis.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Analysis</h2>
              <p className="text-sm text-gray-600">Automated insights from the latest cohort data</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            
            {/* Actions */}
            <button
              onClick={copyToClipboard}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={exportAsText}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export as text"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={generateInsights}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
        </div>
        
        {/* Timestamp */}
        {lastGenerated && (
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            Last generated {lastGenerated.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center">
              <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mr-3" />
              <span className="text-gray-600">Analysing latest cohort data...</span>
            </div>
          </div>
        ) : insights.length > 0 ? (
          <div className="space-y-4">
            {/* High-level Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <p className="text-gray-800 leading-relaxed">
                Revenue retention has shown strong improvement with a 12% quarter-over-quarter increase, 
                driven primarily by high-value customer segments and successful European market expansion. 
                While UK and Germany cohorts are performing exceptionally well, Spain requires attention 
                due to declining repeat orders, suggesting a need for strategic discount and campaign adjustments.
              </p>
            </div>
            
            {/* Detailed Insights */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Key Insights:</h4>
              <ul className="space-y-2">
                {insights.map((insight) => (
                  <li key={insight.id} className="flex items-start">
                    <span className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3"></span>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{insight.title}:</span>
                      <span className="text-gray-700 ml-1">{insight.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Generating insights based on your latest data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
