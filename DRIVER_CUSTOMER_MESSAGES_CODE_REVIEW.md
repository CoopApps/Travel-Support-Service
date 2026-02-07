# Driver Messages & Customer Messages - Code Review

## Files Reviewed
- `frontend/src/components/driver/MessagesModal.tsx` (650+ lines)
- `frontend/src/components/customer/CustomerMessagesModal.tsx` (650+ lines)

---

## Executive Summary

Both message modal components are nearly **identical in structure and functionality** with only minor differences in API service calls. The code is **well-structured** but has several issues:

### ✅ STRENGTHS
1. **Good state management** - Proper use of React hooks
2. **Clear separation of concerns** - Inbox vs Sent tabs, loading states
3. **Proper error handling** - Try/catch blocks with user feedback
4. **Good UX patterns** - Unread badges, read status tracking, relative time formatting
5. **Type safety** - Proper TypeScript interfaces defined
6. **Accessible forms** - Labels, required attributes, proper form submission

### ❌ ISSUES (Priority Order)

---

## CRITICAL ISSUES

### Issue #1: Massive Code Duplication
**Severity:** CRITICAL
**Lines Affected:** Entire file structure

**Problem:**
Both `MessagesModal.tsx` and `CustomerMessagesModal.tsx` are ~95% identical. The only differences are:
- Function names (`driverDashboardApi` vs `customerDashboardApi`)
- Component name
- Label text ("From Office" is same, "Sent to Office" is same)
- Interface name

**Current State:**
```typescript
// driver/MessagesModal.tsx
const data = await driverDashboardApi.getMessages(tenantId, driverId);
const data = await driverDashboardApi.getMessagesToOffice(tenantId, driverId);
await driverDashboardApi.sendMessageToOffice(tenantId, driverId, {...});
await driverDashboardApi.markMessageAsRead(tenantId, driverId, message.message_id);

// customer/CustomerMessagesModal.tsx
const data = await customerDashboardApi.getMessages(tenantId, customerId);
const data = await customerDashboardApi.getMessagesToOffice(tenantId, customerId);
await customerDashboardApi.sendMessageToOffice(tenantId, customerId, {...});
await customerDashboardApi.markMessageAsRead(tenantId, customerId, message.message_id);
```

**Recommended Solution:**
Create a single **generic `MessagesModal` component** with configurable service:

```typescript
interface MessagesModalProps {
  tenantId: number;
  entityId: number;
  entityType: 'driver' | 'customer';
  onClose: () => void;
}

function MessagesModal({ tenantId, entityId, entityType, onClose }: MessagesModalProps) {
  const api = entityType === 'driver' ? driverDashboardApi : customerDashboardApi;

  const loadMessages = async () => {
    const data = await api.getMessages(tenantId, entityId);
    setMessages(data.messages || []);
  };
  // ... rest of component
}
```

**Benefits:**
- Reduces code by ~600 lines
- Single source of truth for maintenance
- Easier to add features (apply to both automatically)
- Consistent bug fixes

---

## HIGH PRIORITY ISSUES

### Issue #2: Hardcoded Colors (HIGH)
**Severity:** HIGH
**Lines Affected:** 147-182, 354-356, 240-241, 270-273

**Current Problems:**
```typescript
// Hardcoded colors
case 'high': return '#dc3545';    // Should be var(--color-danger-500)
case 'medium': return '#fd7e14';  // Should be var(--color-warning-500)
case 'low': return '#6c757d';     // Should be var(--color-gray-600)

// In JSX
background: '#dc3545',  // Badge for unread count
background: '#fd7e14',  // Badge for pending count
```

**Issues:**
- Colors don't respect design system
- Won't update with theme changes
- Inconsistent with other modules
- Magic numbers in code

**Fix Required:**
```typescript
// Use design system colors
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'var(--color-danger-500)';
    case 'medium': return 'var(--color-warning-500)';
    case 'low': return 'var(--color-gray-600)';
    default: return 'var(--color-gray-600)';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'var(--color-warning-500)';
    case 'read': return 'var(--color-brand-500)';
    case 'resolved': return 'var(--color-success-500)';
    default: return 'var(--color-gray-600)';
  }
};
```

---

### Issue #3: Inconsistent Error Message Handling
**Severity:** HIGH
**Lines Affected:** 64, 77, 102 (Driver) vs 63-64, 77-78, 103-104 (Customer)

**Driver Version:**
```typescript
catch (err: any) {
  setError(typeof err.response?.data?.error === 'string'
    ? err.response.data.error
    : (err.response?.data?.error?.message || err.message || 'Failed to load messages')
  );
}
```

**Customer Version:**
```typescript
catch (err: any) {
  const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load messages';
  setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
}
```

**Problem:** Inconsistent error path handling:
- Driver checks: `error`, `error.message`
- Customer checks: `message`, `error`, then stringifies

**Fix:** Standardize to single error handling utility:
```typescript
const getErrorMessage = (err: any, fallback: string): string => {
  if (typeof err === 'string') return err;
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
};

// Usage
catch (err: any) {
  setError(getErrorMessage(err, 'Failed to load messages'));
}
```

---

### Issue #4: CSS-in-JS vs CSS Classes
**Severity:** HIGH
**Lines Affected:** 185-287, 291-295, 315-385, 404-442

**Current Problem:**
All styling is inline with hardcoded values:
```typescript
style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: '1rem'
}}
```

**Issues:**
- 150+ lines of inline styles
- No CSS variables used
- Hardcoded colors, spacing, shadows
- Difficult to maintain
- Breaks design system consistency

**Recommended Fix:**
Create `MessagesModal.css`:
```css
.messages-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: var(--space-4);
}

.messages-modal-content {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.messages-modal-header {
  padding: var(--space-6) var(--space-6) 0;
  background: var(--surface-card);
}

.messages-modal-tabs {
  display: flex;
  border-bottom: 2px solid var(--surface-border);
}

.messages-modal-tab {
  padding: var(--space-3) var(--space-6);
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-default);
}

.messages-modal-tab.active {
  color: var(--color-brand-500);
  border-bottom-color: var(--color-brand-500);
}

/* ... more classes ... */
```

---

### Issue #5: Relative Time Calculation Could Be Wrong
**Severity:** MEDIUM-HIGH
**Lines Affected:** 123-143

**Current Code:**
```typescript
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
};
```

**Problems:**
1. If a message is sent at 23:00 and it's now 01:00 next day, `diffDays` = 0 but it should show "Yesterday" behavior
2. No timezone consideration - could show wrong times for distributed teams
3. No handling for future dates (would show "-X minutes ago")
4. Duplicate code - appears in both files identically

**Better Solution:**
```typescript
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime()); // Ensure non-negative

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};
```

---

## MEDIUM PRIORITY ISSUES

### Issue #6: Missing Validation on Send
**Severity:** MEDIUM
**Lines Affected:** 83-105

**Current Code:**
```typescript
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  setSending(true);
  setError('');

  try {
    await driverDashboardApi.sendMessageToOffice(tenantId, driverId, {
      subject,
      message: messageContent,
    });
    // ...
```

**Missing Validations:**
1. Subject/message length limits not checked
2. Empty message not prevented (HTML form validation only)
3. No character limit warnings shown to user
4. No trimming of whitespace

**Fix:**
```typescript
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate
  const trimmedSubject = subject.trim();
  const trimmedMessage = messageContent.trim();

  if (!trimmedSubject || trimmedSubject.length < 3) {
    setError('Subject must be at least 3 characters');
    return;
  }

  if (!trimmedMessage || trimmedMessage.length < 10) {
    setError('Message must be at least 10 characters');
    return;
  }

  if (trimmedMessage.length > 5000) {
    setError('Message cannot exceed 5000 characters');
    return;
  }

  setSending(true);
  setError('');

  try {
    await driverDashboardApi.sendMessageToOffice(tenantId, driverId, {
      subject: trimmedSubject,
      message: trimmedMessage,
    });
    // ...
```

---

### Issue #7: No Loading State When Switching Tabs
**Severity:** MEDIUM
**Lines Affected:** 49-54

**Current Problem:**
When user clicks "Sent to Office" tab, loading state shows but it's reusing the previous message list until data loads, causing UI flicker.

**Current Code:**
```typescript
useEffect(() => {
  if (activeTab === 'inbox') {
    loadMessages();
  } else {
    loadMessagesToOffice();
  }
}, [tenantId, driverId, activeTab]);
```

**Better Approach:**
```typescript
useEffect(() => {
  if (activeTab === 'inbox') {
    loadMessages();
  } else {
    loadMessagesToOffice();
  }
}, [tenantId, driverId, activeTab]);

// Clear messages on tab change to prevent stale data
useEffect(() => {
  setMessages([]);
  setMessagesToOffice([]);
}, [activeTab]);
```

---

### Issue #8: Badge Count Not Updated on Message Click
**Severity:** MEDIUM
**Lines Affected:** 108-121

**Current Code:**
```typescript
const handleMessageClick = async (message: Message) => {
  if (!message.read) {
    try {
      await driverDashboardApi.markMessageAsRead(tenantId, driverId, message.message_id);
      setMessages(messages.map(m =>
        m.message_id === message.message_id ? { ...m, read: true } : m
      ));
    } catch {
      // Error handled silently
    }
  }
};
```

**Problem:**
The unread badge count (`unreadCount`) is calculated but doesn't re-render immediately when message is marked as read. Also, error is silently ignored - user doesn't know if the action failed.

**Fix:**
```typescript
const handleMessageClick = async (message: Message) => {
  if (!message.read) {
    try {
      await driverDashboardApi.markMessageAsRead(tenantId, driverId, message.message_id);
      // Optimistically update UI
      setMessages(prevMessages =>
        prevMessages.map(m =>
          m.message_id === message.message_id ? { ...m, read: true } : m
        )
      );
    } catch (err: any) {
      // Notify user of failure
      setError(getErrorMessage(err, 'Failed to mark message as read'));
      // Could add a toast notification here
    }
  }
};
```

---

### Issue #9: No Confirmation on Form Cancel
**Severity:** MEDIUM-LOW
**Lines Affected:** 392-400

**Current Code:**
```typescript
{!showSendForm && (
  <button className="btn btn-primary" onClick={() => setShowSendForm(true)}>
    + New Message to Office
  </button>
)}
```

**Problem:**
If user starts typing a message and accidentally clicks outside or navigates away, all text is lost without warning.

**Suggested Fix:**
```typescript
const handleCancelSendForm = () => {
  if (subject.trim() || messageContent.trim()) {
    if (!window.confirm('Discard unsaved message?')) {
      return;
    }
  }
  setShowSendForm(false);
  setSubject('');
  setMessageContent('');
  setError('');
};
```

---

### Issue #10: No Accessibility Features
**Severity:** MEDIUM-LOW

**Missing Features:**
1. Modal doesn't trap focus (can tab out of modal)
2. No close button with icon
3. Escape key doesn't close modal
4. No ARIA labels on custom tabs
5. Badge elements not announced to screen readers

**Add:**
```typescript
// Handle Escape key
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);

// Update JSX
<button
  aria-label="Close messages"
  onClick={onClose}
  style={{ /* close button styling */ }}
>
  ✕
</button>

// Add to tabs
<button
  role="tab"
  aria-selected={activeTab === 'inbox'}
  aria-controls="inbox-panel"
  onClick={() => setActiveTab('inbox')}
  // ... styles ...
>
  From Office {unreadCount > 0 && <span aria-label={`${unreadCount} unread`}>{unreadCount}</span>}
</button>
```

---

## LOW PRIORITY ISSUES

### Issue #11: No Pagination for Long Message Lists
**Severity:** LOW
**Lines Affected:** 315-385

**Current Problem:**
If a user has hundreds of messages, they all load at once. No pagination or virtualization.

**Recommendation:**
- Add pagination (20 messages per page)
- Or use infinite scroll
- Or use react-window for virtualization

---

### Issue #12: Manual Inline Styles Instead of CSS
**Severity:** LOW-MEDIUM
**Throughout the file**

The component uses extensive inline styles that should be in CSS:
- Modal backdrop (lines 185-196)
- Modal content (lines 198-206)
- Header (lines 209-211)
- Title (line 214)
- Tabs (lines 220-287)
- Messages list (lines 291-294)
- Message items (lines 317-328, 329-337, 338-348, etc.)

Should move to `MessagesModal.css` using CSS variables and classes.

---

### Issue #13: Missing PropTypes or TypeScript Interface Export
**Severity:** LOW
**Lines Affected:** 4-27

Consider exporting types for better reusability:
```typescript
export interface Message {
  message_id: number;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  read: boolean;
}

export interface MessageToOffice {
  message_id: number;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  read_at?: string;
  resolved_at?: string;
  admin_response?: string;
}

export interface MessagesModalProps {
  tenantId: number;
  entityId: number;
  onClose: () => void;
}
```

---

## SUMMARY TABLE

| Issue | Severity | Type | Files | Fix Complexity |
|-------|----------|------|-------|-----------------|
| Code Duplication | CRITICAL | Architecture | Both | High |
| Hardcoded Colors | HIGH | Style | Both | Low |
| Inconsistent Error Handling | HIGH | Code Quality | Both | Medium |
| CSS-in-JS Style | HIGH | Style | Both | High |
| Date Formatting Issues | MEDIUM-HIGH | Logic | Both | Low |
| Missing Validation | MEDIUM | Logic | Both | Low |
| Tab Loading States | MEDIUM | UX | Both | Low |
| Badge Update | MEDIUM | UX | Both | Low |
| Unsaved Changes Warn | MEDIUM | UX | Both | Low |
| Accessibility | MEDIUM | UX | Both | High |
| Pagination | LOW | Feature | Both | High |
| Manual Styles | LOW-MEDIUM | Style | Both | High |
| Type Exports | LOW | Code Quality | Both | Low |

---

## RECOMMENDATIONS (Priority Order)

### PHASE 1 - CRITICAL (Do First)
1. **Merge into single component** - Create generic `MessagesModal.tsx` with `entityType` prop
2. **Remove code duplication** - Delete `CustomerMessagesModal.tsx`

### PHASE 2 - HIGH (Do Next)
3. **Extract CSS** - Create `MessagesModal.css` with all styling
4. **Replace hardcoded colors** - Use design system variables
5. **Standardize error handling** - Create error utility function

### PHASE 3 - MEDIUM (Improve)
6. **Fix date formatting** - Improve relative time calculation
7. **Add validation** - Minimum/maximum character checks
8. **Improve UX** - Tab switching, message read updates

### PHASE 4 - LOW (Polish)
9. **Add accessibility** - ARIA labels, keyboard support
10. **Add pagination** - For long message lists

---

## Overall Code Quality: 7/10

**Strengths:**
- Good state management
- Proper error handling
- Clear component structure
- Type safe

**Weaknesses:**
- Massive duplication
- All inline styling
- Hardcoded values
- Poor accessibility
- Missing UX polish

**Time to Fix All Issues:** ~8-12 hours
