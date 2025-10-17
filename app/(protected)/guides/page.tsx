"use client";

import { useState, useEffect } from "react";
import { FilterDemo } from "@/components/ui/filter-demo";
import {
  BookOpen,
  Search,
  BarChart3,
  Calculator,
  Lightbulb,
  ChevronRight,
  Clock,
  Star,
} from "lucide-react";

interface Guide {
  id: string;
  title: string;
  category: 'metrics' | 'formulas' | 'best-practices' | 'troubleshooting';
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: number;
  tags: string[];
  lastUpdated: string;
  featured: boolean;
}

interface GuidesResponse {
  success: boolean;
  data: {
    guides: Guide[];
    categories: {
      metrics: number;
      formulas: number;
      'best-practices': number;
      troubleshooting: number;
    };
    total_guides: number;
  };
  error?: string;
}

export default function GuidesPage() {
  const [guides, setGuides] = useState<GuidesResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/guides/list');
      const data = await response.json();

      if (data.success) {
        setGuides(data.data);
      } else {
        setError(data.error || 'Failed to fetch guides data');
      }
    } catch (err) {
      setError('Failed to fetch guides data');
      console.error('Guides fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'metrics': return <BarChart3 className="w-5 h-5" />;
      case 'formulas': return <Calculator className="w-5 h-5" />;
      case 'best-practices': return <Lightbulb className="w-5 h-5" />;
      case 'troubleshooting': return <BookOpen className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'metrics': return 'bg-blue-100 text-blue-800';
      case 'formulas': return 'bg-green-100 text-green-800';
      case 'best-practices': return 'bg-purple-100 text-purple-800';
      case 'troubleshooting': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-50';
      case 'intermediate': return 'text-yellow-600 bg-yellow-50';
      case 'advanced': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredGuides = guides?.guides.filter(guide => {
    const matchesSearch = guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guide.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center">
            <BookOpen className="w-5 h-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Guides</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!guides) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <BookOpen className="w-5 h-5 text-yellow-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">No Guides Available</h3>
              <p className="text-yellow-600">Guides will be available once content is added.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Guides & Education</h1>
        <p className="text-gray-600">Learn about metrics, formulas, and best practices for retention analytics</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Search & Filter Guides</h3>
            <span className="text-sm text-gray-500">Find guides by category, difficulty, or keywords</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search guides, formulas, or concepts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="metrics">Metrics</option>
              <option value="formulas">Formulas</option>
              <option value="best-practices">Best Practices</option>
              <option value="troubleshooting">Troubleshooting</option>
            </select>
          </div>
          
          <FilterDemo />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Guides</p>
              <p className="text-2xl font-semibold text-gray-900">{guides.total_guides}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Metrics</p>
              <p className="text-2xl font-semibold text-gray-900">{guides.categories.metrics}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calculator className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Formulas</p>
              <p className="text-2xl font-semibold text-gray-900">{guides.categories.formulas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Lightbulb className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Best Practices</p>
              <p className="text-2xl font-semibold text-gray-900">{guides.categories['best-practices']}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Guides */}
      {filteredGuides.filter(guide => guide.featured).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Featured Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.filter(guide => guide.featured).map((guide) => (
              <div key={guide.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm border border-blue-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(guide.category)}
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(guide.category)}`}>
                      {guide.category.replace('-', ' ')}
                    </span>
                  </div>
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{guide.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{guide.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded-full ${getDifficultyColor(guide.difficulty)}`}>
                      {guide.difficulty}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {guide.readTime} min
                    </span>
                  </div>
                  <button className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Read More
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Guides */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuides.map((guide) => (
            <div key={guide.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(guide.category)}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(guide.category)}`}>
                    {guide.category.replace('-', ' ')}
                  </span>
                </div>
                {guide.featured && <Star className="w-4 h-4 text-yellow-500" />}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{guide.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{guide.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {guide.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className={`px-2 py-1 rounded-full ${getDifficultyColor(guide.difficulty)}`}>
                    {guide.difficulty}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {guide.readTime} min
                  </span>
                </div>
                <button className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Read More
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No Results */}
      {filteredGuides.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No guides found</h3>
          <p className="text-gray-600">Try adjusting your search terms or filters.</p>
        </div>
      )}
    </div>
  );
}
