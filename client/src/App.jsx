import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ShelfProvider } from './context/ShelfContext';
import AppLayout from './components/layout/AppLayout';
import { Bow } from './components/decor/Decor';

const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Signup })));
const Home = lazy(() => import('./pages/Home'));
const Bookshelf = lazy(() => import('./pages/Bookshelf'));
const Discover = lazy(() => import('./pages/Discover'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Community = lazy(() => import('./pages/Community'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

function FullPageLoader() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Bow className="h-12 w-16 animate-sway opacity-70" />
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <ShelfProvider>
              <Suspense fallback={<FullPageLoader />}>
                <Routes>
                  <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                  <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
                  <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                    <Route index element={<Home />} />
                    <Route path="shelf" element={<Bookshelf />} />
                    <Route path="discover" element={<Discover />} />
                    <Route path="book/:olId" element={<BookDetail />} />
                    <Route path="community" element={<Community />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="u/:username" element={<Profile />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </Suspense>
            </ShelfProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
