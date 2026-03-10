/**
 * Message Helper Utilities
 * Shared utility functions for message components
 */

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent': return '#dc3545';
    case 'high': return '#fd7e14';
    default: return '#6c757d';
  }
};

export const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'urgent': return 'Urgent';
    case 'high': return 'Important';
    default: return 'Info';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'unread': return '#dc3545';
    case 'read': return '#0d6efd';
    case 'replied': return '#198754';
    default: return '#6c757d';
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'unread': return 'Unread';
    case 'read': return 'Read';
    case 'replied': return 'Replied';
    default: return status;
  }
};

export const getDeliveryStatusColor = (status: string): string => {
  switch (status) {
    case 'draft': return '#6c757d';
    case 'scheduled': return '#0dcaf0';
    case 'sending': return '#ffc107';
    case 'sent': return '#0d6efd';
    case 'delivered': return '#198754';
    case 'failed': return '#dc3545';
    default: return '#6c757d';
  }
};

export const getDeliveryStatusLabel = (status: string): string => {
  switch (status) {
    case 'draft': return 'Draft';
    case 'scheduled': return 'Scheduled';
    case 'sending': return 'Sending';
    case 'sent': return 'Sent';
    case 'delivered': return 'Delivered';
    case 'failed': return 'Failed';
    default: return status;
  }
};

export const getDeliveryMethodLabel = (method: string): string => {
  switch (method) {
    case 'in-app': return 'In-App';
    case 'email': return 'Email';
    case 'sms': return 'SMS';
    case 'both': return 'Email + SMS';
    default: return method;
  }
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
