import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getAccountId } from "@/lib/database";

// =============================================================================
// TYPES
// =============================================================================

interface GuideData {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// =============================================================================
// API ENDPOINT
// =============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    
    const cookieStore = await cookies();
    
    // Get the current user's session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountId = await getAccountId(session.user.id);
    if (!accountId) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Mock guides data
    const mockGuides: GuideData[] = [
      {
        id: "guide_1",
        title: "Understanding Customer Retention",
        category: "Retention",
        description: "Learn the fundamentals of customer retention and why it matters for your business.",
        content: "Customer retention is the ability of a company to retain its customers over time...",
        difficulty: "beginner",
        estimated_time: "10 minutes",
        tags: ["retention", "basics", "customers"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "guide_2",
        title: "RFM Analysis Deep Dive",
        category: "Analytics",
        description: "Master RFM (Recency, Frequency, Monetary) analysis to segment your customers effectively.",
        content: "RFM analysis is a powerful technique for customer segmentation...",
        difficulty: "intermediate",
        estimated_time: "25 minutes",
        tags: ["rfm", "segmentation", "analytics"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: "guide_3",
        title: "Advanced Cohort Analysis",
        category: "Analytics",
        description: "Learn how to perform sophisticated cohort analysis to understand customer behavior patterns.",
        content: "Cohort analysis helps you understand how different groups of customers behave over time...",
        difficulty: "advanced",
        estimated_time: "45 minutes",
        tags: ["cohorts", "advanced", "behavior"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Filter guides based on query parameters
    let filteredGuides = mockGuides;
    
    if (category) {
      filteredGuides = filteredGuides.filter(guide => guide.category.toLowerCase() === category.toLowerCase());
    }
    
    if (difficulty) {
      filteredGuides = filteredGuides.filter(guide => guide.difficulty === difficulty);
    }

    console.log(`Guides fetched successfully: ${filteredGuides.length} records`);

    // Set cache headers for performance
    const response = NextResponse.json({
      success: true,
      data: {
        guides: filteredGuides,
        total_guides: filteredGuides.length,
        categories: [...new Set(mockGuides.map(g => g.category))],
        difficulties: [...new Set(mockGuides.map(g => g.difficulty))]
      }
    });

    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Error in guides list API:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}