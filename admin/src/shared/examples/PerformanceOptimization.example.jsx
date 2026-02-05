/**
 * Performance Optimization Examples
 * Shows how to optimize React components for better performance
 */

import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';

// === 1. REACT.MEMO FOR PURE COMPONENTS ===

// ❌ Before: Component re-renders on every parent update
function CandidateCard({ candidate, onSelect }) {
  return (
    <div onClick={() => onSelect(candidate.id)}>
      <h3>{candidate.name}</h3>
      <p>{candidate.email}</p>
    </div>
  );
}

// ✅ After: Only re-renders when props change
const CandidateCard = memo(function CandidateCard({ candidate, onSelect }) {
  return (
    <div onClick={() => onSelect(candidate.id)}>
      <h3>{candidate.name}</h3>
      <p>{candidate.email}</p>
    </div>
  );
});

// === 2. USEMEMO FOR EXPENSIVE CALCULATIONS ===

// ❌ Before: Recalculates on every render
function CandidatesList({ candidates, searchQuery }) {
  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedCandidates = filteredCandidates.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div>
      {sortedCandidates.map(candidate => (
        <CandidateCard key={candidate.id} candidate={candidate} />
      ))}
    </div>
  );
}

// ✅ After: Only recalculates when dependencies change
function CandidatesList({ candidates, searchQuery }) {
  const sortedFilteredCandidates = useMemo(() => {
    const filtered = candidates.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [candidates, searchQuery]);

  return (
    <div>
      {sortedFilteredCandidates.map(candidate => (
        <CandidateCard key={candidate.id} candidate={candidate} />
      ))}
    </div>
  );
}

// === 3. USECALLBACK FOR STABLE FUNCTION REFERENCES ===

// ❌ Before: Creates new function on every render
function Dashboard() {
  const [candidates, setCandidates] = useState([]);

  const handleCandidateSelect = (id) => {
    console.log('Selected candidate:', id);
    // Navigate or update state
  };

  return (
    <CandidatesList
      candidates={candidates}
      onSelect={handleCandidateSelect} // New function every render!
    />
  );
}

// ✅ After: Stable function reference
function Dashboard() {
  const [candidates, setCandidates] = useState([]);

  const handleCandidateSelect = useCallback((id) => {
    console.log('Selected candidate:', id);
    // Navigate or update state
  }, []); // Dependencies array - empty means function never changes

  return (
    <CandidatesList
      candidates={candidates}
      onSelect={handleCandidateSelect} // Same function reference
    />
  );
}

// === 4. LAZY LOADING FOR CODE SPLITTING ===

// ❌ Before: All components loaded upfront
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import Jobs from './pages/Jobs';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/candidates" element={<Candidates />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

// ✅ After: Components loaded on demand
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Candidates = lazy(() => import('./pages/Candidates'));
const Jobs = lazy(() => import('./pages/Jobs'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<div className="animate-spin">Loading...</div>}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/candidates" element={<Candidates />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// === 5. REMOVE CONSOLE.LOG STATEMENTS ===

// ❌ Before: Debug statements everywhere
function useApiCall() {
  console.log('Making API call...'); // Remove this

  const { data, error } = useSWR('/api/data', fetcher);

  console.log('API response:', data); // Remove this
  console.log('API error:', error); // Remove this

  return { data, error };
}

// ✅ After: Clean production code
function useApiCall() {
  const { data, error } = useSWR('/api/data', fetcher);
  return { data, error };
}

// ✅ Alternative: Conditional logging
function useApiCall() {
  const { data, error } = useSWR('/api/data', fetcher);

  if (import.meta.env.DEV) {
    console.log('API response:', data);
    console.log('API error:', error);
  }

  return { data, error };
}

// === 6. OPTIMIZE CONTEXT PROVIDERS ===

// ❌ Before: Context value recreated every render
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const value = {
    user,
    loading,
    login: (email, password) => { /* login logic */ },
    logout: () => { /* logout logic */ },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ After: Stable context value
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback((email, password) => {
    // login logic
  }, []);

  const logout = useCallback(() => {
    // logout logic
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
  }), [user, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// === 7. VIRTUAL SCROLLING FOR LARGE LISTS ===

// ❌ Before: Render all 1000+ candidates
function CandidatesList({ candidates }) {
  return (
    <div>
      {candidates.map(candidate => (
        <CandidateCard key={candidate.id} candidate={candidate} />
      ))}
    </div>
  );
}

// ✅ After: Virtual scrolling (using react-window or similar)
import { FixedSizeList as List } from 'react-window';

function CandidatesList({ candidates }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <CandidateCard candidate={candidates[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={candidates.length}
      itemSize={80}
    >
      {Row}
    </List>
  );
}

// === 8. IMAGE OPTIMIZATION ===

// ❌ Before: Load full-size images
function Avatar({ user }) {
  return <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />;
}

// ✅ After: Optimized images with lazy loading
function Avatar({ user }) {
  return (
    <img
      src={user.avatar}
      alt={user.name}
      className="w-12 h-12 rounded-full"
      loading="lazy"
      // Use srcSet for different sizes
      srcSet={`${user.avatar_small} 48w, ${user.avatar_medium} 96w`}
      sizes="48px"
    />
  );
}

// === PERFORMANCE CHECKLIST ===

/*
✅ Wrap pure components with React.memo
✅ Use useMemo for expensive calculations
✅ Use useCallback for stable function references
✅ Implement code splitting with lazy loading
✅ Remove all console.log statements
✅ Optimize context providers
✅ Add virtual scrolling for large lists
✅ Optimize images with lazy loading and srcSet
✅ Use React Query for intelligent caching
✅ Minimize bundle size with tree shaking
✅ Add performance monitoring
✅ Optimize for mobile devices

REACT QUERY BENEFITS (Already Implemented):
- Intelligent background refetching
- Automatic caching and stale-while-revalidate
- Request deduplication
- Optimistic updates
- Garbage collection
- Network status handling

ADDITIONAL OPTIMIZATIONS:
- Use React DevTools Profiler to identify bottlenecks
- Monitor bundle size with webpack-bundle-analyzer
- Implement service worker for offline support
- Use CDN for static assets
- Enable gzip compression
- Add performance budgets to CI/CD
*/

export {
  CandidateCard,
  CandidatesList,
  Dashboard,
  AuthProvider,
  Avatar
};