import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

import { ThemeProvider } from './context/ThemeContext';
import useAuthStore from './store/useAuthStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TraceSocketProvider from './context/TraceSocketProvider';
import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient();

function App() {
  const { initialize, isInitialized } = useAuthStore();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TraceSocketProvider>
        <ThemeProvider>
          <BrowserRouter>
            <ErrorBoundary message="A critical UI error occurred and the application needs to be refreshed.">
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </ThemeProvider>
      </TraceSocketProvider>
    </QueryClientProvider>
  );
}

export default App;
