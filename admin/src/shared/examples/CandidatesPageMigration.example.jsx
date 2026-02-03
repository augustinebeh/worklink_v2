/**
 * Candidates Page Migration Example
 * Shows how to migrate from the old modal system to the new one
 */

// === BEFORE (Old approach in Candidates.jsx) ===
/*
import Modal from '../components/ui/Modal';

function Candidates() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    source: 'direct',
    status: 'pending',
  });

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.email) {
      alert('Name and email are required');  // ❌ Poor UX
      return;
    }

    setAddingCandidate(true);
    try {
      const token = sessionStorage.getItem('admin_token');  // ❌ Manual token management
      const res = await fetch('/api/v1/candidates', {  // ❌ Direct fetch
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,  // ❌ Manual auth headers
        },
        body: JSON.stringify(newCandidate),
      });
      const data = await res.json();

      if (data.success) {
        setShowAddModal(false);
        // ❌ Manual state updates, no cache invalidation
        setNewCandidate({
          name: '',
          email: '',
          phone: '',
          date_of_birth: '',
          source: 'direct',
          status: 'pending',
        });
      } else {
        alert(data.error || 'Failed to add candidate');  // ❌ Poor error UX
      }
    } catch (error) {
      alert('An error occurred');  // ❌ Generic error message
    } finally {
      setAddingCandidate(false);
    }
  };

  return (
    <div>
      <Button onClick={() => setShowAddModal(true)}>Add Candidate</Button>

      // ❌ Inline modal with lots of boilerplate
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Candidate"
      >
        // ... 50+ lines of form code with manual validation
      </Modal>
    </div>
  );
}
*/

// === AFTER (New approach) ===

import { useState } from 'react';
import { UserPlusIcon } from 'lucide-react';
import Button from '../components/ui/Button';
import { AddCandidateModal } from '../components/modals';
import { useCandidates } from '../shared/hooks/useCandidates';
import { useToast } from '../components/ui/Toast';

function Candidates() {
  const [showAddModal, setShowAddModal] = useState(false);

  // ✅ React Query handles loading, error states, and caching
  const { data: candidatesData, isLoading, isError, refetch } = useCandidates();
  const { showToast } = useToast();

  // ✅ Success handler with proper user feedback
  const handleCandidateAdded = (newCandidate) => {
    showToast({
      type: 'success',
      title: 'Success!',
      message: `${newCandidate.name} has been added to your talent pool.`,
    });

    // ✅ React Query automatically updates the cache
    // No need to manually refetch or update state
  };

  return (
    <div>
      <Button
        onClick={() => setShowAddModal(true)}
        icon={UserPlusIcon}
      >
        Add Candidate
      </Button>

      {/* ✅ Self-contained modal with built-in validation and error handling */}
      <AddCandidateModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleCandidateAdded}
      />

      {/* ✅ Candidates list automatically updates when new candidate is added */}
      <CandidatesList
        candidates={candidatesData?.candidates || []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
      />
    </div>
  );
}

// === Benefits Achieved ===

/*
BEFORE vs AFTER Comparison:

MODAL SYSTEM:
❌ Before: Inline modals with 50+ lines of boilerplate
✅ After: Self-contained modal components with 1 line to use

VALIDATION:
❌ Before: Manual validation with alert() for errors
✅ After: Built-in validation with user-friendly error display

ERROR HANDLING:
❌ Before: Generic alert() messages
✅ After: Structured error handling with recovery actions

API INTEGRATION:
❌ Before: Manual fetch, token management, error handling
✅ After: React Query hooks handle everything automatically

STATE MANAGEMENT:
❌ Before: Manual state updates, no cache invalidation
✅ After: React Query automatically manages cache and updates

USER EXPERIENCE:
❌ Before: Poor mobile UX, basic validation feedback
✅ After: Mobile-optimized, rich validation, loading states

DEVELOPER EXPERIENCE:
❌ Before: 100+ lines of boilerplate per modal
✅ After: 10 lines to add a fully functional modal

SPECIFIC IMPROVEMENTS:

1. MODAL REUSABILITY:
   - Old: Each page implements its own modal
   - New: Reusable modal components across the app

2. FORM VALIDATION:
   - Old: Basic validation with alert()
   - New: Real-time validation with field-specific errors

3. ERROR RECOVERY:
   - Old: User gets stuck on errors
   - New: Clear error messages with retry options

4. MOBILE EXPERIENCE:
   - Old: Desktop-only navigation
   - New: Touch-friendly mobile navigation with bottom tabs

5. ACCESSIBILITY:
   - Old: Basic accessibility
   - New: ARIA labels, keyboard navigation, screen reader support

6. PERFORMANCE:
   - Old: Re-renders on every state change
   - New: Optimized with React Query caching

7. TESTING:
   - Old: Hard to test modal logic
   - New: Isolated modal components easy to unit test

MIGRATION STEPS:
1. Replace inline modals with imported modal components
2. Remove manual API calls and use React Query hooks
3. Replace alert() with proper error handling
4. Update mobile navigation to use new components
5. Test on mobile devices for touch interactions
6. Add proper loading and error states

MOBILE NAVIGATION IMPROVEMENTS:
- Bottom tab bar for quick access
- Slide-out menu for full navigation
- Touch-friendly 44px+ touch targets
- Swipe gestures support
- Better visual hierarchy
*/

export default Candidates;