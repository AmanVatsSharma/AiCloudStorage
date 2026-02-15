/**
 * Canonical Supabase type map used by the web application.
 * Keep this file aligned with the active database schema and remove
 * duplicate schema definitions elsewhere.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TeamRole = "owner" | "admin" | "member";
type ShareAccessLevel = "view" | "edit";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          storage_used: number;
          storage_limit: number;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          storage_used?: number;
          storage_limit?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          storage_used?: number;
          storage_limit?: number;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          storage_used: number;
          storage_limit: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          storage_used?: number;
          storage_limit?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          storage_used?: number;
          storage_limit?: number;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      files: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          size: number;
          type: string;
          path: string | null;
          user_id: string;
          parent_id: string | null;
          is_folder: boolean;
          is_favorite: boolean;
          is_trashed: boolean;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          size: number;
          type: string;
          path?: string | null;
          user_id: string;
          parent_id?: string | null;
          is_folder?: boolean;
          is_favorite?: boolean;
          is_trashed?: boolean;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          size?: number;
          type?: string;
          path?: string | null;
          user_id?: string;
          parent_id?: string | null;
          is_folder?: boolean;
          is_favorite?: boolean;
          is_trashed?: boolean;
          metadata?: Json | null;
        };
      };
      shared_files: {
        Row: {
          id: string;
          file_id: string;
          owner_id: string;
          shared_with: string | null;
          is_public: boolean;
          expires_at: string | null;
          password: string | null;
          allow_download: boolean;
          access_level: ShareAccessLevel;
          created_at: string;
        };
        Insert: {
          id?: string;
          file_id: string;
          owner_id: string;
          shared_with?: string | null;
          is_public?: boolean;
          expires_at?: string | null;
          password?: string | null;
          allow_download?: boolean;
          access_level?: ShareAccessLevel;
          created_at?: string;
        };
        Update: {
          id?: string;
          file_id?: string;
          owner_id?: string;
          shared_with?: string | null;
          is_public?: boolean;
          expires_at?: string | null;
          password?: string | null;
          allow_download?: boolean;
          access_level?: ShareAccessLevel;
          created_at?: string;
        };
      };
      file_versions: {
        Row: {
          id: string;
          file_id: string;
          version: number;
          size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          file_id: string;
          version: number;
          size: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          file_id?: string;
          version?: number;
          size?: number;
          created_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          color: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          color?: string;
          created_at?: string;
        };
      };
      file_tags: {
        Row: {
          id: string;
          file_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          file_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          file_id?: string;
          tag_id?: string;
          created_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: TeamRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: TeamRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: TeamRole;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_team_with_owner: {
        Args: {
          p_name: string;
          p_description?: string | null;
          p_owner_id: string;
        };
        Returns: string;
      };
      get_user_teams: {
        Args: {
          p_user_id: string;
        };
        Returns: Array<{
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          created_at: string;
          is_owner: boolean;
          member_count: number;
        }>;
      };
      get_team_members: {
        Args: {
          p_team_id: string;
          p_user_id: string;
        };
        Returns: Array<{
          id: string;
          user_id: string;
          team_id: string;
          role: TeamRole;
          created_at: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
        }>;
      };
      add_team_member: {
        Args: {
          p_team_id: string;
          p_user_id: string;
          p_member_email: string;
          p_role?: TeamRole;
        };
        Returns: string;
      };
      remove_team_member: {
        Args: {
          p_team_id: string;
          p_user_id: string;
          p_member_id: string;
        };
        Returns: boolean;
      };
      update_team: {
        Args: {
          p_team_id: string;
          p_user_id: string;
          p_name: string;
          p_description?: string | null;
        };
        Returns: boolean;
      };
      delete_team: {
        Args: {
          p_team_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}