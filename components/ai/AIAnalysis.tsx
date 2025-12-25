"use client";

import { useState } from "react";
import {
  Brain,
  RefreshCw,
  Copy,
  Download,
  Clock,
  ChevronDown,
  ChevronUp,
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

export function AIAnalysis({ filters = {}, cohorts = [], pageType, dataAvailable, loading }: AIAnalysisProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateInsights = async () => {
    if (loading) return;
    
    setLoading(true);
    setIsExpanded(true);
    
    try {
      // Generate insights based on current filters
      const geographyFilter = Array.isArray(filters.geography) ? filters.geography : [];
      const hasGeographyFilter = geographyFilter.length > 0;
      const geographyLabels = hasGeographyFilter 
        ? geographyFilter.map((g: string) => {
            const labels: Record<string, string> = {
              'uk': 'UK',
              'germany': 'Germany',
              'france': 'France',
              'spain': 'Spain',
              'emea': 'EMEA',
              'amer': 'AMER',
              'apac': 'APAC',
            };
            return labels[g] || g;
          }).join(', ')
        : 'all regions';

      // Simulate AI analysis with realistic insights based on cohort data and filters
      const mockInsights: AIInsight[] = [
        {
          id: '1',
          type: 'improvement',
          title: 'Revenue retention improved +12% QoQ',
          description: hasGeographyFilter 
            ? `Led by ${geographyLabels} showing strongest cohort performance`
            : 'Led by skincare and apparel categories showing strongest cohort performance',
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
          title: hasGeographyFilter 
            ? `${geographyLabels} cohorts compounding fastest`
            : 'UK and Germany cohorts compounding fastest',
          description: hasGeographyFilter
            ? `${geographyLabels} showing strong retention patterns with 15% YoY growth`
            : 'European expansion showing strong retention patterns with 15% YoY growth',
          metric: '15%',
          trend: 'up'
        },
        {
          id: '4',
          type: 'decline',
          title: hasGeographyFilter && geographyFilter.includes('spain')
            ? 'Spain shows declining repeat orders'
            : 'Some regions show declining repeat orders',
          description: 'Consider reviewing discount intensity and expanding replenishment campaigns',
          metric: '-8%',
          trend: 'down'
        },
        {
          id: '5',
          type: 'anomaly',
          title: 'Recent cohorts outperformed historical averages',
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

  // const getInsightIcon = (type: string, trend?: string) => {
  //   switch (type) {
  //     case 'improvement':
  //       return <TrendingUp className="w-4 h-4 text-green-600" />;
  //     case 'decline':
  //       return <TrendingDown className="w-4 h-4 text-red-600" />;
  //     case 'anomaly':
  //       return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
  //     default:
  //       return <CheckCircle className="w-4 h-4 text-blue-600" />;
  //   }
  // };

  // const getInsightColor = (type: string) => {
  //   switch (type) {
  //     case 'improvement':
  //       return 'border-green-200 bg-green-50';
  //     case 'decline':
  //       return 'border-red-200 bg-red-50';
  //     case 'anomaly':
  //       return 'border-yellow-200 bg-yellow-50';
  //     default:
  //       return 'border-blue-200 bg-blue-50';
  //   }
  // };

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

  const handleToggle = () => {
    if (!isExpanded && insights.length === 0) {
      // First click - generate insights
      generateInsights();
    } else {
      // Toggle expanded state
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-5">
      {/* Button Header - Always Visible */}
      <button
        onClick={handleToggle}
        disabled={loading}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">AI Analysis</p>
            {lastGenerated && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Last generated {lastGenerated.toLocaleTimeString()}
              </p>
            )}
            {!lastGenerated && !loading && (
              <p className="text-xs text-muted-foreground mt-0.5">Click to generate insights</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {loading ? (
            <div className="p-6 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-sm text-gray-600">Analysing latest cohort data...</span>
              </div>
            </div>
          ) : insights.length > 0 ? (
            <div className="p-6 space-y-4">
              {/* High-level Summary */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-800 leading-relaxed">
                  Revenue retention has shown strong improvement with a 12% quarter-over-quarter increase, 
                  driven primarily by high-value customer segments and successful European market expansion. 
                  While UK and Germany cohorts are performing exceptionally well, Spain requires attention 
                  due to declining repeat orders, suggesting a need for strategic discount and campaign adjustments.
                </p>
              </div>
              
              {/* Detailed Insights */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-3">Key Insights:</h4>
                <ul className="space-y-2">
                  {insights.map((insight) => (
                    <li key={insight.id} className="flex items-start">
                      <span className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3"></span>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{insight.title}:</span>
                        <span className="text-sm text-gray-700 ml-1">{insight.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard();
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportAsText();
                  }}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Export as text"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generateInsights();
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
