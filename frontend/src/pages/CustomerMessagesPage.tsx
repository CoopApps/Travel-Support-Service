import React from 'react';
import { useTenant } from '../context/TenantContext';
import { useAuthStore } from '../store/authStore';
import { useCustomerMessages } from '../hooks/useCustomerMessages';
import { CustomerList } from '../components/messages/CustomerList';
import { MessageFilters } from '../components/messages/MessageFilters';
import { MessageThread } from '../components/messages/MessageThread';
import { MessageComposer } from '../components/messages/MessageComposer';

/**
 * Customer Messages Page - Refactored
 *
 * Conversation-style messaging system for tenant-customer communication
 * Supports in-app, email, and SMS delivery methods
 */
function CustomerMessagesPage() {
  const { tenant } = useTenant();
  const user = useAuthStore((state) => state.user);

  const {
    // Data
    customers,
    selectedCustomer,
    sentMessages,
    inboxMessages,

    // UI state
    loading,
    loadingMessages,
    error,
    searchTerm,
    viewMode,
    showMessageForm,

    // Message form state
    recipientType,
    selectedCustomerIds,
    title,
    messageContent,
    priority,
    expiresAt,
    sending,
    deliveryMethod,
    emailSubject,
    smsBody,
    scheduledAt,

    // Reply state
    replyingToMessage,
    replyTitle,
    replyContent,
    replying,

    // Actions
    setSelectedCustomer,
    setSearchTerm,
    setViewMode,
    setShowMessageForm,
    setRecipientType,
    setTitle,
    setMessageContent,
    setPriority,
    setExpiresAt,
    setDeliveryMethod,
    setEmailSubject,
    setSmsBody,
    setScheduledAt,
    setReplyingToMessage,
    setReplyTitle,
    setReplyContent,
    handleSendMessage,
    handleMarkAsRead,
    handleReply,
    handleDeleteMessage,
    handleToggleCustomerSelection,
    handleCancelCompose,
    handleStartReply,
  } = useCustomerMessages({
    tenantId: tenant?.tenant_id || null,
    userId: user?.id || null,
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
      {/* Left Sidebar - Customer List */}
      <CustomerList
        customers={customers}
        selectedCustomer={selectedCustomer}
        selectedCustomerIds={selectedCustomerIds}
        searchTerm={searchTerm}
        loading={loading}
        showMessageForm={showMessageForm}
        recipientType={recipientType}
        onCustomerSelect={setSelectedCustomer}
        onCustomerToggle={handleToggleCustomerSelection}
        onSearchChange={setSearchTerm}
      />

      {/* Right Side - Message Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white' }}>
        {/* Header & Tabs */}
        <MessageFilters
          viewMode={viewMode}
          inboxCount={inboxMessages.length}
          onViewModeChange={setViewMode}
          onNewMessageClick={() => setShowMessageForm(!showMessageForm)}
          showMessageForm={showMessageForm}
        />

        {/* Error Message */}
        {error && (
          <div className="alert alert-error" style={{ margin: '1rem' }}>
            {error}
          </div>
        )}

        {/* Message Composer Form */}
        {showMessageForm && (
          <MessageComposer
            customers={customers}
            selectedCustomer={selectedCustomer}
            selectedCustomerIds={selectedCustomerIds}
            recipientType={recipientType}
            title={title}
            messageContent={messageContent}
            priority={priority}
            expiresAt={expiresAt}
            deliveryMethod={deliveryMethod}
            emailSubject={emailSubject}
            smsBody={smsBody}
            scheduledAt={scheduledAt}
            sending={sending}
            onRecipientTypeChange={(type) => {
              setRecipientType(type);
              if (type !== 'multiple') {
                handleToggleCustomerSelection(-1); // Clear selections
              }
            }}
            onTitleChange={setTitle}
            onMessageChange={setMessageContent}
            onPriorityChange={setPriority}
            onExpiresAtChange={setExpiresAt}
            onDeliveryMethodChange={setDeliveryMethod}
            onEmailSubjectChange={setEmailSubject}
            onSmsBodyChange={setSmsBody}
            onScheduledAtChange={setScheduledAt}
            onSend={handleSendMessage}
            onCancel={handleCancelCompose}
          />
        )}

        {/* Message Thread Display */}
        {!showMessageForm && (
          <MessageThread
            selectedCustomer={selectedCustomer}
            viewMode={viewMode}
            sentMessages={sentMessages}
            inboxMessages={inboxMessages}
            loadingMessages={loadingMessages}
            onMarkAsRead={handleMarkAsRead}
            onReply={handleStartReply}
            onDelete={handleDeleteMessage}
          />
        )}
      </div>

      {/* Reply Modal */}
      {replyingToMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>Reply to {replyingToMessage.customer_name}</h3>

            <div style={{
              padding: '1rem',
              background: 'var(--gray-50)',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              borderLeft: '4px solid var(--gray-400)',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
                Original Message:
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
                <strong>{replyingToMessage.subject}</strong>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)' }}>
                {replyingToMessage.message}
              </p>
            </div>

            <form onSubmit={handleReply}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Reply Title:
                </label>
                <input
                  type="text"
                  value={replyTitle}
                  onChange={(e) => setReplyTitle(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Your Reply:
                </label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={5}
                  className="form-control"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={replying}
                >
                  {replying ? 'Sending...' : 'Send Reply'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setReplyingToMessage(null);
                    setReplyTitle('');
                    setReplyContent('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerMessagesPage;
