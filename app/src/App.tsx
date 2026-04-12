import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { fetchPlan } from './api';
import type { PlanResponse } from '../shared/types';

function DayPlaceholder() {
  const { phaseId, weekN, daySlug } = useParams<{
    phaseId: string;
    weekN: string;
    daySlug: string;
  }>();
  const dayId = `${phaseId}/week-${weekN}/${daySlug}`;
  return (
    <div style={{ padding: '1.5rem' }}>
      <code style={{ fontSize: '0.9rem', color: '#666' }}>{dayId}</code>
      <p style={{ color: '#999', marginTop: '0.5rem' }}>
        Day rendering coming in Phase 2.
      </p>
    </div>
  );
}

function Dashboard() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>iOS Tutorial</h1>
      <p style={{ color: '#666' }}>Select a day from the sidebar to get started.</p>
    </div>
  );
}

function AppInner() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlan()
      .then((data) => { setPlan(data); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div
        style={{
          width: 320,
          minWidth: 320,
          borderRight: '1px solid #ddd',
          overflowY: 'auto',
          background: '#fafafa',
        }}
      >
        {loading && <p style={{ padding: '1rem', color: '#999' }}>Loading…</p>}
        {error && <p style={{ padding: '1rem', color: 'red' }}>Error: {error}</p>}
        {plan && <Sidebar phases={plan.phases} />}
      </div>

      {/* Main pane */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/phase/:phaseId/week/:weekN/day/:daySlug"
            element={<DayPlaceholder />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
