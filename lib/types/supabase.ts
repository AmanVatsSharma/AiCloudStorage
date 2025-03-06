export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      files: {
        Row: {
          id: string;
          name: string;
          size: number;
          type: string;
          path: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
          parent_id: string | null;
          is_folder: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          size: number;
          type: string;
          path: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
          parent_id?: string | null;
          is_folder?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          size?: number;
          type?: string;
          path?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
          parent_id?: string | null;
          is_folder?: boolean;
        };
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [key: string]: string[];
    };
  };
}; 