import { getCurrentUser } from '@/lib/supabase-auth';
import Link from 'next/link';
import { SignOutButton } from './components/SignOutButton';
import { MobileMenu } from './components/MobileMenu';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // If there's an error getting user, just render children
    // Middleware will handle redirects
    return <>{children}</>;
  }

  // If no user, just render children (for login page)
  // Middleware will handle redirects for other pages
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-12 sm:h-14">
            <div className="flex items-center flex-1 min-w-0 gap-2">
              {/* Mobile Menu Button */}
              <MobileMenu />
              
              <Link href="/admin" className="flex items-center px-2 sm:px-3 py-2 text-sm sm:text-base lg:text-lg font-semibold text-gray-900 hover:text-gray-700 truncate">
                <span className="hidden sm:inline">Panel de Administración</span>
                <span className="sm:hidden">Admin</span>
              </Link>
              <div className="hidden md:ml-4 lg:ml-6 md:flex md:space-x-4 lg:space-x-6">
                <Link
                  href="/admin"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-2 py-1 border-b-2 text-xs sm:text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/posts"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-2 py-1 border-b-2 text-xs sm:text-sm font-medium transition-colors"
                >
                  Posts
                </Link>
                <Link
                  href="/admin/comments"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-2 py-1 border-b-2 text-xs sm:text-sm font-medium transition-colors"
                >
                  Comentarios
                </Link>
                <Link
                  href="/admin/ai-agents"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-2 py-1 border-b-2 text-xs sm:text-sm font-medium transition-colors"
                >
                  Agentes IA
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className="hidden sm:inline text-xs sm:text-sm text-gray-600 truncate max-w-[120px] lg:max-w-none">
                {user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-4 lg:px-6">
        {children}
      </main>
    </div>
  );
}
