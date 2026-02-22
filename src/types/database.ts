export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          email: string | null
          phone: string | null
          website: string | null
          address: string | null
          city: string | null
          country: string
          timezone: string
          primary_color: string
          booking_window_days: number
          slot_duration_minutes: number
          max_consecutive_slots: number
          payment_timeout_minutes: number
          currency: string
          allow_guest_bookings: boolean
          guest_to_member_threshold: number
          payment_provider: string
          payment_api_key_encrypted: string | null
          payment_salt_encrypted: string | null
          plan: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          country?: string
          timezone?: string
          primary_color?: string
          booking_window_days?: number
          slot_duration_minutes?: number
          max_consecutive_slots?: number
          payment_timeout_minutes?: number
          currency?: string
          allow_guest_bookings?: boolean
          guest_to_member_threshold?: number
          payment_provider?: string
          payment_api_key_encrypted?: string | null
          payment_salt_encrypted?: string | null
          plan?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          address?: string | null
          city?: string | null
          country?: string
          timezone?: string
          primary_color?: string
          booking_window_days?: number
          slot_duration_minutes?: number
          max_consecutive_slots?: number
          payment_timeout_minutes?: number
          currency?: string
          allow_guest_bookings?: boolean
          guest_to_member_threshold?: number
          payment_provider?: string
          payment_api_key_encrypted?: string | null
          payment_salt_encrypted?: string | null
          plan?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      membership_tiers: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          price_cents: number
          billing_period: string
          booking_discount_percent: number
          max_advance_booking_days: number | null
          max_bookings_per_week: number | null
          can_book_peak_hours: boolean
          priority_booking: boolean
          guest_passes_per_month: number
          sort_order: number
          is_active: boolean
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          price_cents?: number
          billing_period?: string
          booking_discount_percent?: number
          max_advance_booking_days?: number | null
          max_bookings_per_week?: number | null
          can_book_peak_hours?: boolean
          priority_booking?: boolean
          guest_passes_per_month?: number
          sort_order?: number
          is_active?: boolean
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          price_cents?: number
          billing_period?: string
          booking_discount_percent?: number
          max_advance_booking_days?: number | null
          max_bookings_per_week?: number | null
          can_book_peak_hours?: boolean
          priority_booking?: boolean
          guest_passes_per_month?: number
          sort_order?: number
          is_active?: boolean
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          membership_tier_id: string | null
          membership_start_date: string | null
          membership_end_date: string | null
          membership_status: string
          joined_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          membership_tier_id?: string | null
          membership_start_date?: string | null
          membership_end_date?: string | null
          membership_status?: string
          joined_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          membership_tier_id?: string | null
          membership_start_date?: string | null
          membership_end_date?: string | null
          membership_status?: string
          joined_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_membership_tier_id_fkey"
            columns: ["membership_tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          phone: string | null
          role: "USER" | "ADMIN"
          supabase_id: string
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          avatar_url?: string | null
          phone?: string | null
          role?: "USER" | "ADMIN"
          supabase_id: string
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          phone?: string | null
          role?: "USER" | "ADMIN"
          supabase_id?: string
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Relationships: []
      }
      courts: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          is_indoor: boolean
          has_lighting: boolean
          surface_type: string | null
          price_per_hour_cents: number
          peak_price_per_hour_cents: number | null
          open_time: string
          close_time: string
          slot_duration_minutes: number
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          is_indoor?: boolean
          has_lighting?: boolean
          surface_type?: string | null
          price_per_hour_cents: number
          peak_price_per_hour_cents?: number | null
          open_time?: string
          close_time?: string
          slot_duration_minutes?: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          is_indoor?: boolean
          has_lighting?: boolean
          surface_type?: string | null
          price_per_hour_cents?: number
          peak_price_per_hour_cents?: number | null
          open_time?: string
          close_time?: string
          slot_duration_minutes?: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          guest_id: string | null
          type: "COURT_BOOKING" | "CORPORATE_BOOKING" | "PRIVATE_COACHING"
          total_cents: number
          currency: string
          status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "COMPLETED" | "NO_SHOW"
          expires_at: string | null
          is_admin_override: boolean
          admin_notes: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          reminder_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          guest_id?: string | null
          type?: "COURT_BOOKING" | "CORPORATE_BOOKING" | "PRIVATE_COACHING"
          total_cents: number
          currency?: string
          status?: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "COMPLETED" | "NO_SHOW"
          expires_at?: string | null
          is_admin_override?: boolean
          admin_notes?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          reminder_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          guest_id?: string | null
          type?: "COURT_BOOKING" | "CORPORATE_BOOKING" | "PRIVATE_COACHING"
          total_cents?: number
          currency?: string
          status?: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "COMPLETED" | "NO_SHOW"
          expires_at?: string | null
          is_admin_override?: boolean
          admin_notes?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          reminder_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      booking_slots: {
        Row: {
          id: string
          organization_id: string
          booking_id: string
          court_id: string
          start_time: string
          end_time: string
          price_in_cents: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          booking_id: string
          court_id: string
          start_time: string
          end_time: string
          price_in_cents: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          booking_id?: string
          court_id?: string
          start_time?: string
          end_time?: string
          price_in_cents?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_slots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_slots_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          organization_id: string
          booking_id: string
          user_id: string
          hitpay_payment_id: string | null
          hitpay_payment_url: string | null
          hitpay_reference_no: string | null
          amount_cents: number
          currency: string
          method: "PAYNOW" | "CARD" | "SAVED_CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "GRABPAY" | "ADMIN_OVERRIDE" | null
          status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "EXPIRED"
          paynow_qr_data: string | null
          webhook_payload: Json | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          booking_id: string
          user_id: string
          hitpay_payment_id?: string | null
          hitpay_payment_url?: string | null
          hitpay_reference_no?: string | null
          amount_cents: number
          currency?: string
          method?: "PAYNOW" | "CARD" | "SAVED_CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "GRABPAY" | "ADMIN_OVERRIDE" | null
          status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "EXPIRED"
          paynow_qr_data?: string | null
          webhook_payload?: Json | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          booking_id?: string
          user_id?: string
          hitpay_payment_id?: string | null
          hitpay_payment_url?: string | null
          hitpay_reference_no?: string | null
          amount_cents?: number
          currency?: string
          method?: "PAYNOW" | "CARD" | "SAVED_CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "GRABPAY" | "ADMIN_OVERRIDE" | null
          status?: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "EXPIRED"
          paynow_qr_data?: string | null
          webhook_payload?: Json | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      court_blocks: {
        Row: {
          id: string
          organization_id: string
          court_id: string
          start_time: string
          end_time: string
          reason: "MAINTENANCE" | "TOURNAMENT" | "PRIVATE_EVENT" | "OTHER"
          description: string | null
          created_by_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          court_id: string
          start_time: string
          end_time: string
          reason: "MAINTENANCE" | "TOURNAMENT" | "PRIVATE_EVENT" | "OTHER"
          description?: string | null
          created_by_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          court_id?: string
          start_time?: string
          end_time?: string
          reason?: "MAINTENANCE" | "TOURNAMENT" | "PRIVATE_EVENT" | "OTHER"
          description?: string | null
          created_by_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_blocks_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_audit_logs: {
        Row: {
          id: string
          organization_id: string
          admin_id: string
          action: string
          entity_type: string
          entity_id: string
          previous_data: Json | null
          new_data: Json | null
          notes: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          admin_id: string
          action: string
          entity_type: string
          entity_id: string
          previous_data?: Json | null
          new_data?: Json | null
          notes?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          admin_id?: string
          action?: string
          entity_type?: string
          entity_id?: string
          previous_data?: Json | null
          new_data?: Json | null
          notes?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      app_settings: {
        Row: {
          organization_id: string
          key: string
          value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          organization_id: string
          key: string
          value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          organization_id?: string
          key?: string
          value?: string
          description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_payment_methods: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          hitpay_billing_id: string
          card_brand: string | null
          card_last_4: string | null
          card_expiry_month: string | null
          card_expiry_year: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          hitpay_billing_id: string
          card_brand?: string | null
          card_last_4?: string | null
          card_expiry_month?: string | null
          card_expiry_year?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          hitpay_billing_id?: string
          card_brand?: string | null
          card_last_4?: string | null
          card_expiry_month?: string | null
          card_expiry_year?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      membership_subscriptions: {
        Row: {
          id: string
          organization_id: string
          member_id: string
          tier_id: string
          amount_cents: number
          currency: string
          billing_period: string
          status: "active" | "past_due" | "cancelled" | "paused"
          current_period_start: string
          current_period_end: string
          next_billing_date: string | null
          cancelled_at: string | null
          payment_method: string | null
          last_payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          member_id: string
          tier_id: string
          amount_cents: number
          currency?: string
          billing_period: string
          status?: "active" | "past_due" | "cancelled" | "paused"
          current_period_start: string
          current_period_end: string
          next_billing_date?: string | null
          cancelled_at?: string | null
          payment_method?: string | null
          last_payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          member_id?: string
          tier_id?: string
          amount_cents?: number
          currency?: string
          billing_period?: string
          status?: "active" | "past_due" | "cancelled" | "paused"
          current_period_start?: string
          current_period_end?: string
          next_billing_date?: string | null
          cancelled_at?: string | null
          payment_method?: string | null
          last_payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          invoice_number: string
          type: string
          description: string | null
          line_items: Json
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          currency: string
          status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "void"
          issued_at: string | null
          due_date: string | null
          paid_at: string | null
          payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          invoice_number: string
          type: string
          description?: string | null
          line_items?: Json
          subtotal_cents: number
          tax_cents?: number
          total_cents: number
          currency?: string
          status?: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "void"
          issued_at?: string | null
          due_date?: string | null
          paid_at?: string | null
          payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          invoice_number?: string
          type?: string
          description?: string | null
          line_items?: Json
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          currency?: string
          status?: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "void"
          issued_at?: string | null
          due_date?: string | null
          paid_at?: string | null
          payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_sequences: {
        Row: {
          organization_id: string
          last_number: number
        }
        Insert: {
          organization_id: string
          last_number?: number
        }
        Update: {
          organization_id?: string
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      guests: {
        Row: {
          id: string
          organization_id: string
          email: string
          name: string
          phone: string | null
          total_bookings: number
          last_booking_at: string | null
          converted_to_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          name: string
          phone?: string | null
          total_bookings?: number
          last_booking_at?: string | null
          converted_to_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          name?: string
          phone?: string | null
          total_bookings?: number
          last_booking_at?: string | null
          converted_to_user_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      waitlist_entries: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          guest_id: string | null
          court_id: string | null
          desired_date: string
          desired_start_time: string
          desired_end_time: string
          status: "waiting" | "offered" | "accepted" | "expired" | "cancelled"
          offered_at: string | null
          offer_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          guest_id?: string | null
          court_id?: string | null
          desired_date: string
          desired_start_time: string
          desired_end_time: string
          status?: "waiting" | "offered" | "accepted" | "expired" | "cancelled"
          offered_at?: string | null
          offer_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          guest_id?: string | null
          court_id?: string | null
          desired_date?: string
          desired_start_time?: string
          desired_end_time?: string
          status?: "waiting" | "offered" | "accepted" | "expired" | "cancelled"
          offered_at?: string | null
          offer_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      email_templates: {
        Row: {
          id: string
          organization_id: string | null
          type: string
          subject: string
          body_html: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          type: string
          subject: string
          body_html: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          type?: string
          subject?: string
          body_html?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      email_log: {
        Row: {
          id: string
          organization_id: string | null
          recipient_email: string
          template_type: string
          subject: string
          status: string
          resend_id: string | null
          error: string | null
          sent_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          recipient_email: string
          template_type: string
          subject: string
          status?: string
          resend_id?: string | null
          error?: string | null
          sent_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          recipient_email?: string
          template_type?: string
          subject?: string
          status?: string
          resend_id?: string | null
          error?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_invoice_number: {
        Args: {
          org_id: string
        }
        Returns: string
      }
      create_booking_with_slots: {
        Args: {
          p_organization_id: string
          p_user_id: string
          p_type: string
          p_total_cents: number
          p_currency: string
          p_expires_at: string
          p_slots: Json
        }
        Returns: string
      }
      confirm_booking_payment: {
        Args: {
          p_booking_id: string
          p_payment_method: string
          p_hitpay_reference?: string
          p_webhook_payload?: Json
        }
        Returns: void
      }
      expire_pending_bookings: {
        Args: Record<string, never>
        Returns: Json
      }
      get_profile_stats: {
        Args: {
          p_organization_id: string
          p_user_id: string
        }
        Returns: Json
      }
      get_total_revenue: {
        Args: {
          p_organization_id: string
        }
        Returns: number
      }
      get_org_revenue_summary: {
        Args: {
          p_org_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: Json
      }
      get_member_growth: {
        Args: {
          p_org_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
