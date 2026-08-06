/**
 * Types PostgreSQL générés depuis le schéma réel — NE PAS ÉDITER À LA MAIN.
 *
 * Régénération après toute migration :
 *   GET https://api.supabase.com/v1/projects/{ref}/types/typescript?included_schemas=public
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          doctor_id: string
          duration_minutes: number | null
          establishment_id: string | null
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_date: string
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id: string
          duration_minutes?: number | null
          establishment_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_date?: string
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id?: string
          duration_minutes?: number | null
          establishment_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_name: string
          establishment_id: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_name: string
          establishment_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string
          establishment_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_closures: {
        Row: {
          business_reference: string
          cash_register_id: string
          closed_by: string | null
          closing_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string | null
          explanation: string | null
          id: string
          physical_cash_count: number
          theoretical_balance: number
          updated_at: string
          updated_by: string | null
          variance_amount: number | null
        }
        Insert: {
          business_reference: string
          cash_register_id: string
          closed_by?: string | null
          closing_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string | null
          explanation?: string | null
          id?: string
          physical_cash_count: number
          theoretical_balance: number
          updated_at?: string
          updated_by?: string | null
          variance_amount?: number | null
        }
        Update: {
          business_reference?: string
          cash_register_id?: string
          closed_by?: string | null
          closing_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string | null
          explanation?: string | null
          id?: string
          physical_cash_count?: number
          theoretical_balance?: number
          updated_at?: string
          updated_by?: string | null
          variance_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_closures_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closures_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closures_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_closures_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          business_reference: string
          cash_register_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string | null
          id: string
          invoice_id: string | null
          movement_date: string | null
          patient_id: string | null
          payment_method: string
          reason: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          business_reference: string
          cash_register_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string | null
          id?: string
          invoice_id?: string | null
          movement_date?: string | null
          patient_id?: string | null
          payment_method: string
          reason: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          business_reference?: string
          cash_register_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string | null
          id?: string
          invoice_id?: string | null
          movement_date?: string | null
          patient_id?: string | null
          payment_method?: string
          reason?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          business_reference: string
          cashier_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          current_balance: number
          deleted_at: string | null
          establishment_id: string | null
          id: string
          name: string
          opened_at: string | null
          opening_balance: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          cashier_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_balance?: number
          deleted_at?: string | null
          establishment_id?: string | null
          id?: string
          name: string
          opened_at?: string | null
          opening_balance?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          cashier_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_balance?: number
          deleted_at?: string | null
          establishment_id?: string | null
          id?: string
          name?: string
          opened_at?: string | null
          opening_balance?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          appointment_id: string | null
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          business_reference: string
          chief_complaint: string
          consultation_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          diagnosis_summary: string | null
          doctor_id: string
          establishment_id: string | null
          heart_rate_bpm: number | null
          height_cm: number | null
          id: string
          patient_id: string
          physical_examination: string | null
          status: string | null
          symptoms: string | null
          temperature_celsius: number | null
          treatment_plan: string | null
          updated_at: string
          updated_by: string | null
          weight_kg: number | null
        }
        Insert: {
          appointment_id?: string | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          business_reference: string
          chief_complaint: string
          consultation_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          diagnosis_summary?: string | null
          doctor_id: string
          establishment_id?: string | null
          heart_rate_bpm?: number | null
          height_cm?: number | null
          id?: string
          patient_id: string
          physical_examination?: string | null
          status?: string | null
          symptoms?: string | null
          temperature_celsius?: number | null
          treatment_plan?: string | null
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Update: {
          appointment_id?: string | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          business_reference?: string
          chief_complaint?: string
          consultation_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          diagnosis_summary?: string | null
          doctor_id?: string
          establishment_id?: string | null
          heart_rate_bpm?: number | null
          height_cm?: number | null
          id?: string
          patient_id?: string
          physical_examination?: string | null
          status?: string | null
          symptoms?: string | null
          temperature_celsius?: number | null
          treatment_plan?: string | null
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          business_reference: string
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          phone: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          business_reference: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          business_reference?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          phone?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          base_salary: number
          business_reference: string
          contract_type: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string
          diploma: string | null
          email: string | null
          establishment_id: string | null
          full_name: string | null
          hire_date: string
          id: string
          phone: string | null
          position: string
          profile_id: string | null
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_salary: number
          business_reference: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department: string
          diploma?: string | null
          email?: string | null
          establishment_id?: string | null
          full_name?: string | null
          hire_date: string
          id?: string
          phone?: string | null
          position: string
          profile_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_salary?: number
          business_reference?: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string
          diploma?: string | null
          email?: string | null
          establishment_id?: string | null
          full_name?: string | null
          hire_date?: string
          id?: string
          phone?: string | null
          position?: string
          profile_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      establishment_modules: {
        Row: {
          establishment_id: string
          is_enabled: boolean
          module_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          establishment_id: string
          is_enabled?: boolean
          module_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          establishment_id?: string
          is_enabled?: boolean
          module_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_modules_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_modules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          authorization_number: string | null
          banner_url: string | null
          business_reference: string
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          document_templates: Json | null
          email: string
          id: string
          is_active: boolean | null
          island: string | null
          latitude: number | null
          legal_mentions: string | null
          legal_name: string | null
          locale: string
          logo_url: string | null
          longitude: number | null
          max_users: number | null
          name: string
          opening_hours: Json | null
          pdf_template: string
          phone: string
          phone_secondary: string | null
          postal_code: string | null
          primary_color: string
          secondary_color: string
          short_name: string | null
          signature_holder: string | null
          signature_url: string | null
          slogan: string | null
          specialties: string[]
          stamp_url: string | null
          subscription_plan: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          support_email: string | null
          tax_id: string | null
          timezone: string
          trade_register: string | null
          type: Database["public"]["Enums"]["establishment_type"]
          updated_at: string
          updated_by: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          authorization_number?: string | null
          banner_url?: string | null
          business_reference: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          document_templates?: Json | null
          email: string
          id?: string
          is_active?: boolean | null
          island?: string | null
          latitude?: number | null
          legal_mentions?: string | null
          legal_name?: string | null
          locale?: string
          logo_url?: string | null
          longitude?: number | null
          max_users?: number | null
          name: string
          opening_hours?: Json | null
          pdf_template?: string
          phone: string
          phone_secondary?: string | null
          postal_code?: string | null
          primary_color?: string
          secondary_color?: string
          short_name?: string | null
          signature_holder?: string | null
          signature_url?: string | null
          slogan?: string | null
          specialties?: string[]
          stamp_url?: string | null
          subscription_plan?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          support_email?: string | null
          tax_id?: string | null
          timezone?: string
          trade_register?: string | null
          type?: Database["public"]["Enums"]["establishment_type"]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          authorization_number?: string | null
          banner_url?: string | null
          business_reference?: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          document_templates?: Json | null
          email?: string
          id?: string
          is_active?: boolean | null
          island?: string | null
          latitude?: number | null
          legal_mentions?: string | null
          legal_name?: string | null
          locale?: string
          logo_url?: string | null
          longitude?: number | null
          max_users?: number | null
          name?: string
          opening_hours?: Json | null
          pdf_template?: string
          phone?: string
          phone_secondary?: string | null
          postal_code?: string | null
          primary_color?: string
          secondary_color?: string
          short_name?: string | null
          signature_holder?: string | null
          signature_url?: string | null
          slogan?: string | null
          specialties?: string[]
          stamp_url?: string | null
          subscription_plan?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          support_email?: string | null
          tax_id?: string | null
          timezone?: string
          trade_register?: string | null
          type?: Database["public"]["Enums"]["establishment_type"]
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      hospitalizations: {
        Row: {
          admission_date: string | null
          admission_reason: string
          bed_number: string
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          discharge_date: string | null
          discharge_summary: string | null
          doctor_id: string
          establishment_id: string | null
          id: string
          patient_id: string
          room_number: string
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admission_date?: string | null
          admission_reason: string
          bed_number: string
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discharge_date?: string | null
          discharge_summary?: string | null
          doctor_id: string
          establishment_id?: string | null
          id?: string
          patient_id: string
          room_number: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admission_date?: string | null
          admission_reason?: string
          bed_number?: string
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discharge_date?: string | null
          discharge_summary?: string | null
          doctor_id?: string
          establishment_id?: string | null
          id?: string
          patient_id?: string
          room_number?: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitalizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalizations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalizations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalizations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalizations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imaging_orders: {
        Row: {
          body_part: string
          business_reference: string
          clinical_notes: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          doctor_id: string
          establishment_id: string | null
          id: string
          image_url: string | null
          modality: string
          patient_id: string
          radiologist_id: string | null
          report_text: string | null
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_part: string
          business_reference: string
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id: string
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          modality: string
          patient_id: string
          radiologist_id?: string | null
          report_text?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_part?: string
          business_reference?: string
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id?: string
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          modality?: string
          patient_id?: string
          radiologist_id?: string | null
          report_text?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imaging_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_orders_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_orders_radiologist_id_fkey"
            columns: ["radiologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imaging_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          establishment_id: string | null
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          establishment_id?: string | null
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity?: number
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          establishment_id?: string | null
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity?: number
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          discount_amount: number | null
          establishment_id: string | null
          id: string
          insurance_coverage_amount: number | null
          invoice_date: string | null
          paid_amount: number | null
          patient_id: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          establishment_id?: string | null
          id?: string
          insurance_coverage_amount?: number | null
          invoice_date?: string | null
          paid_amount?: number | null
          patient_id?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          establishment_id?: string | null
          id?: string
          insurance_coverage_amount?: number | null
          invoice_date?: string | null
          paid_amount?: number | null
          patient_id?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          business_reference: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          doctor_id: string
          establishment_id: string | null
          id: string
          normal_reference_range: string | null
          patient_id: string
          performed_by: string | null
          priority: string | null
          results: string | null
          status: string | null
          test_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id: string
          establishment_id?: string | null
          id?: string
          normal_reference_range?: string | null
          patient_id: string
          performed_by?: string | null
          priority?: string | null
          results?: string | null
          status?: string | null
          test_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id?: string
          establishment_id?: string | null
          id?: string
          normal_reference_range?: string | null
          patient_id?: string
          performed_by?: string | null
          priority?: string | null
          results?: string | null
          status?: string | null
          test_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      license_events: {
        Row: {
          comment: string | null
          created_at: string
          establishment_id: string | null
          event_type: string
          id: string
          license_id: string
          new_status: Database["public"]["Enums"]["license_state"] | null
          performed_by: string | null
          previous_status: Database["public"]["Enums"]["license_state"] | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          establishment_id?: string | null
          event_type: string
          id?: string
          license_id: string
          new_status?: Database["public"]["Enums"]["license_state"] | null
          performed_by?: string | null
          previous_status?: Database["public"]["Enums"]["license_state"] | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          establishment_id?: string | null
          event_type?: string
          id?: string
          license_id?: string
          new_status?: Database["public"]["Enums"]["license_state"] | null
          performed_by?: string | null
          previous_status?: Database["public"]["Enums"]["license_state"] | null
        }
        Relationships: [
          {
            foreignKeyName: "license_events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_events_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          expires_at: string | null
          id: string
          license_number: string
          max_users: number | null
          status: Database["public"]["Enums"]["license_state"]
          storage_mb: number | null
          subscription_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          expires_at?: string | null
          id?: string
          license_number: string
          max_users?: number | null
          status?: Database["public"]["Enums"]["license_state"]
          storage_mb?: number | null
          subscription_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          expires_at?: string | null
          id?: string
          license_number?: string
          max_users?: number | null
          status?: Database["public"]["Enums"]["license_state"]
          storage_mb?: number | null
          subscription_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: true
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          failure_reason: string | null
          id: string
          identifier: string
          ip_address: string | null
          profile_id: string | null
          succeeded: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          identifier: string
          ip_address?: string | null
          profile_id?: string | null
          succeeded: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          identifier?: string
          ip_address?: string | null
          profile_id?: string | null
          succeeded?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_outbox: {
        Row: {
          attempts: number
          body: string
          business_reference: string
          channel: string
          created_at: string
          error: string | null
          id: string
          provider: string | null
          provider_message_id: string | null
          recipient: string
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          body: string
          business_reference: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient: string
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          body?: string
          business_reference?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template?: string
          updated_at?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          blueprint_reference: string | null
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_core: boolean
          name: string
          updated_at: string
          workspace: string
        }
        Insert: {
          blueprint_reference?: string | null
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_core?: boolean
          name: string
          updated_at?: string
          workspace?: string
        }
        Update: {
          blueprint_reference?: string | null
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_core?: boolean
          name?: string
          updated_at?: string
          workspace?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          archived_at: string | null
          business_reference: string | null
          category: string
          created_at: string
          establishment_id: string | null
          expires_at: string | null
          id: string
          is_archived: boolean
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          read_at: string | null
          severity: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          business_reference?: string | null
          category?: string
          created_at?: string
          establishment_id?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          business_reference?: string | null
          category?: string
          created_at?: string
          establishment_id?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          business_reference: string
          created_at: string
          email: string | null
          establishment_id: string | null
          full_name: string | null
          id: string
          identifier: string
          ip_address: string | null
          note: string | null
          processed_at: string | null
          processed_by: string | null
          profile_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_reference: string
          created_at?: string
          email?: string | null
          establishment_id?: string | null
          full_name?: string | null
          id?: string
          identifier: string
          ip_address?: string | null
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_reference?: string
          created_at?: string
          email?: string | null
          establishment_id?: string | null
          full_name?: string | null
          id?: string
          identifier?: string
          ip_address?: string | null
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          profile_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_requests_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_reset_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_reset_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          birth_date: string
          blood_group: string | null
          business_reference: string
          chronic_conditions: string[] | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          establishment_id: string | null
          first_name: string
          gender: string
          id: string
          is_active: boolean | null
          last_name: string
          national_id: string | null
          phone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          birth_date: string
          blood_group?: string | null
          business_reference: string
          chronic_conditions?: string[] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          establishment_id?: string | null
          first_name: string
          gender: string
          id?: string
          is_active?: boolean | null
          last_name: string
          national_id?: string | null
          phone: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          birth_date?: string
          blood_group?: string | null
          business_reference?: string
          chronic_conditions?: string[] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          establishment_id?: string | null
          first_name?: string
          gender?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          national_id?: string | null
          phone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          label: string
          requires_reference: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          requires_reference?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          requires_reference?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          business_reference: string
          created_at: string
          deleted_at: string | null
          establishment_id: string | null
          id: string
          invoice_id: string
          payment_date: string | null
          payment_method: string
          received_by: string | null
          transaction_ref: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          business_reference: string
          created_at?: string
          deleted_at?: string | null
          establishment_id?: string | null
          id?: string
          invoice_id: string
          payment_date?: string | null
          payment_method: string
          received_by?: string | null
          transaction_ref?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          business_reference?: string
          created_at?: string
          deleted_at?: string | null
          establishment_id?: string | null
          id?: string
          invoice_id?: string
          payment_date?: string | null
          payment_method?: string
          received_by?: string | null
          transaction_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_slips: {
        Row: {
          base_salary: number
          business_reference: string
          created_at: string
          created_by: string | null
          deductions: number
          deleted_at: string | null
          employee_id: string
          establishment_id: string | null
          guard_bonuses: number
          id: string
          net_salary: number | null
          paid_at: string | null
          payment_status: string
          period_month: number
          period_year: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_salary?: number
          business_reference: string
          created_at?: string
          created_by?: string | null
          deductions?: number
          deleted_at?: string | null
          employee_id: string
          establishment_id?: string | null
          guard_bonuses?: number
          id?: string
          net_salary?: number | null
          paid_at?: string | null
          payment_status?: string
          period_month: number
          period_year: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_salary?: number
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deductions?: number
          deleted_at?: string | null
          employee_id?: string
          establishment_id?: string | null
          guard_bonuses?: number
          id?: string
          net_salary?: number | null
          paid_at?: string | null
          payment_status?: string
          period_month?: number
          period_year?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_slips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_slips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_slips_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_slips_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_items: {
        Row: {
          business_reference: string
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string | null
          expiry_date: string | null
          generic_name: string | null
          id: string
          is_active: boolean | null
          name: string
          reorder_level: number | null
          stock_quantity: number | null
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          category: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          reorder_level?: number | null
          stock_quantity?: number | null
          unit_price: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string | null
          expiry_date?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          reorder_level?: number | null
          stock_quantity?: number | null
          unit_price?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_items_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_items_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_modules: {
        Row: {
          module_id: string
          plan_id: string
        }
        Insert: {
          module_id: string
          plan_id: string
        }
        Update: {
          module_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_modules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          business_reference: string
          consultation_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          doctor_id: string
          establishment_id: string | null
          id: string
          medications: Json
          notes: string | null
          patient_id: string
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id: string
          establishment_id?: string | null
          id?: string
          medications: Json
          notes?: string | null
          patient_id: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id?: string
          establishment_id?: string | null
          id?: string
          medications?: Json
          notes?: string | null
          patient_id?: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activation_required: boolean
          avatar_url: string | null
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string | null
          email: string
          email_verified_at: string | null
          establishment_id: string | null
          failed_login_attempts: number
          first_name: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          last_name: string
          license_number: string | null
          locked_until: string | null
          must_change_password: boolean
          password_changed_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          specialty: string | null
          updated_at: string
          updated_by: string | null
          username: string
        }
        Insert: {
          activation_required?: boolean
          avatar_url?: string | null
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          email: string
          email_verified_at?: string | null
          establishment_id?: string | null
          failed_login_attempts?: number
          first_name: string
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          last_name: string
          license_number?: string | null
          locked_until?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          specialty?: string | null
          updated_at?: string
          updated_by?: string | null
          username: string
        }
        Update: {
          activation_required?: boolean
          avatar_url?: string | null
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          email?: string
          email_verified_at?: string | null
          establishment_id?: string | null
          failed_login_attempts?: number
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          last_name?: string
          license_number?: string | null
          locked_until?: string | null
          must_change_password?: boolean
          password_changed_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          specialty?: string | null
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          establishment_id: string | null
          id: string
          line_total: number | null
          quantity: number
          quote_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description: string
          establishment_id?: string | null
          id?: string
          line_total?: number | null
          quantity?: number
          quote_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          establishment_id?: string | null
          id?: string
          line_total?: number | null
          quantity?: number
          quote_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          business_reference: string
          converted_invoice_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          discount_amount: number | null
          establishment_id: string | null
          id: string
          patient_id: string | null
          quote_date: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
        }
        Insert: {
          business_reference: string
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          establishment_id?: string | null
          id?: string
          patient_id?: string | null
          quote_date?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
        }
        Update: {
          business_reference?: string
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          discount_amount?: number | null
          establishment_id?: string | null
          id?: string
          patient_id?: string | null
          quote_date?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          base_monthly_price: number | null
          business_reference: string
          created_at: string
          duration_months: number | null
          email: string
          establishment_name: string
          establishment_type:
            | Database["public"]["Enums"]["establishment_type"]
            | null
          full_name: string
          id: string
          message: string | null
          monthly_price: number | null
          payment_method: string | null
          phone: string | null
          plan_code: string | null
          plan_name: string | null
          price_currency: string
          processed_at: string | null
          processed_by: string | null
          requested_plan_id: string | null
          savings_amount: number | null
          start_date: string | null
          start_option: string | null
          status: string
          total_price: number | null
          updated_at: string
        }
        Insert: {
          base_monthly_price?: number | null
          business_reference: string
          created_at?: string
          duration_months?: number | null
          email: string
          establishment_name: string
          establishment_type?:
            | Database["public"]["Enums"]["establishment_type"]
            | null
          full_name: string
          id?: string
          message?: string | null
          monthly_price?: number | null
          payment_method?: string | null
          phone?: string | null
          plan_code?: string | null
          plan_name?: string | null
          price_currency?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_plan_id?: string | null
          savings_amount?: number | null
          start_date?: string | null
          start_option?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          base_monthly_price?: number | null
          business_reference?: string
          created_at?: string
          duration_months?: number | null
          email?: string
          establishment_name?: string
          establishment_type?:
            | Database["public"]["Enums"]["establishment_type"]
            | null
          full_name?: string
          id?: string
          message?: string | null
          monthly_price?: number | null
          payment_method?: string | null
          phone?: string | null
          plan_code?: string | null
          plan_name?: string | null
          price_currency?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_plan_id?: string | null
          savings_amount?: number | null
          start_date?: string | null
          start_option?: string | null
          status?: string
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_update: boolean
          can_view: boolean
          created_at: string
          id: string
          module_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_id: string
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_id?: string
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      security_settings: {
        Row: {
          audit_retention_days: number
          created_at: string
          establishment_id: string | null
          id: string
          lockout_minutes: number
          max_login_attempts: number
          password_expiry_days: number | null
          password_min_length: number
          password_require_digit: boolean
          password_require_lowercase: boolean
          password_require_special: boolean
          password_require_uppercase: boolean
          session_idle_minutes: number
          session_max_minutes: number
          two_factor_enabled: boolean
          two_factor_method: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audit_retention_days?: number
          created_at?: string
          establishment_id?: string | null
          id?: string
          lockout_minutes?: number
          max_login_attempts?: number
          password_expiry_days?: number | null
          password_min_length?: number
          password_require_digit?: boolean
          password_require_lowercase?: boolean
          password_require_special?: boolean
          password_require_uppercase?: boolean
          session_idle_minutes?: number
          session_max_minutes?: number
          two_factor_enabled?: boolean
          two_factor_method?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audit_retention_days?: number
          created_at?: string
          establishment_id?: string | null
          id?: string
          lockout_minutes?: number
          max_login_attempts?: number
          password_expiry_days?: number | null
          password_min_length?: number
          password_require_digit?: boolean
          password_require_lowercase?: boolean
          password_require_special?: boolean
          password_require_uppercase?: boolean
          session_idle_minutes?: number
          session_max_minutes?: number
          two_factor_enabled?: boolean
          two_factor_method?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_settings_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_schedules: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          employee_id: string
          end_time: string
          establishment_id: string | null
          id: string
          shift_date: string
          shift_type: string
          start_time: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id: string
          end_time: string
          establishment_id?: string | null
          id?: string
          shift_date: string
          shift_type: string
          start_time: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          employee_id?: string
          end_time?: string
          establishment_id?: string | null
          id?: string
          shift_date?: string
          shift_type?: string
          start_time?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          comment: string | null
          created_at: string
          establishment_id: string | null
          event_type: string
          id: string
          new_plan_id: string | null
          new_status: Database["public"]["Enums"]["subscription_state"] | null
          performed_by: string | null
          previous_plan_id: string | null
          previous_status:
            | Database["public"]["Enums"]["subscription_state"]
            | null
          subscription_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          establishment_id?: string | null
          event_type: string
          id?: string
          new_plan_id?: string | null
          new_status?: Database["public"]["Enums"]["subscription_state"] | null
          performed_by?: string | null
          previous_plan_id?: string | null
          previous_status?:
            | Database["public"]["Enums"]["subscription_state"]
            | null
          subscription_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          establishment_id?: string | null
          event_type?: string
          id?: string
          new_plan_id?: string | null
          new_status?: Database["public"]["Enums"]["subscription_state"] | null
          performed_by?: string | null
          previous_plan_id?: string | null
          previous_status?:
            | Database["public"]["Enums"]["subscription_state"]
            | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_new_plan_id_fkey"
            columns: ["new_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          backup_frequency: string | null
          billing_period: string | null
          code: string
          created_at: string
          cta_label: string | null
          description: string | null
          discount_min_months: number
          discount_per_month: number
          display_order: number
          duration_days: number | null
          highlights: string[] | null
          id: string
          is_active: boolean
          is_automatic: boolean
          is_featured: boolean
          limitations: string[] | null
          max_duration_months: number
          max_patients: number | null
          max_records_per_module: number | null
          max_users: number | null
          name: string
          price_amount: number
          price_currency: string
          requires_approval: boolean
          requires_payment: boolean
          retention_days: number | null
          storage_mb: number | null
          support_level: string | null
          updated_at: string
        }
        Insert: {
          backup_frequency?: string | null
          billing_period?: string | null
          code: string
          created_at?: string
          cta_label?: string | null
          description?: string | null
          discount_min_months?: number
          discount_per_month?: number
          display_order?: number
          duration_days?: number | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean
          is_automatic?: boolean
          is_featured?: boolean
          limitations?: string[] | null
          max_duration_months?: number
          max_patients?: number | null
          max_records_per_module?: number | null
          max_users?: number | null
          name: string
          price_amount?: number
          price_currency?: string
          requires_approval?: boolean
          requires_payment?: boolean
          retention_days?: number | null
          storage_mb?: number | null
          support_level?: string | null
          updated_at?: string
        }
        Update: {
          backup_frequency?: string | null
          billing_period?: string | null
          code?: string
          created_at?: string
          cta_label?: string | null
          description?: string | null
          discount_min_months?: number
          discount_per_month?: number
          display_order?: number
          duration_days?: number | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean
          is_automatic?: boolean
          is_featured?: boolean
          limitations?: string[] | null
          max_duration_months?: number
          max_patients?: number | null
          max_records_per_module?: number | null
          max_users?: number | null
          name?: string
          price_amount?: number
          price_currency?: string
          requires_approval?: boolean
          requires_payment?: boolean
          retention_days?: number | null
          storage_mb?: number | null
          support_level?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          duration_months: number | null
          end_date: string | null
          establishment_id: string
          id: string
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_state"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duration_months?: number | null
          end_date?: string | null
          establishment_id: string
          id?: string
          plan_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duration_months?: number | null
          end_date?: string | null
          establishment_id?: string
          id?: string
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          establishment_id: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          establishment_id?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          establishment_id?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          profile_id: string
          purpose: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          profile_id: string
          purpose: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          profile_id?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_codes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_establishment_id: { Args: never; Returns: string }
      is_establishment_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      purge_expired_audit_logs: { Args: never; Returns: number }
      seed_role_permission: {
        Args: {
          p_create: boolean
          p_delete: boolean
          p_module: string
          p_role: string
          p_update: boolean
          p_view: boolean
        }
        Returns: undefined
      }
      subscription_state_of: {
        Args: {
          end_date: string
          status: Database["public"]["Enums"]["subscription_state"]
        }
        Returns: string
      }
    }
    Enums: {
      establishment_type:
        | "cabinet"
        | "clinique"
        | "centre_medical"
        | "hopital"
        | "laboratoire"
        | "imagerie"
        | "ong"
      license_state: "active" | "suspended" | "expired" | "terminated"
      subscription_state:
        | "pending"
        | "active"
        | "suspended"
        | "expired"
        | "terminated"
      subscription_status:
        | "active"
        | "trial"
        | "past_due"
        | "canceled"
        | "suspended"
      user_role_type:
        | "super_admin"
        | "establishment_admin"
        | "doctor"
        | "nurse"
        | "receptionist"
        | "pharmacist"
        | "lab_tech"
        | "radiologist"
        | "accountant"
        | "patient"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      establishment_type: [
        "cabinet",
        "clinique",
        "centre_medical",
        "hopital",
        "laboratoire",
        "imagerie",
        "ong",
      ],
      license_state: ["active", "suspended", "expired", "terminated"],
      subscription_state: [
        "pending",
        "active",
        "suspended",
        "expired",
        "terminated",
      ],
      subscription_status: [
        "active",
        "trial",
        "past_due",
        "canceled",
        "suspended",
      ],
      user_role_type: [
        "super_admin",
        "establishment_admin",
        "doctor",
        "nurse",
        "receptionist",
        "pharmacist",
        "lab_tech",
        "radiologist",
        "accountant",
        "patient",
      ],
    },
  },
} as const

