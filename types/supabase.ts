export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      files: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          size: number
          type: string
          path: string
          user_id: string
          parent_id: string | null
          is_folder: boolean
          is_favorite: boolean
          is_trashed: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          size: number
          type: string
          path: string
          user_id: string
          parent_id?: string | null
          is_folder?: boolean
          is_favorite?: boolean
          is_trashed?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          size?: number
          type?: string
          path?: string
          user_id?: string
          parent_id?: string | null
          is_folder?: boolean
          is_favorite?: boolean
          is_trashed?: boolean
          metadata?: Json | null
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          storage_used: number
          storage_limit: number
        }
        Insert: {
          id: string
          created_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          storage_used?: number
          storage_limit?: number
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          storage_used?: number
          storage_limit?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 