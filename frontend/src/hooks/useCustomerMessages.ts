import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import {
  Customer,
  TenantMessage,
  CustomerMessage,
  ViewMode,
  RecipientType,
  DeliveryMethod,
  Priority,
} from '../types/messages.types';

interface UseCustomerMessagesProps {
  tenantId: number | null;
  userId: number | null;
}

export const useCustomerMessages = ({ tenantId, userId }: UseCustomerMessagesProps) => {
  // Data state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sentMessages, setSentMessages] = useState<TenantMessage[]>([]);
  const [inboxMessages, setInboxMessages] = useState<CustomerMessage[]>([]);
  const [allMessages, setAllMessages] = useState<TenantMessage[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showMessageForm, setShowMessageForm] = useState(false);

  // Message form state
  const [recipientType, setRecipientType] = useState<RecipientType>('single');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [expiresAt, setExpiresAt] = useState('');
  const [sending, setSending] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('in-app');
  const [emailSubject, setEmailSubject] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Reply state
  const [replyingToMessage, setReplyingToMessage] = useState<CustomerMessage | null>(null);
  const [replyTitle, setReplyTitle] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);

  // Load customers on mount
  useEffect(() => {
    if (tenantId) {
      loadCustomers();
      loadAllMessagesGlobal();
    }
  }, [tenantId]);

  // Reload messages when view mode changes
  useEffect(() => {
    if (tenantId) {
      loadAllMessagesGlobal();
    }
  }, [tenantId, viewMode]);

  // Load messages for selected customer
  useEffect(() => {
    if (selectedCustomer && tenantId) {
      loadMessagesForCustomer(selectedCustomer.customer_id);
    }
  }, [selectedCustomer, tenantId, viewMode]);

  const loadCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/tenants/${tenantId}/customers`, {
        params: {
          limit: 1000,
          archived: 'false'
        }
      });
      setCustomers(response.data.customers || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load customers';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const loadAllMessagesGlobal = async () => {
    setLoadingMessages(true);
    try {
      if (viewMode === 'inbox') {
        const response = await apiClient.get(`/tenants/${tenantId}/messages/from-customers`);
        setInboxMessages(response.data.messages || []);
      } else {
        const response = await apiClient.get(`/tenants/${tenantId}/messages`);
        let messages = response.data.messages || [];

        if (viewMode === 'drafts') {
          messages = messages.filter((msg: TenantMessage) => msg.is_draft);
        } else if (viewMode === 'scheduled') {
          messages = messages.filter((msg: TenantMessage) => msg.status === 'scheduled');
        } else if (viewMode === 'sent') {
          messages = messages.filter((msg: TenantMessage) => !msg.is_draft && msg.status !== 'scheduled');
        }

        setAllMessages(messages);
      }
    } catch {
      // Error loading messages handled silently
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMessagesForCustomer = async (customerId: number) => {
    setLoadingMessages(true);
    try {
      if (viewMode === 'inbox') {
        const response = await apiClient.get(`/tenants/${tenantId}/messages/from-customers`);
        const allMessages = response.data.messages || [];
        const customerMessages = allMessages.filter((msg: CustomerMessage) =>
          msg.customer_id === customerId
        );
        setInboxMessages(customerMessages);
      } else {
        const response = await apiClient.get(`/tenants/${tenantId}/messages`, {
          params: {
            customerId,
            status: viewMode === 'drafts' ? 'draft' : viewMode === 'scheduled' ? 'scheduled' : undefined
          }
        });
        let messages = response.data.messages || [];

        if (viewMode === 'drafts') {
          messages = messages.filter((msg: TenantMessage) => msg.is_draft);
        } else if (viewMode === 'scheduled') {
          messages = messages.filter((msg: TenantMessage) => msg.status === 'scheduled');
        } else if (viewMode === 'sent') {
          messages = messages.filter((msg: TenantMessage) => !msg.is_draft && msg.status !== 'scheduled');
        }

        setSentMessages(messages);
      }
    } catch {
      // Error loading messages handled silently
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();

    if (recipientType === 'single' && !selectedCustomer) {
      setError('Please select a customer');
      return;
    }
    if (recipientType === 'multiple' && selectedCustomerIds.length === 0) {
      setError('Please select at least one customer');
      return;
    }

    setSending(true);
    setError('');

    try {
      const messageData = {
        title,
        message: messageContent,
        priority,
        expiresAt: expiresAt || null,
        deliveryMethod,
        emailSubject: deliveryMethod === 'email' || deliveryMethod === 'both' ? emailSubject : undefined,
        smsBody: deliveryMethod === 'sms' || deliveryMethod === 'both' ? smsBody : undefined,
        isDraft: saveAsDraft,
        scheduledAt: scheduledAt || null,
      };

      if (recipientType === 'all') {
        await apiClient.post(`/tenants/${tenantId}/messages`, {
          targetCustomerId: null,
          ...messageData,
        });
      } else if (recipientType === 'multiple') {
        for (const customerId of selectedCustomerIds) {
          await apiClient.post(`/tenants/${tenantId}/messages`, {
            targetCustomerId: customerId,
            ...messageData,
          });
        }
      } else {
        await apiClient.post(`/tenants/${tenantId}/messages`, {
          targetCustomerId: selectedCustomer!.customer_id,
          ...messageData,
        });
      }

      // Reset form
      resetMessageForm();

      if (selectedCustomer) {
        loadMessagesForCustomer(selectedCustomer.customer_id);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to send message';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      await apiClient.put(`/tenants/${tenantId}/messages/from-customers/${messageId}/mark-read`);
      if (selectedCustomer) {
        loadMessagesForCustomer(selectedCustomer.customer_id);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to mark as read';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyingToMessage || !replyTitle || !replyContent) {
      setError('Title and message are required');
      return;
    }

    setReplying(true);
    setError('');

    try {
      await apiClient.post(`/tenants/${tenantId}/messages/from-customers/${replyingToMessage.message_id}/reply`, {
        title: replyTitle,
        message: replyContent,
      });

      setReplyingToMessage(null);
      setReplyTitle('');
      setReplyContent('');

      if (selectedCustomer) {
        loadMessagesForCustomer(selectedCustomer.customer_id);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to send reply';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setReplying(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await apiClient.delete(`/tenants/${tenantId}/messages/${messageId}`);
      if (selectedCustomer) {
        loadMessagesForCustomer(selectedCustomer.customer_id);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete message';
      alert(errorMessage);
    }
  };

  const handleToggleCustomerSelection = (customerId: number) => {
    setSelectedCustomerIds(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedCustomer(null);
  };

  const resetMessageForm = () => {
    setTitle('');
    setMessageContent('');
    setPriority('normal');
    setExpiresAt('');
    setDeliveryMethod('in-app');
    setEmailSubject('');
    setSmsBody('');
    setScheduledAt('');
    setShowMessageForm(false);
    setRecipientType('single');
    setSelectedCustomerIds([]);
  };

  const handleCancelCompose = () => {
    resetMessageForm();
  };

  const handleStartReply = (message: CustomerMessage) => {
    setReplyingToMessage(message);
    setReplyTitle(`Re: ${message.subject}`);
  };

  return {
    // Data
    customers,
    selectedCustomer,
    sentMessages,
    inboxMessages,
    allMessages,

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
    setViewMode: handleViewModeChange,
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
    loadCustomers,
  };
};

export default useCustomerMessages;
