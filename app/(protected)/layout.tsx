import { HierarchicalSidebarLayout } from "@/components/ui/hierarchical-sidebar";

/**
 * Protected route group layout that wraps all protected pages
 * Provides hierarchical sidebar navigation with collapsible sections and main container for all protected routes
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HierarchicalSidebarLayout>{children}</HierarchicalSidebarLayout>;
}
