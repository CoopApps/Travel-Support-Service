/**
 * Message Type Definitions
 * Shared types for messaging components
 */

export interface TenantMessage {
  message_id: number;
  title: string;
  message: string;
  priority: string;
  created_at: string;
  created_by: number;
  created_by_name: string;
  target_customer_id: number | null;
  customer_name: string | null;
  expires_at: string | null;
  read_count: number;
  total_recipients: number;
  delivery_method: 'in-app' | 'email' | 'sms' | 'both';
  email_subject?: string;
  sms_body?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'failed';
  is_draft: boolean;
  scheduled_at?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_reason?: string;
}

export interface CustomerMessage {
  message_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  created_at: string;
  read_at: string | null;
  read_by: number | null;
  read_by_name: string | null;
  reply_message_id: number | null;
  reply_title: string | null;
}

export interface Customer {
  customer_id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export type ViewMode = 'all' | 'inbox' | 'sent' | 'drafts' | 'scheduled';
export type RecipientType = 'single' | 'multiple' | 'all';
export type DeliveryMethod = 'in-app' | 'email' | 'sms' | 'both';
export type Priority = 'normal' | 'high' | 'urgent';
