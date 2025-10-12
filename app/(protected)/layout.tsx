import Header from "@/app/components/Header";

/**
 * Protected route group layout that wraps all protected pages
 * Provides Header component and main container for /dashboard and /connect/* routes
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50">
        {children}
      </main>
    </>
  );
}
