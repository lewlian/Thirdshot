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

// Enum types
export type UserRole = 'USER' | 'ADMIN';
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED' | 'NO_SHOW';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
export type PaymentMethod = 'PAYNOW' | 'CARD' | 'SAVED_CARD' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'GRABPAY' | 'ADMIN_OVERRIDE';
export type BlockReason = 'MAINTENANCE' | 'TOURNAMENT' | 'PRIVATE_EVENT' | 'OTHER';
export type BookingType = 'COURT_BOOKING' | 'CORPORATE_BOOKING' | 'PRIVATE_COACHING';

// Re-export custom types
export * from "./booking";
export * from "./court";
