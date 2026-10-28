import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from '@components/Layout';
import { Spinner } from '@components/UI';
import { Overview } from './pages/Overview';
import { RoomOccupancy } from './pages/RoomOccupancy';
import { Attendance } from './pages/Attendance';
import { Employees } from './pages/Employees';
import { Terminal } from './pages/Terminal';
import { Analytics } from './pages/Analytics';
import { History } from './pages/History';
import { Emergency } from './pages/Emergency';
import { SmartBuilding } from './pages/SmartBuilding';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

const LoadingFallback = () => (
  <div className="loading-fallback">
    <Spinner size="lg" />
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainLayout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/rooms" element={<RoomOccupancy />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/terminal" element={<Terminal />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/history" element={<History />} />
              <Route path="/emergency" element={<Emergency />} />
              <Route path="/smart-building" element={<SmartBuilding />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
          },
          success: {
            iconTheme: {
              primary: 'var(--success)',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--error)',
              secondary: 'white',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
