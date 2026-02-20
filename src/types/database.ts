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
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          }
        ]
      }
      booking_slots: {
        Row: {
          id: string
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
          }
        ]
      }
      payments: {
        Row: {
          id: string
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
          }
        ]
      }
      court_blocks: {
        Row: {
          id: string
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
          }
        ]
      }
      admin_audit_logs: {
        Row: {
          id: string
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
          }
        ]
      }
      app_settings: {
        Row: {
          key: string
          value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_payment_methods: {
        Row: {
          id: string
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
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_booking_with_slots: {
        Args: {
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
          p_user_id: string
        }
        Returns: Json
      }
      get_total_revenue: {
        Args: Record<string, never>
        Returns: number
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
