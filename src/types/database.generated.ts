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
      beds: {
        Row: {
          available_from: string | null
          business_reference: string
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          id: string
          notes: string | null
          room_id: string
          status: Database["public"]["Enums"]["bed_state"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          available_from?: string | null
          business_reference: string
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          id?: string
          notes?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["bed_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          available_from?: string | null
          business_reference?: string
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          id?: string
          notes?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["bed_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beds_updated_by_fkey"
            columns: ["updated_by"]
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
      dispensation_lines: {
        Row: {
          created_at: string
          dispensation_id: string
          id: string
          item_id: string
          lot_id: string | null
          posology: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          dispensation_id: string
          id?: string
          item_id: string
          lot_id?: string | null
          posology?: string | null
          quantity: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          dispensation_id?: string
          id?: string
          item_id?: string
          lot_id?: string | null
          posology?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispensation_lines_dispensation_id_fkey"
            columns: ["dispensation_id"]
            isOneToOne: false
            referencedRelation: "dispensations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensation_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensation_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "dispensation_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "medication_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      dispensations: {
        Row: {
          business_reference: string
          channel: Database["public"]["Enums"]["dispensation_channel"]
          created_at: string
          created_by: string | null
          customer_name: string | null
          deleted_at: string | null
          dispensed_at: string
          dispensed_by: string | null
          establishment_id: string
          hospitalization_id: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          paid_amount: number
          patient_id: string | null
          payment_method: string | null
          pharmacy_id: string | null
          prescription_id: string | null
          status: Database["public"]["Enums"]["dispensation_state"]
          therapeutic_plan_id: string | null
          total_amount: number
          updated_at: string
          updated_by: string | null
          ward_round_id: string | null
        }
        Insert: {
          business_reference: string
          channel?: Database["public"]["Enums"]["dispensation_channel"]
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          dispensed_at?: string
          dispensed_by?: string | null
          establishment_id: string
          hospitalization_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          paid_amount?: number
          patient_id?: string | null
          payment_method?: string | null
          pharmacy_id?: string | null
          prescription_id?: string | null
          status?: Database["public"]["Enums"]["dispensation_state"]
          therapeutic_plan_id?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          ward_round_id?: string | null
        }
        Update: {
          business_reference?: string
          channel?: Database["public"]["Enums"]["dispensation_channel"]
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          dispensed_at?: string
          dispensed_by?: string | null
          establishment_id?: string
          hospitalization_id?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          paid_amount?: number
          patient_id?: string | null
          payment_method?: string | null
          pharmacy_id?: string | null
          prescription_id?: string | null
          status?: Database["public"]["Enums"]["dispensation_state"]
          therapeutic_plan_id?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          ward_round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispensations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_dispensed_by_fkey"
            columns: ["dispensed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["hospitalization_id"]
          },
          {
            foreignKeyName: "dispensations_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_plan_fk"
            columns: ["therapeutic_plan_id"]
            isOneToOne: false
            referencedRelation: "therapeutic_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensations_updated_by_fkey"
            columns: ["updated_by"]
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
          module_settings: Json
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
          module_settings?: Json
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
          module_settings?: Json
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
      hospitalization_care: {
        Row: {
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          business_reference: string
          care_type: string
          caregiver_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          heart_rate: number | null
          hospitalization_id: string
          id: string
          incident: string | null
          nutrition: string | null
          observations: string | null
          oxygen_saturation: number | null
          pain_level: number | null
          recorded_at: string
          respiratory_rate: number | null
          temperature: number | null
          updated_at: string
          updated_by: string | null
          weight_kg: number | null
        }
        Insert: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          business_reference: string
          care_type: string
          caregiver_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          heart_rate?: number | null
          hospitalization_id: string
          id?: string
          incident?: string | null
          nutrition?: string | null
          observations?: string | null
          oxygen_saturation?: number | null
          pain_level?: number | null
          recorded_at?: string
          respiratory_rate?: number | null
          temperature?: number | null
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Update: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          business_reference?: string
          care_type?: string
          caregiver_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          heart_rate?: number | null
          hospitalization_id?: string
          id?: string
          incident?: string | null
          nutrition?: string | null
          observations?: string | null
          oxygen_saturation?: number | null
          pain_level?: number | null
          recorded_at?: string
          respiratory_rate?: number | null
          temperature?: number | null
          updated_at?: string
          updated_by?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitalization_care_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_care_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_care_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_care_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["hospitalization_id"]
          },
          {
            foreignKeyName: "hospitalization_care_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_care_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalization_transfers: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          external_destination: string | null
          from_bed_id: string | null
          from_room_id: string | null
          from_service: string | null
          hospitalization_id: string
          id: string
          performed_by: string | null
          reason: string
          to_bed_id: string | null
          to_room_id: string | null
          to_service: string | null
          transfer_type: string
          transferred_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          external_destination?: string | null
          from_bed_id?: string | null
          from_room_id?: string | null
          from_service?: string | null
          hospitalization_id: string
          id?: string
          performed_by?: string | null
          reason: string
          to_bed_id?: string | null
          to_room_id?: string | null
          to_service?: string | null
          transfer_type?: string
          transferred_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          external_destination?: string | null
          from_bed_id?: string | null
          from_room_id?: string | null
          from_service?: string | null
          hospitalization_id?: string
          id?: string
          performed_by?: string | null
          reason?: string
          to_bed_id?: string | null
          to_room_id?: string | null
          to_service?: string | null
          transfer_type?: string
          transferred_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitalization_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_from_bed_id_fkey"
            columns: ["from_bed_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["bed_id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_from_bed_id_fkey"
            columns: ["from_bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_from_room_id_fkey"
            columns: ["from_room_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_from_room_id_fkey"
            columns: ["from_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["hospitalization_id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_to_bed_id_fkey"
            columns: ["to_bed_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["bed_id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_to_bed_id_fkey"
            columns: ["to_bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_to_room_id_fkey"
            columns: ["to_room_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_to_room_id_fkey"
            columns: ["to_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_transfers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalization_visits: {
        Row: {
          additional_exams: string | null
          business_reference: string
          created_at: string
          created_by: string | null
          decision: string | null
          deleted_at: string | null
          diagnosis: string | null
          doctor_id: string
          establishment_id: string
          evolution: string | null
          hospitalization_id: string
          id: string
          observations: string
          treatment_changes: string | null
          updated_at: string
          updated_by: string | null
          visited_at: string
        }
        Insert: {
          additional_exams?: string | null
          business_reference: string
          created_at?: string
          created_by?: string | null
          decision?: string | null
          deleted_at?: string | null
          diagnosis?: string | null
          doctor_id: string
          establishment_id: string
          evolution?: string | null
          hospitalization_id: string
          id?: string
          observations: string
          treatment_changes?: string | null
          updated_at?: string
          updated_by?: string | null
          visited_at?: string
        }
        Update: {
          additional_exams?: string | null
          business_reference?: string
          created_at?: string
          created_by?: string | null
          decision?: string | null
          deleted_at?: string | null
          diagnosis?: string | null
          doctor_id?: string
          establishment_id?: string
          evolution?: string | null
          hospitalization_id?: string
          id?: string
          observations?: string
          treatment_changes?: string | null
          updated_at?: string
          updated_by?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hospitalization_visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_visits_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_visits_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["hospitalization_id"]
          },
          {
            foreignKeyName: "hospitalization_visits_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_visits_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalizations: {
        Row: {
          admission_date: string | null
          admission_origin: string | null
          admission_reason: string
          bed_id: string | null
          bed_number: string | null
          business_reference: string
          created_at: string
          created_by: string | null
          daily_rate: number
          deleted_at: string | null
          discharge_date: string | null
          discharge_reason: string | null
          discharge_summary: string | null
          discharge_validated_at: string | null
          discharge_validated_by: string | null
          doctor_id: string
          establishment_id: string | null
          id: string
          next_appointment_date: string | null
          patient_condition: string | null
          patient_id: string
          recommendations: string | null
          room_id: string | null
          room_number: string | null
          service: string | null
          status: string | null
          stay_status: Database["public"]["Enums"]["stay_state"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admission_date?: string | null
          admission_origin?: string | null
          admission_reason: string
          bed_id?: string | null
          bed_number?: string | null
          business_reference: string
          created_at?: string
          created_by?: string | null
          daily_rate?: number
          deleted_at?: string | null
          discharge_date?: string | null
          discharge_reason?: string | null
          discharge_summary?: string | null
          discharge_validated_at?: string | null
          discharge_validated_by?: string | null
          doctor_id: string
          establishment_id?: string | null
          id?: string
          next_appointment_date?: string | null
          patient_condition?: string | null
          patient_id: string
          recommendations?: string | null
          room_id?: string | null
          room_number?: string | null
          service?: string | null
          status?: string | null
          stay_status?: Database["public"]["Enums"]["stay_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admission_date?: string | null
          admission_origin?: string | null
          admission_reason?: string
          bed_id?: string | null
          bed_number?: string | null
          business_reference?: string
          created_at?: string
          created_by?: string | null
          daily_rate?: number
          deleted_at?: string | null
          discharge_date?: string | null
          discharge_reason?: string | null
          discharge_summary?: string | null
          discharge_validated_at?: string | null
          discharge_validated_by?: string | null
          doctor_id?: string
          establishment_id?: string | null
          id?: string
          next_appointment_date?: string | null
          patient_condition?: string | null
          patient_id?: string
          recommendations?: string | null
          room_id?: string | null
          room_number?: string | null
          service?: string | null
          status?: string | null
          stay_status?: Database["public"]["Enums"]["stay_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitalizations_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["bed_id"]
          },
          {
            foreignKeyName: "hospitalizations_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalizations_discharge_validated_by_fkey"
            columns: ["discharge_validated_by"]
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
            foreignKeyName: "hospitalizations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "hospitalizations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
      medication_lots: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          expires_on: string | null
          id: string
          item_id: string
          location_id: string | null
          lot_number: string
          manufactured_on: string | null
          pharmacy_id: string | null
          quantity: number
          recall_reason: string | null
          recalled_at: string | null
          state: string
          supplier_id: string | null
          unit_cost: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          expires_on?: string | null
          id?: string
          item_id: string
          location_id?: string | null
          lot_number: string
          manufactured_on?: string | null
          pharmacy_id?: string | null
          quantity?: number
          recall_reason?: string | null
          recalled_at?: string | null
          state?: string
          supplier_id?: string | null
          unit_cost?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          expires_on?: string | null
          id?: string
          item_id?: string
          location_id?: string | null
          lot_number?: string
          manufactured_on?: string | null
          pharmacy_id?: string | null
          quantity?: number
          recall_reason?: string | null
          recalled_at?: string | null
          state?: string
          supplier_id?: string | null
          unit_cost?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_lots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_lots_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "medication_lots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_lots_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_lots_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_lots_updated_by_fkey"
            columns: ["updated_by"]
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
      pharmacies: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          id: string
          is_active: boolean
          is_default: boolean
          is_service_cabinet: boolean
          location_id: string | null
          name: string
          pharmacist_id: string | null
          service: string | null
          supplied_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_service_cabinet?: boolean
          location_id?: string | null
          name: string
          pharmacist_id?: string | null
          service?: string | null
          supplied_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_service_cabinet?: boolean
          location_id?: string | null
          name?: string
          pharmacist_id?: string | null
          service?: string | null
          supplied_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacies_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacies_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacies_pharmacist_id_fkey"
            columns: ["pharmacist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacies_supplied_by_fkey"
            columns: ["supplied_by"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_items: {
        Row: {
          administration_route: string | null
          atc_code: string | null
          business_reference: string
          category: string
          controlled_class: string | null
          created_at: string
          created_by: string | null
          default_location_id: string | null
          deleted_at: string | null
          dosage: string | null
          establishment_id: string | null
          expiry_date: string | null
          form: string | null
          generic_name: string | null
          id: string
          is_active: boolean | null
          is_controlled: boolean
          issue_rule: string
          max_stock: number | null
          name: string
          packaging: string | null
          purchase_price: number
          reorder_level: number | null
          stock_quantity: number | null
          storage_conditions: string | null
          unit: string
          unit_price: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          administration_route?: string | null
          atc_code?: string | null
          business_reference: string
          category: string
          controlled_class?: string | null
          created_at?: string
          created_by?: string | null
          default_location_id?: string | null
          deleted_at?: string | null
          dosage?: string | null
          establishment_id?: string | null
          expiry_date?: string | null
          form?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          is_controlled?: boolean
          issue_rule?: string
          max_stock?: number | null
          name: string
          packaging?: string | null
          purchase_price?: number
          reorder_level?: number | null
          stock_quantity?: number | null
          storage_conditions?: string | null
          unit?: string
          unit_price: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          administration_route?: string | null
          atc_code?: string | null
          business_reference?: string
          category?: string
          controlled_class?: string | null
          created_at?: string
          created_by?: string | null
          default_location_id?: string | null
          deleted_at?: string | null
          dosage?: string | null
          establishment_id?: string | null
          expiry_date?: string | null
          form?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          is_controlled?: boolean
          issue_rule?: string
          max_stock?: number | null
          name?: string
          packaging?: string | null
          purchase_price?: number
          reorder_level?: number | null
          stock_quantity?: number | null
          storage_conditions?: string | null
          unit?: string
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
            foreignKeyName: "pharmacy_items_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
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
      platform_identity: {
        Row: {
          address: string
          authorization_number: string
          city: string
          country: string
          created_at: string
          currency: string
          document_templates: Json | null
          email: string
          id: string
          island: string
          legal_mentions: string
          legal_name: string
          logo_url: string
          name: string
          pdf_template: string
          phone: string
          phone_secondary: string
          postal_code: string
          primary_color: string
          secondary_color: string
          short_name: string
          signature_holder: string
          signature_url: string
          singleton: boolean
          slogan: string
          stamp_url: string
          support_email: string
          tax_id: string
          trade_register: string
          updated_at: string
          updated_by: string | null
          website: string
          whatsapp: string
        }
        Insert: {
          address?: string
          authorization_number?: string
          city?: string
          country?: string
          created_at?: string
          currency?: string
          document_templates?: Json | null
          email?: string
          id?: string
          island?: string
          legal_mentions?: string
          legal_name?: string
          logo_url?: string
          name?: string
          pdf_template?: string
          phone?: string
          phone_secondary?: string
          postal_code?: string
          primary_color?: string
          secondary_color?: string
          short_name?: string
          signature_holder?: string
          signature_url?: string
          singleton?: boolean
          slogan?: string
          stamp_url?: string
          support_email?: string
          tax_id?: string
          trade_register?: string
          updated_at?: string
          updated_by?: string | null
          website?: string
          whatsapp?: string
        }
        Update: {
          address?: string
          authorization_number?: string
          city?: string
          country?: string
          created_at?: string
          currency?: string
          document_templates?: Json | null
          email?: string
          id?: string
          island?: string
          legal_mentions?: string
          legal_name?: string
          logo_url?: string
          name?: string
          pdf_template?: string
          phone?: string
          phone_secondary?: string
          postal_code?: string
          primary_color?: string
          secondary_color?: string
          short_name?: string
          signature_holder?: string
          signature_url?: string
          singleton?: boolean
          slogan?: string
          stamp_url?: string
          support_email?: string
          tax_id?: string
          trade_register?: string
          updated_at?: string
          updated_by?: string | null
          website?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_identity_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          pharmacist_note: string | null
          pharmacy_status: string
          status: string | null
          therapeutic_plan_id: string | null
          updated_at: string
          updated_by: string | null
          validated_at: string | null
          validated_by: string | null
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
          pharmacist_note?: string | null
          pharmacy_status?: string
          status?: string | null
          therapeutic_plan_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
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
          pharmacist_note?: string | null
          pharmacy_status?: string
          status?: string | null
          therapeutic_plan_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
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
            foreignKeyName: "prescriptions_therapeutic_plan_id_fkey"
            columns: ["therapeutic_plan_id"]
            isOneToOne: false
            referencedRelation: "therapeutic_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_validated_by_fkey"
            columns: ["validated_by"]
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
      purchase_order_lines: {
        Row: {
          created_at: string
          expires_on: string | null
          id: string
          item_id: string
          lot_number: string | null
          order_id: string
          quantity_ordered: number
          quantity_received: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          id?: string
          item_id: string
          lot_number?: string | null
          order_id: string
          quantity_ordered: number
          quantity_received?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          id?: string
          item_id?: string
          lot_number?: string | null
          order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_mode: string | null
          discount_amount: number
          establishment_id: string
          expected_on: string | null
          id: string
          notes: string | null
          ordered_on: string
          payment_terms: string | null
          pharmacy_id: string | null
          priority: string
          quote_id: string | null
          received_on: string | null
          requisition_id: string | null
          shipping_cost: number
          status: Database["public"]["Enums"]["purchase_state"]
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string
          updated_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_mode?: string | null
          discount_amount?: number
          establishment_id: string
          expected_on?: string | null
          id?: string
          notes?: string | null
          ordered_on?: string
          payment_terms?: string | null
          pharmacy_id?: string | null
          priority?: string
          quote_id?: string | null
          received_on?: string | null
          requisition_id?: string | null
          shipping_cost?: number
          status?: Database["public"]["Enums"]["purchase_state"]
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_mode?: string | null
          discount_amount?: number
          establishment_id?: string
          expected_on?: string | null
          id?: string
          notes?: string | null
          ordered_on?: string
          payment_terms?: string | null
          pharmacy_id?: string | null
          priority?: string
          quote_id?: string | null
          received_on?: string | null
          requisition_id?: string | null
          shipping_cost?: number
          status?: Database["public"]["Enums"]["purchase_state"]
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipt_lines: {
        Row: {
          created_at: string
          expires_on: string | null
          id: string
          item_id: string
          lot_number: string | null
          manufactured_on: string | null
          observations: string | null
          order_line_id: string | null
          quantity_received: number
          receipt_id: string
          serial_number: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          id?: string
          item_id: string
          lot_number?: string | null
          manufactured_on?: string | null
          observations?: string | null
          order_line_id?: string | null
          quantity_received: number
          receipt_id: string
          serial_number?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          id?: string
          item_id?: string
          lot_number?: string | null
          manufactured_on?: string | null
          observations?: string | null
          order_line_id?: string | null
          quantity_received?: number
          receipt_id?: string
          serial_number?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipt_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_receipt_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipts: {
        Row: {
          business_reference: string
          controlled_at: string | null
          controlled_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_note: string | null
          establishment_id: string
          id: string
          notes: string | null
          order_id: string
          pharmacy_id: string | null
          quality_note: string | null
          quality_result: Database["public"]["Enums"]["quality_result"] | null
          received_by: string | null
          received_on: string
          stocked_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          controlled_at?: string | null
          controlled_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_note?: string | null
          establishment_id: string
          id?: string
          notes?: string | null
          order_id: string
          pharmacy_id?: string | null
          quality_note?: string | null
          quality_result?: Database["public"]["Enums"]["quality_result"] | null
          received_by?: string | null
          received_on?: string
          stocked_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          controlled_at?: string | null
          controlled_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_note?: string | null
          establishment_id?: string
          id?: string
          notes?: string | null
          order_id?: string
          pharmacy_id?: string | null
          quality_note?: string | null
          quality_result?: Database["public"]["Enums"]["quality_result"] | null
          received_by?: string | null
          received_on?: string
          stocked_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_controlled_by_fkey"
            columns: ["controlled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisition_lines: {
        Row: {
          created_at: string
          estimated_price: number
          id: string
          item_id: string | null
          label: string
          notes: string | null
          quantity: number
          requisition_id: string
          unit: string | null
        }
        Insert: {
          created_at?: string
          estimated_price?: number
          id?: string
          item_id?: string | null
          label: string
          notes?: string | null
          quantity: number
          requisition_id: string
          unit?: string | null
        }
        Update: {
          created_at?: string
          estimated_price?: number
          id?: string
          item_id?: string | null
          label?: string
          notes?: string | null
          quantity?: number
          requisition_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisition_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisition_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "purchase_requisition_lines_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisitions: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          deleted_at: string | null
          establishment_id: string
          id: string
          justification: string
          needed_by: string | null
          pharmacy_id: string | null
          priority: string
          requested_by: string | null
          requesting_service: string
          status: Database["public"]["Enums"]["requisition_state"]
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          deleted_at?: string | null
          establishment_id: string
          id?: string
          justification: string
          needed_by?: string | null
          pharmacy_id?: string | null
          priority?: string
          requested_by?: string | null
          requesting_service: string
          status?: Database["public"]["Enums"]["requisition_state"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          deleted_at?: string | null
          establishment_id?: string
          id?: string
          justification?: string
          needed_by?: string | null
          pharmacy_id?: string | null
          priority?: string
          requested_by?: string | null
          requesting_service?: string
          status?: Database["public"]["Enums"]["requisition_state"]
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      rooms: {
        Row: {
          business_reference: string
          capacity: number
          code: string
          created_at: string
          created_by: string | null
          daily_rate: number
          deleted_at: string | null
          establishment_id: string
          floor: string | null
          id: string
          name: string | null
          notes: string | null
          room_type: string
          service: string | null
          status: Database["public"]["Enums"]["room_state"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          capacity?: number
          code: string
          created_at?: string
          created_by?: string | null
          daily_rate?: number
          deleted_at?: string | null
          establishment_id: string
          floor?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          room_type: string
          service?: string | null
          status?: Database["public"]["Enums"]["room_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          capacity?: number
          code?: string
          created_at?: string
          created_by?: string | null
          daily_rate?: number
          deleted_at?: string | null
          establishment_id?: string
          floor?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          room_type?: string
          service?: string | null
          status?: Database["public"]["Enums"]["room_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      stock_inventories: {
        Row: {
          business_reference: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          id: string
          inventory_type: string
          location_id: string | null
          notes: string | null
          pharmacy_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["inventory_state"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          id?: string
          inventory_type?: string
          location_id?: string | null
          notes?: string | null
          pharmacy_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["inventory_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          id?: string
          inventory_type?: string
          location_id?: string | null
          notes?: string | null
          pharmacy_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["inventory_state"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_inventories_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventories_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventories_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventories_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventories_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_inventory_lines: {
        Row: {
          comment: string | null
          counted_at: string | null
          counted_by: string | null
          counted_quantity: number | null
          created_at: string
          expected_quantity: number
          id: string
          inventory_id: string
          item_id: string
          lot_id: string | null
          variance: number | null
        }
        Insert: {
          comment?: string | null
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          expected_quantity?: number
          id?: string
          inventory_id: string
          item_id: string
          lot_id?: string | null
          variance?: number | null
        }
        Update: {
          comment?: string | null
          counted_at?: string | null
          counted_by?: string | null
          counted_quantity?: number | null
          created_at?: string
          expected_quantity?: number
          id?: string
          inventory_id?: string
          item_id?: string
          lot_id?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_inventory_lines_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_lines_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "stock_inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_inventory_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "medication_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          business_reference: string
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["stock_location_level"]
          manager_id: string | null
          name: string
          parent_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          id?: string
          is_active?: boolean
          level: Database["public"]["Enums"]["stock_location_level"]
          manager_id?: string | null
          name: string
          parent_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["stock_location_level"]
          manager_id?: string | null
          name?: string
          parent_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_locations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          establishment_id: string
          id: string
          item_id: string
          kind: Database["public"]["Enums"]["stock_movement_kind"]
          location_id: string | null
          lot_id: string | null
          occurred_at: string
          patient_id: string | null
          performed_by: string | null
          pharmacy_id: string | null
          quantity: number
          reason: string | null
          source_id: string | null
          source_table: string | null
          unit_cost: number
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          establishment_id: string
          id?: string
          item_id: string
          kind: Database["public"]["Enums"]["stock_movement_kind"]
          location_id?: string | null
          lot_id?: string | null
          occurred_at?: string
          patient_id?: string | null
          performed_by?: string | null
          pharmacy_id?: string | null
          quantity: number
          reason?: string | null
          source_id?: string | null
          source_table?: string | null
          unit_cost?: number
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          establishment_id?: string
          id?: string
          item_id?: string
          kind?: Database["public"]["Enums"]["stock_movement_kind"]
          location_id?: string | null
          lot_id?: string | null
          occurred_at?: string
          patient_id?: string | null
          performed_by?: string | null
          pharmacy_id?: string | null
          quantity?: number
          reason?: string | null
          source_id?: string | null
          source_table?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "medication_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_lines: {
        Row: {
          created_at: string
          id: string
          item_id: string
          lot_id: string | null
          quantity_requested: number
          quantity_shipped: number
          transfer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          lot_id?: string | null
          quantity_requested: number
          quantity_shipped?: number
          transfer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          lot_id?: string | null
          quantity_requested?: number
          quantity_shipped?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "medication_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          from_pharmacy_id: string
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          requested_by: string | null
          requested_on: string
          shipped_at: string | null
          shipped_by: string | null
          status: string
          to_pharmacy_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          from_pharmacy_id: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          requested_by?: string | null
          requested_on?: string
          shipped_at?: string | null
          shipped_by?: string | null
          status?: string
          to_pharmacy_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          from_pharmacy_id?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          requested_by?: string | null
          requested_on?: string
          shipped_at?: string | null
          shipped_by?: string | null
          status?: string
          to_pharmacy_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_pharmacy_id_fkey"
            columns: ["from_pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_shipped_by_fkey"
            columns: ["shipped_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_pharmacy_id_fkey"
            columns: ["to_pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_updated_by_fkey"
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
      subscription_invoices: {
        Row: {
          base_monthly_price: number
          business_reference: string
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          discount_amount: number
          due_on: string | null
          duration_months: number
          establishment_id: string
          id: string
          issued_on: string
          monthly_price: number
          notes: string | null
          paid_amount: number
          payment_method: string | null
          period_end: string
          period_start: string
          plan_name: string
          status: Database["public"]["Enums"]["billing_state"]
          subscription_id: string | null
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_monthly_price?: number
          business_reference: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          discount_amount?: number
          due_on?: string | null
          duration_months: number
          establishment_id: string
          id?: string
          issued_on?: string
          monthly_price?: number
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          period_end: string
          period_start: string
          plan_name: string
          status?: Database["public"]["Enums"]["billing_state"]
          subscription_id?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_monthly_price?: number
          business_reference?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          discount_amount?: number
          due_on?: string | null
          duration_months?: number
          establishment_id?: string
          id?: string
          issued_on?: string
          monthly_price?: number
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          period_end?: string
          period_start?: string
          plan_name?: string
          status?: Database["public"]["Enums"]["billing_state"]
          subscription_id?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          id: string
          invoice_id: string
          notes: string | null
          paid_on: string
          payment_method: string
          recorded_by: string | null
          transaction_reference: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          id?: string
          invoice_id: string
          notes?: string | null
          paid_on?: string
          payment_method: string
          recorded_by?: string | null
          transaction_reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          recorded_by?: string | null
          transaction_reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "subscription_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      supplier_quote_lines: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          label: string
          quantity: number
          quote_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          label: string
          quantity: number
          quote_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          label?: string
          quantity?: number
          quote_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quote_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quote_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "supplier_quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotes: {
        Row: {
          business_reference: string
          consultation_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_days: number | null
          establishment_id: string
          id: string
          is_selected: boolean
          notes: string | null
          payment_terms: string | null
          quality_note: number | null
          received_on: string | null
          requested_on: string
          requisition_id: string | null
          selection_reason: string | null
          shipping_cost: number
          supplier_id: string
          total_amount: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          warranty_months: number | null
        }
        Insert: {
          business_reference: string
          consultation_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_days?: number | null
          establishment_id: string
          id?: string
          is_selected?: boolean
          notes?: string | null
          payment_terms?: string | null
          quality_note?: number | null
          received_on?: string | null
          requested_on?: string
          requisition_id?: string | null
          selection_reason?: string | null
          shipping_cost?: number
          supplier_id: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          warranty_months?: number | null
        }
        Update: {
          business_reference?: string
          consultation_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_days?: number | null
          establishment_id?: string
          id?: string
          is_selected?: boolean
          notes?: string | null
          payment_terms?: string | null
          quality_note?: number | null
          received_on?: string | null
          requested_on?: string
          requisition_id?: string | null
          selection_reason?: string | null
          shipping_cost?: number
          supplier_id?: string
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_return_lines: {
        Row: {
          created_at: string
          id: string
          item_id: string
          lot_id: string | null
          observations: string | null
          quantity: number
          return_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          lot_id?: string | null
          observations?: string | null
          quantity: number
          return_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          lot_id?: string | null
          observations?: string | null
          quantity?: number
          return_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_return_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_return_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "supplier_return_lines_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "medication_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_return_lines_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "supplier_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_returns: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          credit_amount: number
          deleted_at: string | null
          establishment_id: string
          id: string
          order_id: string | null
          pharmacy_id: string | null
          posted_at: string | null
          reason: string
          receipt_id: string | null
          return_type: string
          returned_on: string
          status: string
          supplier_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          deleted_at?: string | null
          establishment_id: string
          id?: string
          order_id?: string | null
          pharmacy_id?: string | null
          posted_at?: string | null
          reason: string
          receipt_id?: string | null
          return_type?: string
          returned_on?: string
          status?: string
          supplier_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          deleted_at?: string | null
          establishment_id?: string
          id?: string
          order_id?: string | null
          pharmacy_id?: string | null
          posted_at?: string | null
          reason?: string
          receipt_id?: string | null
          return_type?: string
          returned_on?: string
          status?: string
          supplier_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          average_lead_days: number | null
          business_reference: string
          city: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          establishment_id: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          product_categories: string[] | null
          rating: number | null
          supplier_type: string
          tax_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          average_lead_days?: number | null
          business_reference: string
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          establishment_id: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          product_categories?: string[] | null
          rating?: number | null
          supplier_type?: string
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          average_lead_days?: number | null
          business_reference?: string
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          establishment_id?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          product_categories?: string[] | null
          rating?: number | null
          supplier_type?: string
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_updated_by_fkey"
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
      therapeutic_plan_lines: {
        Row: {
          administration_times: string[] | null
          created_at: string
          dosage: string | null
          duration_days: number | null
          frequency: string | null
          id: string
          instructions: string | null
          is_continuous: boolean
          item_id: string | null
          medication_label: string
          plan_id: string
          quantity_per_intake: number | null
          route: string | null
          status: string
          treatment_type: string
          updated_at: string
        }
        Insert: {
          administration_times?: string[] | null
          created_at?: string
          dosage?: string | null
          duration_days?: number | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          is_continuous?: boolean
          item_id?: string | null
          medication_label: string
          plan_id: string
          quantity_per_intake?: number | null
          route?: string | null
          status?: string
          treatment_type?: string
          updated_at?: string
        }
        Update: {
          administration_times?: string[] | null
          created_at?: string
          dosage?: string | null
          duration_days?: number | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          is_continuous?: boolean
          item_id?: string | null
          medication_label?: string
          plan_id?: string
          quantity_per_intake?: number | null
          route?: string | null
          status?: string
          treatment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapeutic_plan_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapeutic_plan_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "therapeutic_plan_lines_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "therapeutic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      therapeutic_plans: {
        Row: {
          business_reference: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          doctor_id: string | null
          ended_on: string | null
          establishment_id: string
          hospitalization_id: string | null
          id: string
          indication: string | null
          label: string
          notes: string | null
          patient_id: string
          started_on: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id?: string | null
          ended_on?: string | null
          establishment_id: string
          hospitalization_id?: string | null
          id?: string
          indication?: string | null
          label: string
          notes?: string | null
          patient_id: string
          started_on?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doctor_id?: string | null
          ended_on?: string | null
          establishment_id?: string
          hospitalization_id?: string | null
          id?: string
          indication?: string | null
          label?: string
          notes?: string | null
          patient_id?: string
          started_on?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapeutic_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapeutic_plans_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapeutic_plans_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapeutic_plans_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["hospitalization_id"]
          },
          {
            foreignKeyName: "therapeutic_plans_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapeutic_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapeutic_plans_updated_by_fkey"
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
      ward_round_administrations: {
        Row: {
          administered_at: string | null
          administered_by: string | null
          created_at: string
          hospitalization_id: string
          id: string
          item_id: string | null
          medication_label: string
          observations: string | null
          plan_line_id: string | null
          quantity: number
          refusal_reason: string | null
          round_id: string
          status: string
          updated_at: string
        }
        Insert: {
          administered_at?: string | null
          administered_by?: string | null
          created_at?: string
          hospitalization_id: string
          id?: string
          item_id?: string | null
          medication_label: string
          observations?: string | null
          plan_line_id?: string | null
          quantity: number
          refusal_reason?: string | null
          round_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          administered_at?: string | null
          administered_by?: string | null
          created_at?: string
          hospitalization_id?: string
          id?: string
          item_id?: string | null
          medication_label?: string
          observations?: string | null
          plan_line_id?: string | null
          quantity?: number
          refusal_reason?: string | null
          round_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ward_round_administrations_administered_by_fkey"
            columns: ["administered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_round_administrations_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "bed_availability"
            referencedColumns: ["hospitalization_id"]
          },
          {
            foreignKeyName: "ward_round_administrations_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_round_administrations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_round_administrations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_stock_state"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "ward_round_administrations_plan_line_id_fkey"
            columns: ["plan_line_id"]
            isOneToOne: false
            referencedRelation: "therapeutic_plan_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_round_administrations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "ward_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      ward_rounds: {
        Row: {
          business_reference: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          establishment_id: string
          id: string
          notes: string | null
          pharmacy_id: string | null
          prepared_by: string | null
          round_date: string
          service: string | null
          slot: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          business_reference: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id: string
          id?: string
          notes?: string | null
          pharmacy_id?: string | null
          prepared_by?: string | null
          round_date?: string
          service?: string | null
          slot?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          business_reference?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          establishment_id?: string
          id?: string
          notes?: string | null
          pharmacy_id?: string | null
          prepared_by?: string | null
          round_date?: string
          service?: string | null
          slot?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ward_rounds_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_rounds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_rounds_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_rounds_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_rounds_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ward_rounds_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bed_availability: {
        Row: {
          admission_date: string | null
          available_from: string | null
          bed_code: string | null
          bed_id: string | null
          bed_reference: string | null
          bed_status: Database["public"]["Enums"]["bed_state"] | null
          capacity: number | null
          daily_rate: number | null
          establishment_id: string | null
          floor: string | null
          hospitalization_id: string | null
          is_assignable: boolean | null
          patient_id: string | null
          room_code: string | null
          room_id: string | null
          room_name: string | null
          room_status: Database["public"]["Enums"]["room_state"] | null
          room_type: string | null
          service: string | null
          stay_status: Database["public"]["Enums"]["stay_state"] | null
        }
        Relationships: [
          {
            foreignKeyName: "beds_establishment_id_fkey"
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
        ]
      }
      pharmacy_stock_state: {
        Row: {
          business_reference: string | null
          category: string | null
          dosage: string | null
          effective_reorder_level: number | null
          establishment_id: string | null
          expired_quantity: number | null
          expiring_quantity: number | null
          form: string | null
          generic_name: string | null
          is_controlled: boolean | null
          issue_rule: string | null
          item_id: string | null
          lot_count: number | null
          lot_quantity: number | null
          name: string | null
          next_expiry: string | null
          purchase_price: number | null
          stock_quantity: number | null
          stock_value: number | null
          unit: string | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_items_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      close_stock_inventory: {
        Args: { p_inventory_id: string; p_user: string }
        Returns: number
      }
      current_establishment_id: { Args: never; Returns: string }
      default_module_settings: { Args: never; Returns: Json }
      emit_subscription_expiry_alerts: { Args: never; Returns: number }
      is_establishment_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      issue_subscription_invoice: {
        Args: { p_subscription_id: string; p_user?: string }
        Returns: string
      }
      post_purchase_receipt: {
        Args: { p_receipt_id: string; p_user: string }
        Returns: number
      }
      post_supplier_return: {
        Args: { p_return_id: string; p_user: string }
        Returns: number
      }
      purge_expired_audit_logs: { Args: never; Returns: number }
      refresh_overdue_invoices: { Args: never; Returns: number }
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
      ship_stock_transfer: {
        Args: { p_transfer_id: string; p_user: string }
        Returns: number
      }
      subscription_state_of: {
        Args: {
          end_date: string
          status: Database["public"]["Enums"]["subscription_state"]
        }
        Returns: string
      }
      suggest_lots: {
        Args: { p_item_id: string; p_pharmacy_id: string; p_quantity: number }
        Returns: {
          available: number
          expires_on: string
          lot_id: string
          lot_number: string
          take: number
        }[]
      }
    }
    Enums: {
      bed_state:
        | "available"
        | "occupied"
        | "reserved"
        | "cleaning"
        | "out_of_service"
      billing_state:
        | "draft"
        | "issued"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "canceled"
      dispensation_channel: "prescription" | "sale" | "ward_round"
      dispensation_state:
        | "prepared"
        | "partially_delivered"
        | "delivered"
        | "canceled"
        | "returned"
      establishment_type:
        | "cabinet"
        | "clinique"
        | "centre_medical"
        | "hopital"
        | "laboratoire"
        | "imagerie"
        | "ong"
      inventory_state: "open" | "counted" | "closed" | "canceled"
      license_state: "active" | "suspended" | "expired" | "terminated"
      purchase_state:
        | "draft"
        | "awaiting_validation"
        | "validated"
        | "ordered"
        | "partially_received"
        | "received"
        | "closed"
        | "canceled"
      quality_result: "accepted" | "accepted_with_reserve" | "refused"
      requisition_state:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "ordered"
        | "closed"
        | "canceled"
      room_state: "available" | "occupied" | "maintenance" | "closed"
      stay_state:
        | "pre_admission"
        | "admitted"
        | "in_stay"
        | "transferring"
        | "discharge_planned"
        | "discharged"
        | "canceled"
        | "archived"
      stock_location_level:
        | "site"
        | "warehouse"
        | "zone"
        | "aisle"
        | "shelf"
        | "tier"
        | "bin"
      stock_movement_kind:
        | "entry"
        | "exit"
        | "transfer_in"
        | "transfer_out"
        | "adjustment"
        | "return"
        | "correction"
        | "inventory"
        | "destruction"
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
      bed_state: [
        "available",
        "occupied",
        "reserved",
        "cleaning",
        "out_of_service",
      ],
      billing_state: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "overdue",
        "canceled",
      ],
      dispensation_channel: ["prescription", "sale", "ward_round"],
      dispensation_state: [
        "prepared",
        "partially_delivered",
        "delivered",
        "canceled",
        "returned",
      ],
      establishment_type: [
        "cabinet",
        "clinique",
        "centre_medical",
        "hopital",
        "laboratoire",
        "imagerie",
        "ong",
      ],
      inventory_state: ["open", "counted", "closed", "canceled"],
      license_state: ["active", "suspended", "expired", "terminated"],
      purchase_state: [
        "draft",
        "awaiting_validation",
        "validated",
        "ordered",
        "partially_received",
        "received",
        "closed",
        "canceled",
      ],
      quality_result: ["accepted", "accepted_with_reserve", "refused"],
      requisition_state: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "ordered",
        "closed",
        "canceled",
      ],
      room_state: ["available", "occupied", "maintenance", "closed"],
      stay_state: [
        "pre_admission",
        "admitted",
        "in_stay",
        "transferring",
        "discharge_planned",
        "discharged",
        "canceled",
        "archived",
      ],
      stock_location_level: [
        "site",
        "warehouse",
        "zone",
        "aisle",
        "shelf",
        "tier",
        "bin",
      ],
      stock_movement_kind: [
        "entry",
        "exit",
        "transfer_in",
        "transfer_out",
        "adjustment",
        "return",
        "correction",
        "inventory",
        "destruction",
      ],
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
