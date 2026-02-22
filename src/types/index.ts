import type { Database } from './database';

// Row types from Supabase
export type User = Database['public']['Tables']['users']['Row'];
export type Court = Database['public']['Tables']['courts']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type BookingSlot = Database['public']['Tables']['booking_slots']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type CourtBlock = Database['public']['Tables']['court_blocks']['Row'];
export type AdminAuditLog = Database['public']['Tables']['admin_audit_logs']['Row'];
export type AppSetting = Database['public']['Tables']['app_settings']['Row'];
export type SavedPaymentMethod = Database['public']['Tables']['saved_payment_methods']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type MembershipTier = Database['public']['Tables']['membership_tiers']['Row'];
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row'];
export type MembershipSubscription = Database['public']['Tables']['membership_subscriptions']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type Guest = Database['public']['Tables']['guests']['Row'];
export type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row'];
export type EmailTemplate = Database['public']['Tables']['email_templates']['Row'];
export type EmailLog = Database['public']['Tables']['email_log']['Row'];

// Enum types
export type UserRole = 'USER' | 'ADMIN';
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED' | 'NO_SHOW';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
export type PaymentMethod = 'PAYNOW' | 'CARD' | 'SAVED_CARD' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'GRABPAY' | 'ADMIN_OVERRIDE';
export type BlockReason = 'MAINTENANCE' | 'TOURNAMENT' | 'PRIVATE_EVENT' | 'OTHER';
export type BookingType = 'COURT_BOOKING' | 'CORPORATE_BOOKING' | 'PRIVATE_COACHING';
export type OrgRole = 'owner' | 'admin' | 'staff' | 'member' | 'guest';
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'suspended';
export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly' | 'one-time';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'paused';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void';

// Re-export custom types
export * from "./booking";
export * from "./court";
