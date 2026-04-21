/**
 * Placeholder — `npm run types:gen` 로 Supabase에서 재생성한다.
 * M2 단계에서는 최소 테이블명을 any로 두고, 생성 후 정확한 Row 타입으로 대체.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      auth_failed_logins: {
        Row: {
          id: string;
          email: string;
          ip: string;
          user_agent: string | null;
          reason: "invalid_password" | "unknown_email" | "locked" | "oauth_denied";
          attempted_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          ip: string;
          user_agent?: string | null;
          reason: "invalid_password" | "unknown_email" | "locked" | "oauth_denied";
          attempted_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["auth_failed_logins"]["Insert"]>;
      };
      auth_login_lockouts: {
        Row: {
          email: string;
          ip: string;
          consecutive_failures: number;
          locked_until: string | null;
          updated_at: string;
        };
        Insert: {
          email: string;
          ip: string;
          consecutive_failures?: number;
          locked_until?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["auth_login_lockouts"]["Insert"]>;
      };
      games: {
        Row: {
          id: string;
          slug: string;
          name_ko: string;
          name_en: string | null;
          name_ja: string | null;
          is_active: boolean;
          thumbnail_url: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      users: {
        Row: {
          id: string;
          nickname: string;
          email: string;
          auto_login: boolean;
          birth_year: number;
          gender: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      user_game_profiles: {
        Row: {
          id: string;
          user_id: string;
          game_id: string;
          game_uid: string;
          is_verified: boolean;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      clan_members: {
        Row: {
          id: string;
          clan_id: string;
          user_id: string;
          role: string;
          status: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      clans: {
        Row: {
          id: string;
          game_id: string;
          name: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
