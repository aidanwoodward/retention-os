import { CleanSidebarLayout } from "@/components/ui/clean-sidebar";

/**
 * Protected route group layout that wraps all protected pages
 * Provides clean, hover-based sidebar navigation and main container for all protected routes
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CleanSidebarLayout>{children}</CleanSidebarLayout>;
}
