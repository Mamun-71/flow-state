// Hand-written to match supabase/schema.sql.
// Can be regenerated with: npx supabase gen types typescript --project-id <id> > lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TaskStatus = "todo" | "in_progress" | "done";
export type UserRole = "user" | "super_admin";

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
  task_count: number;
  done_count: number;
  tracked_seconds: number;
  tracked_seconds_30d: number;
  last_active_at: string | null;
};
export type SessionSource = "timer" | "manual";

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          color?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      subcategories: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          category_id: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subcategories"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          subcategory_id: string | null;
          title: string;
          description: string | null;
          planned_date: string;
          estimated_minutes: number;
          status: TaskStatus;
          sort_order: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          category_id: string;
          subcategory_id?: string | null;
          title: string;
          description?: string | null;
          planned_date: string;
          estimated_minutes: number;
          status?: TaskStatus;
          sort_order?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "tasks_subcategory_id_category_id_fkey";
            columns: ["subcategory_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id", "category_id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      time_sessions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          started_at: string;
          ended_at: string | null;
          source: SessionSource;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          task_id: string;
          started_at?: string;
          ended_at?: string | null;
          source?: SessionSource;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["time_sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "time_sessions_task_id_user_id_fkey";
            columns: ["task_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      start_timer: { Args: { p_task_id: string }; Returns: undefined };
      pause_timer: { Args: Record<PropertyKey, never>; Returns: undefined };
      complete_task: { Args: { p_task_id: string }; Returns: undefined };
      stop_timer_at: { Args: { p_ended_at: string }; Returns: undefined };
      reorder_tasks: { Args: { p_status: string; p_ids: string[] }; Returns: undefined };
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      admin_user_overview: { Args: Record<PropertyKey, never>; Returns: AdminUserRow[] };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TimeSession = Database["public"]["Tables"]["time_sessions"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
