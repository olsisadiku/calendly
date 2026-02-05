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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      lesson_instances: {
        Row: {
          actual_date: string
          actual_start_time: string | null
          actual_end_time: string | null
          id: string
          original_date: string
          rescheduled_from: string | null
          schedule_id: string
          status: string
        }
        Insert: {
          actual_date: string
          actual_start_time?: string | null
          actual_end_time?: string | null
          id?: string
          original_date: string
          rescheduled_from?: string | null
          schedule_id: string
          status?: string
        }
        Update: {
          actual_date?: string
          actual_start_time?: string | null
          actual_end_time?: string | null
          id?: string
          original_date?: string
          rescheduled_from?: string | null
          schedule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_instances_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          id: string
          lessons_count: number
          marked_paid_by: string | null
          match_id: string
          paid_at: string | null
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          id?: string
          lessons_count?: number
          marked_paid_by?: string | null
          match_id: string
          paid_at?: string | null
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          id?: string
          lessons_count?: number
          marked_paid_by?: string | null
          match_id?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_marked_paid_by_fkey"
            columns: ["marked_paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "student_teacher_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          display_name: string | null
          email: string
          id: string
          is_superuser: boolean | null
          role: string | null
          timezone: string | null
        }
        Insert: {
          display_name?: string | null
          email: string
          id: string
          is_superuser?: boolean | null
          role?: string | null
          timezone?: string | null
        }
        Update: {
          display_name?: string | null
          email?: string
          id?: string
          is_superuser?: boolean | null
          role?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          match_id: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          match_id: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          match_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "student_teacher_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      student_teacher_matches: {
        Row: {
          id: string
          is_active: boolean
          matched_at: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          matched_at?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          matched_at?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_teacher_matches_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_teacher_matches_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          teacher_id: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          teacher_id: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_teacher_id_fkey"
            columns: ["teacher_id"]
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
      get_lessons_for_period: {
        Args: { p_end_date: string; p_match_id: string; p_start_date: string }
        Returns: {
          actual_date: string
          day_of_week: number
          end_time: string
          instance_id: string
          lesson_date: string
          rescheduled_from: string
          schedule_id: string
          start_time: string
          status: string
        }[]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type TeacherAvailability = Database['public']['Tables']['teacher_availability']['Row']
export type StudentTeacherMatch = Database['public']['Tables']['student_teacher_matches']['Row']
export type RecurringSchedule = Database['public']['Tables']['recurring_schedules']['Row']
export type LessonInstance = Database['public']['Tables']['lesson_instances']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']

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
