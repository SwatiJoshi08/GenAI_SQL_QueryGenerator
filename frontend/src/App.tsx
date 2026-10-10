import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { QueryGenerator } from './pages/QueryGenerator';
import { SqlStudio } from './pages/SqlStudio';
import { HistoryPage } from './pages/HistoryPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen flex flex-col bg-amber-50 text-gray-900 font-sans">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/generator" element={<QueryGenerator />} />
            <Route path="/studio" element={<SqlStudio />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>GenAI SQL Query Generator &amp; Execution Engine &bull; Enterprise Grade</span>
            <span className="font-mono text-[11px]">Backend Port: 3001 | Frontend: 5173</span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
