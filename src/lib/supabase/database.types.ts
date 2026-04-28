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
      badges: {
        Row: {
          category: Database["public"]["Enums"]["badge_strip_category"]
          code: string
          created_at: string
          description: string
          game_id: string
          icon: string
          id: string
          is_active: boolean
          linked_id: string | null
          name_en: string | null
          name_ko: string
          unlock_condition: Json
          unlock_source: Database["public"]["Enums"]["badge_unlock_kind"]
        }
        Insert: {
          category: Database["public"]["Enums"]["badge_strip_category"]
          code: string
          created_at?: string
          description: string
          game_id: string
          icon: string
          id?: string
          is_active?: boolean
          linked_id?: string | null
          name_en?: string | null
          name_ko: string
          unlock_condition?: Json
          unlock_source: Database["public"]["Enums"]["badge_unlock_kind"]
        }
        Update: {
          category?: Database["public"]["Enums"]["badge_strip_category"]
          code?: string
          created_at?: string
          description?: string
          game_id?: string
          icon?: string
          id?: string
          is_active?: boolean
          linked_id?: string | null
          name_en?: string | null
          name_ko?: string
          unlock_condition?: Json
          unlock_source?: Database["public"]["Enums"]["badge_unlock_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "badges_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_session_hero_votes: {
        Row: {
          pick_1: string
          pick_2: string
          pick_3: string
          session_id: string
          user_id: string
        }
        Insert: {
          pick_1: string
          pick_2: string
          pick_3: string
          session_id: string
          user_id: string
        }
        Update: {
          pick_1?: string
          pick_2?: string
          pick_3?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_session_hero_votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "balance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_session_hero_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_session_map_votes: {
        Row: {
          choice_idx: number
          session_id: string
          user_id: string
        }
        Insert: {
          choice_idx: number
          session_id: string
          user_id: string
        }
        Update: {
          choice_idx?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_session_map_votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "balance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_session_map_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_session_predictions: {
        Row: {
          created_at: string
          pick_team: number
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pick_team: number
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          pick_team?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_session_predictions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "balance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_session_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_sessions: {
        Row: {
          banned_heroes: string[] | null
          clan_id: string
          closed_at: string | null
          game_id: string
          hero_ban_deadline_at: string | null
          hero_ban_enabled: boolean
          host_user_id: string
          id: string
          ma_snapshot: Json
          map_ban_deadline_at: string | null
          map_ban_enabled: boolean
          map_candidates: string[] | null
          match_outcome: Database["public"]["Enums"]["balance_match_outcome"]
          opened_at: string
          phase: Database["public"]["Enums"]["balance_session_phase"]
          prediction_deadline_at: string | null
          predictions_settled_at: string | null
          resolved_map_label: string | null
          roster: Json
        }
        Insert: {
          banned_heroes?: string[] | null
          clan_id: string
          closed_at?: string | null
          game_id: string
          hero_ban_deadline_at?: string | null
          hero_ban_enabled?: boolean
          host_user_id: string
          id?: string
          ma_snapshot?: Json
          map_ban_deadline_at?: string | null
          map_ban_enabled?: boolean
          map_candidates?: string[] | null
          match_outcome?: Database["public"]["Enums"]["balance_match_outcome"]
          opened_at?: string
          phase?: Database["public"]["Enums"]["balance_session_phase"]
          prediction_deadline_at?: string | null
          predictions_settled_at?: string | null
          resolved_map_label?: string | null
          roster?: Json
        }
        Update: {
          banned_heroes?: string[] | null
          clan_id?: string
          closed_at?: string | null
          game_id?: string
          hero_ban_deadline_at?: string | null
          hero_ban_enabled?: boolean
          host_user_id?: string
          id?: string
          ma_snapshot?: Json
          map_ban_deadline_at?: string | null
          map_ban_enabled?: boolean
          map_candidates?: string[] | null
          match_outcome?: Database["public"]["Enums"]["balance_match_outcome"]
          opened_at?: string
          phase?: Database["public"]["Enums"]["balance_session_phase"]
          prediction_deadline_at?: string | null
          predictions_settled_at?: string | null
          resolved_map_label?: string | null
          roster?: Json
        }
        Relationships: [
          {
            foreignKeyName: "balance_sessions_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_sessions_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      board_posts: {
        Row: {
          clan_id: string
          content: string
          created_at: string
          created_by: string
          game_id: string
          id: string
          is_pinned: boolean
          post_type: Database["public"]["Enums"]["board_post_type"]
          title: string
        }
        Insert: {
          clan_id: string
          content?: string
          created_at?: string
          created_by: string
          game_id: string
          id?: string
          is_pinned?: boolean
          post_type?: Database["public"]["Enums"]["board_post_type"]
          title: string
        }
        Update: {
          clan_id?: string
          content?: string
          created_at?: string
          created_by?: string
          game_id?: string
          id?: string
          is_pinned?: boolean
          post_type?: Database["public"]["Enums"]["board_post_type"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_posts_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_posts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket_tournaments: {
        Row: {
          cancelled_at: string | null
          created_at: string
          created_by: string
          entry_coin_transaction_id: string | null
          finished_at: string | null
          format: Database["public"]["Enums"]["bracket_format"]
          host_clan_id: string
          host_coin_transaction_id: string | null
          id: string
          snapshot: Json
          started_at: string | null
          status: Database["public"]["Enums"]["bracket_status"]
          team_count: number
          title: string
          updated_at: string
          winner_coin_transaction_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          entry_coin_transaction_id?: string | null
          finished_at?: string | null
          format?: Database["public"]["Enums"]["bracket_format"]
          host_clan_id: string
          host_coin_transaction_id?: string | null
          id?: string
          snapshot?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["bracket_status"]
          team_count: number
          title: string
          updated_at?: string
          winner_coin_transaction_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          entry_coin_transaction_id?: string | null
          finished_at?: string | null
          format?: Database["public"]["Enums"]["bracket_format"]
          host_clan_id?: string
          host_coin_transaction_id?: string | null
          id?: string
          snapshot?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["bracket_status"]
          team_count?: number
          title?: string
          updated_at?: string
          winner_coin_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bracket_tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_tournaments_entry_coin_transaction_id_fkey"
            columns: ["entry_coin_transaction_id"]
            isOneToOne: false
            referencedRelation: "coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_tournaments_host_clan_id_fkey"
            columns: ["host_clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_tournaments_host_coin_transaction_id_fkey"
            columns: ["host_coin_transaction_id"]
            isOneToOne: false
            referencedRelation: "coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bracket_tournaments_winner_coin_transaction_id_fkey"
            columns: ["winner_coin_transaction_id"]
            isOneToOne: false
            referencedRelation: "coin_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_daily_member_activity: {
        Row: {
          activity_date: string
          clan_id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          activity_date: string
          clan_id: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          activity_date?: string
          clan_id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_daily_member_activity_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_daily_member_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_events: {
        Row: {
          cancelled_at: string | null
          clan_id: string
          created_at: string
          created_by: string
          finished_at: string | null
          id: string
          kind: Database["public"]["Enums"]["clan_event_kind"]
          place: string | null
          repeat: Database["public"]["Enums"]["clan_event_repeat"]
          repeat_time: string | null
          repeat_weekdays: number[] | null
          source: Database["public"]["Enums"]["clan_event_source"]
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          clan_id: string
          created_at?: string
          created_by: string
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["clan_event_kind"]
          place?: string | null
          repeat?: Database["public"]["Enums"]["clan_event_repeat"]
          repeat_time?: string | null
          repeat_weekdays?: number[] | null
          source?: Database["public"]["Enums"]["clan_event_source"]
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          clan_id?: string
          created_at?: string
          created_by?: string
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["clan_event_kind"]
          place?: string | null
          repeat?: Database["public"]["Enums"]["clan_event_repeat"]
          repeat_time?: string | null
          repeat_weekdays?: number[] | null
          source?: Database["public"]["Enums"]["clan_event_source"]
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_events_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_join_requests: {
        Row: {
          applied_at: string
          clan_id: string
          created_at: string
          game_id: string
          id: string
          message: string
          reject_reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["clan_join_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          clan_id: string
          created_at?: string
          game_id: string
          id?: string
          message?: string
          reject_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["clan_join_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          clan_id?: string
          created_at?: string
          game_id?: string
          id?: string
          message?: string
          reject_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["clan_join_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_join_requests_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_join_requests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_join_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      clan_polls: {
        Row: {
          anonymous: boolean
          clan_id: string
          closed_at: string | null
          created_at: string
          created_by: string
          deadline_at: string
          id: string
          multiple_choice: boolean
          notify_hour: number
          notify_repeat: Database["public"]["Enums"]["poll_notify_repeat"]
          post_to_notice: boolean
          title: string
        }
        Insert: {
          anonymous?: boolean
          clan_id: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          deadline_at: string
          id?: string
          multiple_choice?: boolean
          notify_hour?: number
          notify_repeat?: Database["public"]["Enums"]["poll_notify_repeat"]
          post_to_notice?: boolean
          title: string
        }
        Update: {
          anonymous?: boolean
          clan_id?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          deadline_at?: string
          id?: string
          multiple_choice?: boolean
          notify_hour?: number
          notify_repeat?: Database["public"]["Enums"]["poll_notify_repeat"]
          post_to_notice?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_polls_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_settings: {
        Row: {
          clan_id: string
          event_notify: Json
          expose_hof: boolean
          hof_config: Json
          permissions: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          clan_id: string
          event_notify?: Json
          expose_hof?: boolean
          hof_config?: Json
          permissions?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          clan_id?: string
          event_notify?: Json
          expose_hof?: boolean
          hof_config?: Json
          permissions?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clan_settings_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: true
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_settings_updated_by_fkey"
            columns: ["updated_by"]
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
          subscription_tier: Database["public"]["Enums"]["clan_subscription_tier"]
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
          subscription_tier?: Database["public"]["Enums"]["clan_subscription_tier"]
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
          subscription_tier?: Database["public"]["Enums"]["clan_subscription_tier"]
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
      coin_transactions: {
        Row: {
          amount: number
          balance_after: number
          clan_id: string | null
          correction_of: string | null
          created_at: string
          created_by: string | null
          id: string
          pool_type: Database["public"]["Enums"]["coin_pool_type"]
          reason: string
          reference_id: string
          reference_type: string
          sub_key: string
          user_id: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          clan_id?: string | null
          correction_of?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pool_type: Database["public"]["Enums"]["coin_pool_type"]
          reason: string
          reference_id: string
          reference_type: string
          sub_key?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          clan_id?: string | null
          correction_of?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pool_type?: Database["public"]["Enums"]["coin_pool_type"]
          reason?: string
          reference_id?: string
          reference_type?: string
          sub_key?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_correction_of_fkey"
            columns: ["correction_of"]
            isOneToOne: false
            referencedRelation: "coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          event_id: string
          instance_idx: number
          responded_at: string
          status: Database["public"]["Enums"]["event_rsvp_status"]
          user_id: string
        }
        Insert: {
          event_id: string
          instance_idx?: number
          responded_at?: string
          status?: Database["public"]["Enums"]["event_rsvp_status"]
          user_id: string
        }
        Update: {
          event_id?: string
          instance_idx?: number
          responded_at?: string
          status?: Database["public"]["Enums"]["event_rsvp_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "clan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      lfg_applications: {
        Row: {
          applicant_user_id: string
          created_at: string
          id: string
          message: string | null
          mic_available: boolean | null
          post_id: string
          resolved_at: string | null
          resolved_by: string | null
          role: string | null
          status: Database["public"]["Enums"]["lfg_application_status"]
          tier: string | null
        }
        Insert: {
          applicant_user_id: string
          created_at?: string
          id?: string
          message?: string | null
          mic_available?: boolean | null
          post_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["lfg_application_status"]
          tier?: string | null
        }
        Update: {
          applicant_user_id?: string
          created_at?: string
          id?: string
          message?: string | null
          mic_available?: boolean | null
          post_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["lfg_application_status"]
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lfg_applications_applicant_user_id_fkey"
            columns: ["applicant_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfg_applications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "lfg_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfg_applications_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lfg_posts: {
        Row: {
          created_at: string
          creator_user_id: string
          description: string | null
          expires_at: string
          format: string
          game_id: string
          id: string
          mic_required: boolean
          mode: string
          positions: string[]
          slots: number
          start_time_hour: number
          status: Database["public"]["Enums"]["lfg_post_status"]
          tiers: string[]
        }
        Insert: {
          created_at?: string
          creator_user_id: string
          description?: string | null
          expires_at: string
          format: string
          game_id: string
          id?: string
          mic_required?: boolean
          mode: string
          positions?: string[]
          slots: number
          start_time_hour: number
          status?: Database["public"]["Enums"]["lfg_post_status"]
          tiers?: string[]
        }
        Update: {
          created_at?: string
          creator_user_id?: string
          description?: string | null
          expires_at?: string
          format?: string
          game_id?: string
          id?: string
          mic_required?: boolean
          mode?: string
          positions?: string[]
          slots?: number
          start_time_hour?: number
          status?: Database["public"]["Enums"]["lfg_post_status"]
          tiers?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "lfg_posts_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lfg_posts_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          id: string
          match_id: string
          team: number
          user_id: string
        }
        Insert: {
          id?: string
          match_id: string
          team: number
          user_id: string
        }
        Update: {
          id?: string
          match_id?: string
          team?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          match_id: string
          recorded_at: string
          winner_team: number | null
        }
        Insert: {
          match_id: string
          recorded_at?: string
          winner_team?: number | null
        }
        Update: {
          match_id?: string
          recorded_at?: string
          winner_team?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          clan_id: string
          created_at: string
          created_by: string | null
          game_id: string
          id: string
          map_label: string | null
          match_type: Database["public"]["Enums"]["clan_match_type"]
          played_at: string
          status: Database["public"]["Enums"]["clan_match_status"]
        }
        Insert: {
          clan_id: string
          created_at?: string
          created_by?: string | null
          game_id: string
          id?: string
          map_label?: string | null
          match_type?: Database["public"]["Enums"]["clan_match_type"]
          played_at?: string
          status?: Database["public"]["Enums"]["clan_match_status"]
        }
        Update: {
          clan_id?: string
          created_at?: string
          created_by?: string | null
          game_id?: string
          id?: string
          map_label?: string | null
          match_type?: Database["public"]["Enums"]["clan_match_type"]
          played_at?: string
          status?: Database["public"]["Enums"]["clan_match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "matches_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      nameplate_options: {
        Row: {
          category: Database["public"]["Enums"]["nameplate_category"]
          code: string
          created_at: string
          game_id: string
          icon_class: string | null
          id: string
          is_active: boolean
          linked_id: string | null
          name_en: string | null
          name_ko: string
          unlock_source: Database["public"]["Enums"]["nameplate_unlock_source"]
        }
        Insert: {
          category: Database["public"]["Enums"]["nameplate_category"]
          code: string
          created_at?: string
          game_id: string
          icon_class?: string | null
          id?: string
          is_active?: boolean
          linked_id?: string | null
          name_en?: string | null
          name_ko: string
          unlock_source?: Database["public"]["Enums"]["nameplate_unlock_source"]
        }
        Update: {
          category?: Database["public"]["Enums"]["nameplate_category"]
          code?: string
          created_at?: string
          game_id?: string
          icon_class?: string | null
          id?: string
          is_active?: boolean
          linked_id?: string | null
          name_en?: string | null
          name_ko?: string
          unlock_source?: Database["public"]["Enums"]["nameplate_unlock_source"]
        }
        Relationships: [
          {
            foreignKeyName: "nameplate_options_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          attempt_count: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          dedup_key: string
          effective_at: string | null
          event_id: string | null
          id: string
          instance_idx: number | null
          last_error: string | null
          poll_id: string | null
          recipient_user_id: string
          scheduled_at: string
          slot_kind: Database["public"]["Enums"]["notification_slot_kind"]
          status: Database["public"]["Enums"]["notification_status"]
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dedup_key: string
          effective_at?: string | null
          event_id?: string | null
          id?: string
          instance_idx?: number | null
          last_error?: string | null
          poll_id?: string | null
          recipient_user_id: string
          scheduled_at: string
          slot_kind: Database["public"]["Enums"]["notification_slot_kind"]
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          dedup_key?: string
          effective_at?: string | null
          event_id?: string | null
          id?: string
          instance_idx?: number | null
          last_error?: string | null
          poll_id?: string | null
          recipient_user_id?: string
          scheduled_at?: string
          slot_kind?: Database["public"]["Enums"]["notification_slot_kind"]
          status?: Database["public"]["Enums"]["notification_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "clan_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "clan_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          sort_order: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "clan_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          option_id: string
          poll_id: string
          user_id: string
          voted_at: string
        }
        Insert: {
          option_id: string
          poll_id: string
          user_id: string
          voted_at?: string
        }
        Update: {
          option_id?: string
          poll_id?: string
          user_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "clan_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          approved_by: string | null
          clan_id: string | null
          coin_transaction_id: string
          id: string
          item_id: string
          pool_source: Database["public"]["Enums"]["coin_pool_type"]
          price_coins: number
          purchased_at: string
          user_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          approved_by?: string | null
          clan_id?: string | null
          coin_transaction_id: string
          id?: string
          item_id: string
          pool_source: Database["public"]["Enums"]["coin_pool_type"]
          price_coins: number
          purchased_at?: string
          user_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          approved_by?: string | null
          clan_id?: string | null
          coin_transaction_id?: string
          id?: string
          item_id?: string
          pool_source?: Database["public"]["Enums"]["coin_pool_type"]
          price_coins?: number
          purchased_at?: string
          user_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_coin_transaction_id_fkey"
            columns: ["coin_transaction_id"]
            isOneToOne: true
            referencedRelation: "coin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          asset_url: string | null
          game_id: string | null
          id: string
          is_active: boolean
          is_premium_only: boolean
          item_type: Database["public"]["Enums"]["store_item_type"]
          name_ko: string
          pool_source: Database["public"]["Enums"]["coin_pool_type"]
          price_coins: number
          released_at: string
          slug: string
        }
        Insert: {
          asset_url?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          is_premium_only?: boolean
          item_type: Database["public"]["Enums"]["store_item_type"]
          name_ko: string
          pool_source: Database["public"]["Enums"]["coin_pool_type"]
          price_coins: number
          released_at?: string
          slug: string
        }
        Update: {
          asset_url?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          is_premium_only?: boolean
          item_type?: Database["public"]["Enums"]["store_item_type"]
          name_ko?: string
          pool_source?: Database["public"]["Enums"]["coin_pool_type"]
          price_coins?: number
          released_at?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_items_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badge_picks: {
        Row: {
          badge_id: string
          game_id: string
          slot_index: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          game_id: string
          slot_index: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          game_id?: string
          slot_index?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badge_picks_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badge_picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badge_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badge_unlocks: {
        Row: {
          badge_id: string
          source_detail: Json | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          source_detail?: Json | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          source_detail?: Json | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badge_unlocks_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badge_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      user_nameplate_inventory: {
        Row: {
          acquired_at: string
          option_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          option_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nameplate_inventory_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "nameplate_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_nameplate_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_nameplate_selections: {
        Row: {
          category: Database["public"]["Enums"]["nameplate_category"]
          game_id: string
          option_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["nameplate_category"]
          game_id: string
          option_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["nameplate_category"]
          game_id?: string
          option_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nameplate_selections_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_nameplate_selections_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "nameplate_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_nameplate_selections_user_id_fkey"
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
      apply_store_purchase: {
        Args: {
          p_actor_id: string
          p_checkout_id: string
          p_context_clan_id: string
          p_item_slug: string
        }
        Returns: Json
      }
      balance_roster_contains_user: {
        Args: { p_roster: Json; p_uid: string }
        Returns: boolean
      }
      clan_active_member_counts: {
        Args: { p_clan_ids: string[] }
        Returns: {
          clan_id: string
          n: number
        }[]
      }
      clan_peer_nicknames: {
        Args: { p_clan_id: string }
        Returns: {
          nickname: string
          user_id: string
        }[]
      }
      is_active_clan_member: { Args: { p_clan_id: string }; Returns: boolean }
      is_clan_officer_plus: { Args: { p_clan_id: string }; Returns: boolean }
      is_member_of_balance_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      list_balance_roster_pool: {
        Args: { p_clan_id: string }
        Returns: {
          nickname: string
          user_id: string
        }[]
      }
      maint_cancel_poll_notifications_past_deadline: {
        Args: never
        Returns: undefined
      }
      my_active_clan_for_game: {
        Args: { p_game_id: string }
        Returns: {
          clan_id: string
          clan_name: string
        }[]
      }
      my_active_clans_by_game: {
        Args: never
        Returns: {
          clan_id: string
          clan_name: string
          game_id: string
        }[]
      }
      record_clan_activity: { Args: { p_clan_id: string }; Returns: undefined }
      select_my_clan_membership: {
        Args: { p_clan_id: string }
        Returns: {
          role: Database["public"]["Enums"]["clan_member_role"]
          status: Database["public"]["Enums"]["clan_member_status"]
        }[]
      }
      set_balance_match_outcome: {
        Args: {
          p_outcome: Database["public"]["Enums"]["balance_match_outcome"]
          p_session_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      auth_failed_login_reason:
        | "invalid_password"
        | "unknown_email"
        | "locked"
        | "oauth_denied"
      badge_strip_category:
        | "battle"
        | "participation"
        | "event"
        | "clan"
        | "clansync"
      badge_unlock_kind: "achievement" | "event" | "store"
      balance_match_outcome: "pending" | "team1" | "team2" | "void"
      balance_session_phase: "editing" | "map_ban" | "hero_ban" | "match_live"
      board_post_type: "promotion" | "scrim"
      bracket_format: "single_elim" | "double_elim" | "round_robin"
      bracket_status: "draft" | "in_progress" | "finished" | "cancelled"
      clan_event_kind: "intra" | "scrim" | "event"
      clan_event_repeat: "none" | "weekly" | "monthly"
      clan_event_source: "manual" | "scrim_auto"
      clan_gender_policy: "all" | "male" | "female"
      clan_join_request_status: "pending" | "approved" | "rejected" | "canceled"
      clan_lifecycle: "active" | "dormant" | "stale" | "deleted"
      clan_match_status: "draft" | "active" | "finished"
      clan_match_type: "intra" | "scrim" | "event"
      clan_member_role: "leader" | "officer" | "member"
      clan_member_status: "pending" | "active" | "left" | "banned"
      clan_moderation: "clean" | "reported" | "warned" | "hidden" | "deleted"
      clan_style: "social" | "casual" | "tryhard" | "pro"
      clan_subscription_tier: "free" | "premium"
      coin_pool_type: "clan" | "personal"
      event_rsvp_status: "going" | "maybe" | "not_going"
      lfg_application_status:
        | "applied"
        | "accepted"
        | "rejected"
        | "canceled"
        | "expired"
      lfg_post_status: "open" | "filled" | "expired" | "canceled"
      nameplate_category: "emblem" | "namebar" | "sub" | "frame"
      nameplate_unlock_source: "default" | "event" | "store" | "achievement"
      notification_channel: "inapp" | "discord" | "kakao" | "web_push"
      notification_slot_kind:
        | "event_t_minus_24h"
        | "event_t_minus_1h"
        | "event_t_minus_10min"
        | "event_t_0"
        | "poll_created"
        | "poll_daily"
        | "poll_weekly"
        | "poll_deadline_window"
        | "poll_deadline_1h"
        | "event_cancelled"
      notification_status: "scheduled" | "sent" | "failed" | "cancelled" | "dlq"
      poll_notify_repeat:
        | "none"
        | "once"
        | "daily"
        | "weekly"
        | "until_deadline_daily"
      store_item_type: "clan_deco" | "profile_deco"
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
      badge_strip_category: [
        "battle",
        "participation",
        "event",
        "clan",
        "clansync",
      ],
      badge_unlock_kind: ["achievement", "event", "store"],
      balance_match_outcome: ["pending", "team1", "team2", "void"],
      balance_session_phase: ["editing", "map_ban", "hero_ban", "match_live"],
      board_post_type: ["promotion", "scrim"],
      bracket_format: ["single_elim", "double_elim", "round_robin"],
      bracket_status: ["draft", "in_progress", "finished", "cancelled"],
      clan_event_kind: ["intra", "scrim", "event"],
      clan_event_repeat: ["none", "weekly", "monthly"],
      clan_event_source: ["manual", "scrim_auto"],
      clan_gender_policy: ["all", "male", "female"],
      clan_join_request_status: ["pending", "approved", "rejected", "canceled"],
      clan_lifecycle: ["active", "dormant", "stale", "deleted"],
      clan_match_status: ["draft", "active", "finished"],
      clan_match_type: ["intra", "scrim", "event"],
      clan_member_role: ["leader", "officer", "member"],
      clan_member_status: ["pending", "active", "left", "banned"],
      clan_moderation: ["clean", "reported", "warned", "hidden", "deleted"],
      clan_style: ["social", "casual", "tryhard", "pro"],
      clan_subscription_tier: ["free", "premium"],
      coin_pool_type: ["clan", "personal"],
      event_rsvp_status: ["going", "maybe", "not_going"],
      lfg_application_status: [
        "applied",
        "accepted",
        "rejected",
        "canceled",
        "expired",
      ],
      lfg_post_status: ["open", "filled", "expired", "canceled"],
      nameplate_category: ["emblem", "namebar", "sub", "frame"],
      nameplate_unlock_source: ["default", "event", "store", "achievement"],
      notification_channel: ["inapp", "discord", "kakao", "web_push"],
      notification_slot_kind: [
        "event_t_minus_24h",
        "event_t_minus_1h",
        "event_t_minus_10min",
        "event_t_0",
        "poll_created",
        "poll_daily",
        "poll_weekly",
        "poll_deadline_window",
        "poll_deadline_1h",
        "event_cancelled",
      ],
      notification_status: ["scheduled", "sent", "failed", "cancelled", "dlq"],
      poll_notify_repeat: [
        "none",
        "once",
        "daily",
        "weekly",
        "until_deadline_daily",
      ],
      store_item_type: ["clan_deco", "profile_deco"],
      user_gender: ["male", "female", "undisclosed"],
      user_language: ["ko", "en", "ja"],
    },
  },
} as const
