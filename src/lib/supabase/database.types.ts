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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      auth_failed_logins: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip: unknown
          reason: Database["public"]["Enums"]["auth_failed_login_reason"]
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip: unknown
          reason: Database["public"]["Enums"]["auth_failed_login_reason"]
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip?: unknown
          reason?: Database["public"]["Enums"]["auth_failed_login_reason"]
          user_agent?: string | null
        }
        Relationships: []
      }
      auth_login_lockouts: {
        Row: {
          consecutive_failures: number
          email: string
          ip: unknown
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          consecutive_failures?: number
          email: string
          ip: unknown
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          consecutive_failures?: number
          email?: string
          ip?: unknown
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clan_members: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          joined_at: string | null
          last_activity_at: string | null
          last_participated_at: string | null
          role: Database["public"]["Enums"]["clan_member_role"]
          status: Database["public"]["Enums"]["clan_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          last_activity_at?: string | null
          last_participated_at?: string | null
          role?: Database["public"]["Enums"]["clan_member_role"]
          status?: Database["public"]["Enums"]["clan_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          last_activity_at?: string | null
          last_participated_at?: string | null
          role?: Database["public"]["Enums"]["clan_member_role"]
          status?: Database["public"]["Enums"]["clan_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_members_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clans: {
        Row: {
          banner_url: string | null
          coin_balance: number
          created_at: string
          description: string | null
          discord_url: string | null
          game_id: string
          gender_policy: Database["public"]["Enums"]["clan_gender_policy"]
          icon_url: string | null
          id: string
          kakao_url: string | null
          last_activity_at: string | null
          lifecycle_status: Database["public"]["Enums"]["clan_lifecycle"]
          max_members: number
          min_birth_year: number | null
          moderation_status: Database["public"]["Enums"]["clan_moderation"]
          name: string
          ownership_transferred_at: string | null
          rules: string | null
          style: Database["public"]["Enums"]["clan_style"] | null
          tags: string[]
          tier_range: string[]
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          coin_balance?: number
          created_at?: string
          description?: string | null
          discord_url?: string | null
          game_id: string
          gender_policy?: Database["public"]["Enums"]["clan_gender_policy"]
          icon_url?: string | null
          id?: string
          kakao_url?: string | null
          last_activity_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["clan_lifecycle"]
          max_members?: number
          min_birth_year?: number | null
          moderation_status?: Database["public"]["Enums"]["clan_moderation"]
          name: string
          ownership_transferred_at?: string | null
          rules?: string | null
          style?: Database["public"]["Enums"]["clan_style"] | null
          tags?: string[]
          tier_range?: string[]
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          coin_balance?: number
          created_at?: string
          description?: string | null
          discord_url?: string | null
          game_id?: string
          gender_policy?: Database["public"]["Enums"]["clan_gender_policy"]
          icon_url?: string | null
          id?: string
          kakao_url?: string | null
          last_activity_at?: string | null
          lifecycle_status?: Database["public"]["Enums"]["clan_lifecycle"]
          max_members?: number
          min_birth_year?: number | null
          moderation_status?: Database["public"]["Enums"]["clan_moderation"]
          name?: string
          ownership_transferred_at?: string | null
          rules?: string | null
          style?: Database["public"]["Enums"]["clan_style"] | null
          tags?: string[]
          tier_range?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clans_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_en: string | null
          name_ja: string | null
          name_ko: string
          slug: string
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_ja?: string | null
          name_ko: string
          slug: string
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string | null
          name_ja?: string | null
          name_ko?: string
          slug?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      user_game_profiles: {
        Row: {
          created_at: string
          game_id: string
          game_uid: string
          id: string
          is_verified: boolean
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          game_id: string
          game_uid: string
          id?: string
          is_verified?: boolean
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string
          game_uid?: string
          id?: string
          is_verified?: boolean
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_game_profiles_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_game_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auto_login: boolean
          birth_year: number
          coin_balance: number
          created_at: string
          discord_linked_at: string | null
          discord_user_id: string | null
          email: string
          gender: Database["public"]["Enums"]["user_gender"]
          id: string
          language: Database["public"]["Enums"]["user_language"]
          minor_guardian_consent_at: string | null
          nickname: string
          password_updated_at: string | null
          updated_at: string
        }
        Insert: {
          auto_login?: boolean
          birth_year: number
          coin_balance?: number
          created_at?: string
          discord_linked_at?: string | null
          discord_user_id?: string | null
          email: string
          gender?: Database["public"]["Enums"]["user_gender"]
          id: string
          language?: Database["public"]["Enums"]["user_language"]
          minor_guardian_consent_at?: string | null
          nickname: string
          password_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_login?: boolean
          birth_year?: number
          coin_balance?: number
          created_at?: string
          discord_linked_at?: string | null
          discord_user_id?: string | null
          email?: string
          gender?: Database["public"]["Enums"]["user_gender"]
          id?: string
          language?: Database["public"]["Enums"]["user_language"]
          minor_guardian_consent_at?: string | null
          nickname?: string
          password_updated_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      auth_failed_login_reason:
        | "invalid_password"
        | "unknown_email"
        | "locked"
        | "oauth_denied"
      clan_gender_policy: "all" | "male" | "female"
      clan_lifecycle: "active" | "dormant" | "stale" | "deleted"
      clan_member_role: "leader" | "officer" | "member"
      clan_member_status: "pending" | "active" | "left" | "banned"
      clan_moderation: "clean" | "reported" | "warned" | "hidden" | "deleted"
      clan_style: "social" | "casual" | "tryhard" | "pro"
      user_gender: "male" | "female" | "undisclosed"
      user_language: "ko" | "en" | "ja"
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
      auth_failed_login_reason: [
        "invalid_password",
        "unknown_email",
        "locked",
        "oauth_denied",
      ],
      clan_gender_policy: ["all", "male", "female"],
      clan_lifecycle: ["active", "dormant", "stale", "deleted"],
      clan_member_role: ["leader", "officer", "member"],
      clan_member_status: ["pending", "active", "left", "banned"],
      clan_moderation: ["clean", "reported", "warned", "hidden", "deleted"],
      clan_style: ["social", "casual", "tryhard", "pro"],
      user_gender: ["male", "female", "undisclosed"],
      user_language: ["ko", "en", "ja"],
    },
  },
} as const
