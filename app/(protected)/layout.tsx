import SidebarLayout from "@/components/ui/sidebar-layout";

/**
 * Protected route group layout that wraps all protected pages
 * Provides premium sidebar navigation and main container for all protected routes
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
