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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_reactions: {
        Row: {
          activity_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reactions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "room_activity_log"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_goal_progress: {
        Row: {
          goal_id: string
          id: string
          logged_at: string
          note: string | null
          user_id: string
          value: number
        }
        Insert: {
          goal_id: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id: string
          value?: number
        }
        Update: {
          goal_id?: string
          id?: string
          logged_at?: string
          note?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "annual_goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "annual_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_goals: {
        Row: {
          archived: boolean
          category_id: string | null
          completed_at: string | null
          created_at: string
          current_value: number
          description: string | null
          frequency_period: string | null
          goal_type: string
          id: string
          is_completed: boolean
          position: number
          target_value: number
          title: string
          unit: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          archived?: boolean
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          frequency_period?: string | null
          goal_type: string
          id?: string
          is_completed?: boolean
          position?: number
          target_value?: number
          title: string
          unit?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          archived?: boolean
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          frequency_period?: string | null
          goal_type?: string
          id?: string
          is_completed?: boolean
          position?: number
          target_value?: number
          title?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "annual_goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "life_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      checklist_history: {
        Row: {
          completed_at: string
          due_date: string
          id: string
          period_type: string
          project_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          due_date: string
          id?: string
          period_type: string
          project_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string
          due_date?: string
          id?: string
          period_type?: string
          project_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string
          id: string
          is_completed: boolean
          period_type: string
          position: number
          project_id: string | null
          recurrence_days: string[] | null
          recurrence_type: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          is_completed?: boolean
          period_type?: string
          position?: number
          project_id?: string | null
          recurrence_days?: string[] | null
          recurrence_type?: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          is_completed?: boolean
          period_type?: string
          position?: number
          project_id?: string | null
          recurrence_days?: string[] | null
          recurrence_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      email_rate_limits: {
        Row: {
          count: number
          email: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          email: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          email?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      freeze_missions: {
        Row: {
          completed_at: string
          created_at: string
          freezes_awarded: number
          id: string
          mission_type: string
          period_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          freezes_awarded?: number
          id?: string
          mission_type: string
          period_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          freezes_awarded?: number
          id?: string
          mission_type?: string
          period_key?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      goal_history: {
        Row: {
          achieved_minutes: number
          completed_at: string | null
          created_at: string | null
          end_date: string
          goal_type: string
          id: string
          project_id: string
          start_date: string
          target_minutes: number
          user_id: string
        }
        Insert: {
          achieved_minutes: number
          completed_at?: string | null
          created_at?: string | null
          end_date: string
          goal_type: string
          id?: string
          project_id: string
          start_date: string
          target_minutes: number
          user_id: string
        }
        Update: {
          achieved_minutes?: number
          completed_at?: string | null
          created_at?: string | null
          end_date?: string
          goal_type?: string
          id?: string
          project_id?: string
          start_date?: string
          target_minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          end_date: string
          goal_type: string
          id: string
          project_id: string
          start_date: string
          target_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          goal_type: string
          id?: string
          project_id: string
          start_date: string
          target_minutes: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          goal_type?: string
          id?: string
          project_id?: string
          start_date?: string
          target_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      life_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mind_maps: {
        Row: {
          created_at: string | null
          description: string | null
          edges: Json
          id: string
          nodes: Json
          project_id: string | null
          template: string | null
          theme: Json | null
          title: string
          updated_at: string | null
          user_id: string
          viewport: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          edges?: Json
          id?: string
          nodes?: Json
          project_id?: string | null
          template?: string | null
          theme?: Json | null
          title?: string
          updated_at?: string | null
          user_id: string
          viewport?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          edges?: Json
          id?: string
          nodes?: Json
          project_id?: string | null
          template?: string | null
          theme?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
          viewport?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mind_maps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      note_folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          password_hash: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          password_hash?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          password_hash?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          folder_id: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          project_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ambient_sound: string | null
          ambient_volume: number | null
          autoplay_on_timer: boolean | null
          avatar_flair: string
          avatar_flair_color: string | null
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          created_at: string
          display_name: string | null
          friend_code: string | null
          id: string
          is_banned: boolean
          is_stats_public: boolean
          last_known_streak: number
          last_streak_rescue_at: string | null
          onboarding_completed: boolean | null
          plan_tier: string
          pomodoro_auto_start_breaks: boolean | null
          pomodoro_auto_start_work: boolean | null
          pomodoro_cycles_before_long: number | null
          pomodoro_long_break: number | null
          pomodoro_short_break: number | null
          pomodoro_work_duration: number | null
          reminder_interval: number
          reminder_notification: boolean
          reminder_sound: boolean
          theme: string
          timezone: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ambient_sound?: string | null
          ambient_volume?: number | null
          autoplay_on_timer?: boolean | null
          avatar_flair?: string
          avatar_flair_color?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          display_name?: string | null
          friend_code?: string | null
          id?: string
          is_banned?: boolean
          is_stats_public?: boolean
          last_known_streak?: number
          last_streak_rescue_at?: string | null
          onboarding_completed?: boolean | null
          plan_tier?: string
          pomodoro_auto_start_breaks?: boolean | null
          pomodoro_auto_start_work?: boolean | null
          pomodoro_cycles_before_long?: number | null
          pomodoro_long_break?: number | null
          pomodoro_short_break?: number | null
          pomodoro_work_duration?: number | null
          reminder_interval?: number
          reminder_notification?: boolean
          reminder_sound?: boolean
          theme?: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ambient_sound?: string | null
          ambient_volume?: number | null
          autoplay_on_timer?: boolean | null
          avatar_flair?: string
          avatar_flair_color?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          display_name?: string | null
          friend_code?: string | null
          id?: string
          is_banned?: boolean
          is_stats_public?: boolean
          last_known_streak?: number
          last_streak_rescue_at?: string | null
          onboarding_completed?: boolean | null
          plan_tier?: string
          pomodoro_auto_start_breaks?: boolean | null
          pomodoro_auto_start_work?: boolean | null
          pomodoro_cycles_before_long?: number | null
          pomodoro_long_break?: number | null
          pomodoro_short_break?: number | null
          pomodoro_work_duration?: number | null
          reminder_interval?: number
          reminder_notification?: boolean
          reminder_sound?: boolean
          theme?: string
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          category_id: string | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      purchased_streak_freezes: {
        Row: {
          balance: number
          total_purchased: number
          total_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          total_purchased?: number
          total_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          total_purchased?: number
          total_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_achievements: {
        Row: {
          achievement_type: string
          id: string
          room_id: string
          unlocked_at: string
        }
        Insert: {
          achievement_type: string
          id?: string
          room_id: string
          unlocked_at?: string
        }
        Update: {
          achievement_type?: string
          id?: string
          room_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_achievements_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_achievements_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      room_activity_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          room_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          room_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_activity_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_activity_log_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      room_invitations: {
        Row: {
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          room_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          room_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          room_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_invitations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_invitations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          focus_session_joined: boolean
          id: string
          is_muted: boolean
          is_online: boolean
          is_timer_active: boolean
          joined_at: string
          last_active_at: string | null
          notifications_enabled: boolean
          role: string
          room_id: string
          status_text: string | null
          timer_started_at: string | null
          total_seconds: number
          user_id: string
        }
        Insert: {
          focus_session_joined?: boolean
          id?: string
          is_muted?: boolean
          is_online?: boolean
          is_timer_active?: boolean
          joined_at?: string
          last_active_at?: string | null
          notifications_enabled?: boolean
          role?: string
          room_id: string
          status_text?: string | null
          timer_started_at?: string | null
          total_seconds?: number
          user_id: string
        }
        Update: {
          focus_session_joined?: boolean
          id?: string
          is_muted?: boolean
          is_online?: boolean
          is_timer_active?: boolean
          joined_at?: string
          last_active_at?: string | null
          notifications_enabled?: boolean
          role?: string
          room_id?: string
          status_text?: string | null
          timer_started_at?: string | null
          total_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_freeze_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          freezes_added: number
          id: string
          quantity: number
          stripe_payment_intent: string | null
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency: string
          freezes_added: number
          id?: string
          quantity: number
          stripe_payment_intent?: string | null
          stripe_session_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          freezes_added?: number
          id?: string
          quantity?: number
          stripe_payment_intent?: string | null
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      streak_freezes: {
        Row: {
          auto_used_dates: string[] | null
          created_at: string | null
          id: string
          month_year: string
          total_granted: number
          used: number
          user_id: string
        }
        Insert: {
          auto_used_dates?: string[] | null
          created_at?: string | null
          id?: string
          month_year: string
          total_granted?: number
          used?: number
          user_id: string
        }
        Update: {
          auto_used_dates?: string[] | null
          created_at?: string | null
          id?: string
          month_year?: string
          total_granted?: number
          used?: number
          user_id?: string
        }
        Relationships: []
      }
      study_rooms: {
        Row: {
          chat_mode: string
          country: string | null
          created_at: string
          description: string | null
          focus_session_duration: number | null
          focus_session_end_at: string | null
          focus_session_start_at: string | null
          focus_session_started_by: string | null
          goal_hours: number | null
          goal_label: string | null
          id: string
          invite_code: string
          is_active: boolean
          is_public: boolean
          max_members: number
          name: string
          owner_id: string
          password_hash: string | null
          pinned_message: string | null
          room_type: string
          rules: string | null
          slug: string | null
        }
        Insert: {
          chat_mode?: string
          country?: string | null
          created_at?: string
          description?: string | null
          focus_session_duration?: number | null
          focus_session_end_at?: string | null
          focus_session_start_at?: string | null
          focus_session_started_by?: string | null
          goal_hours?: number | null
          goal_label?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          is_public?: boolean
          max_members?: number
          name: string
          owner_id: string
          password_hash?: string | null
          pinned_message?: string | null
          room_type?: string
          rules?: string | null
          slug?: string | null
        }
        Update: {
          chat_mode?: string
          country?: string | null
          created_at?: string
          description?: string | null
          focus_session_duration?: number | null
          focus_session_end_at?: string | null
          focus_session_start_at?: string | null
          focus_session_started_by?: string | null
          goal_hours?: number | null
          goal_label?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          is_public?: boolean
          max_members?: number
          name?: string
          owner_id?: string
          password_hash?: string | null
          pinned_message?: string | null
          room_type?: string
          rules?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      support_agents: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      support_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          is_agent: boolean
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_agent?: boolean
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_agent?: boolean
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          email: string
          id: string
          last_user_read_at: string | null
          message: string
          name: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          email: string
          id?: string
          last_user_read_at?: string | null
          message: string
          name?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          email?: string
          id?: string
          last_user_read_at?: string | null
          message?: string
          name?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string
          duration: number | null
          end_time: string | null
          id: string
          is_pomodoro: boolean | null
          last_heartbeat_at: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_type: string | null
          project_id: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          is_pomodoro?: boolean | null
          last_heartbeat_at?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          pomodoro_type?: string | null
          project_id: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          is_pomodoro?: boolean | null
          last_heartbeat_at?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          pomodoro_type?: string | null
          project_id?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_tags: {
        Row: {
          id: string
          tag_id: string
          time_entry_id: string
        }
        Insert: {
          id?: string
          tag_id: string
          time_entry_id: string
        }
        Update: {
          id?: string
          tag_id?: string
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entry_tags_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          created_at: string | null
          current_stage: string | null
          id: string
          milestones_unlocked: Json | null
          total_seconds: number | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          current_stage?: string | null
          id?: string
          milestones_unlocked?: Json | null
          total_seconds?: number | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          current_stage?: string | null
          id?: string
          milestones_unlocked?: Json | null
          total_seconds?: number | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      study_rooms_safe: {
        Row: {
          chat_mode: string | null
          country: string | null
          created_at: string | null
          description: string | null
          focus_session_duration: number | null
          focus_session_end_at: string | null
          focus_session_start_at: string | null
          focus_session_started_by: string | null
          goal_hours: number | null
          goal_label: string | null
          id: string | null
          is_active: boolean | null
          is_public: boolean | null
          max_members: number | null
          name: string | null
          owner_id: string | null
          pinned_message: string | null
          room_type: string | null
          rules: string | null
          slug: string | null
        }
        Insert: {
          chat_mode?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          focus_session_duration?: number | null
          focus_session_end_at?: string | null
          focus_session_start_at?: string | null
          focus_session_started_by?: string | null
          goal_hours?: number | null
          goal_label?: string | null
          id?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          max_members?: number | null
          name?: string | null
          owner_id?: string | null
          pinned_message?: string | null
          room_type?: string | null
          rules?: string | null
          slug?: string | null
        }
        Update: {
          chat_mode?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          focus_session_duration?: number | null
          focus_session_end_at?: string | null
          focus_session_start_at?: string | null
          focus_session_started_by?: string | null
          goal_hours?: number | null
          goal_label?: string | null
          id?: string | null
          is_active?: boolean | null
          is_public?: boolean | null
          max_members?: number | null
          name?: string | null
          owner_id?: string | null
          pinned_message?: string | null
          room_type?: string | null
          rules?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_consume_pending_freezes: {
        Args: { _user_id: string }
        Returns: undefined
      }
      auto_pause_stale_entries: { Args: never; Returns: number }
      check_and_grant_freeze_missions: {
        Args: never
        Returns: {
          freezes_granted: number
          mission_type: string
        }[]
      }
      check_and_grant_streak_rescue: {
        Args: never
        Returns: {
          days_rescued: number
          granted: boolean
          last_streak: number
          new_streak: number
        }[]
      }
      consume_streak_freeze: {
        Args: { _date: string }
        Returns: {
          remaining_monthly: number
          remaining_purchased: number
          source: string
        }[]
      }
      create_note_folder: {
        Args: { _color?: string; _name: string; _password?: string }
        Returns: string
      }
      create_room_with_password: {
        Args: {
          _country?: string
          _description: string
          _is_public: boolean
          _name: string
          _password?: string
          _room_type: string
          _rules?: string
        }
        Returns: string
      }
      credit_purchased_freezes: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      duplicate_goals_to_year: {
        Args: { _from: number; _to: number }
        Returns: number
      }
      find_room_by_invite_code: {
        Args: { _code: string }
        Returns: {
          id: string
          member_count: number
          name: string
          owner_id: string
          room_type: string
        }[]
      }
      find_user_by_friend_code: {
        Args: { _code: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      generate_friend_code: { Args: never; Returns: string }
      get_annual_goals_stats: {
        Args: { _year: number }
        Returns: {
          categories_count: number
          completed_goals: number
          overall_progress: number
          total_goals: number
        }[]
      }
      get_freeze_missions_progress: {
        Args: never
        Returns: {
          completed: boolean
          freezes_reward: number
          mission_type: string
          period_key: string
          progress_current: number
          progress_target: number
        }[]
      }
      get_friend_progress: {
        Args: { _user_id: string }
        Returns: {
          hours_today: number
          hours_week: number
        }[]
      }
      get_global_user_ranking: {
        Args: { _period?: string }
        Returns: {
          avatar_flair: string
          avatar_flair_color: string
          avatar_url: string
          display_name: string
          is_anonymous: boolean
          plan_tier: string
          total_seconds: number
          user_id: string
        }[]
      }
      get_habit_period_count: { Args: { _goal_id: string }; Returns: number }
      get_member_best_session: { Args: { _user_id: string }; Returns: number }
      get_member_current_role: { Args: { _member_id: string }; Returns: string }
      get_member_profile_stats: {
        Args: { _room_id: string; _user_id: string }
        Returns: {
          best_session: number
          global_streak: number
          hours_today: number
          hours_week: number
          recent_activities: Json
          room_rank: number
          streak: number
        }[]
      }
      get_member_public_stats: {
        Args: { _user_id: string }
        Returns: {
          avatar_flair: string
          avatar_flair_color: string
          avatar_url: string
          display_name: string
          is_stats_public: boolean
          plan_tier: string
          total_seconds: number
        }[]
      }
      get_member_room_streak: { Args: { _user_id: string }; Returns: number }
      get_my_rooms: {
        Args: never
        Returns: {
          chat_mode: string
          country: string
          created_at: string
          description: string
          focus_session_duration: number
          focus_session_end_at: string
          focus_session_started_by: string
          goal_hours: number
          goal_label: string
          id: string
          is_active: boolean
          is_public: boolean
          max_members: number
          member_count: number
          name: string
          owner_id: string
          pinned_message: string
          room_type: string
          rules: string
          slug: string
        }[]
      }
      get_public_rooms_ranking: {
        Args: { _category?: string; _country?: string; _search?: string }
        Returns: {
          country: string
          description: string
          goal_hours: number
          invite_code: string
          member_count: number
          name: string
          online_count: number
          room_id: string
          room_type: string
          slug: string
          studying_count: number
          total_seconds: number
        }[]
      }
      get_public_rooms_ranking_by_period: {
        Args: {
          _category?: string
          _country?: string
          _period?: string
          _search?: string
        }
        Returns: {
          country: string
          description: string
          goal_hours: number
          invite_code: string
          is_public: boolean
          member_count: number
          name: string
          online_count: number
          period_seconds: number
          room_id: string
          room_type: string
          slug: string
          studying_count: number
          total_seconds: number
        }[]
      }
      get_room_activity_heatmap: {
        Args: { _room_id: string }
        Returns: {
          hour_of_day: number
          total_minutes: number
        }[]
      }
      get_room_daily_progress: {
        Args: { _period?: string; _room_id: string }
        Returns: {
          total_seconds_today: number
        }[]
      }
      get_room_invite_code: { Args: { _room_id: string }; Returns: string }
      get_room_member_profiles: {
        Args: { _room_id: string }
        Returns: {
          avatar_flair: string
          avatar_flair_color: string
          avatar_url: string
          display_name: string
          friend_code: string
          plan_tier: string
          user_id: string
        }[]
      }
      get_room_members_streaks: {
        Args: { _room_id: string }
        Returns: {
          streak: number
          user_id: string
        }[]
      }
      get_room_public_preview: {
        Args: { _invite_code: string }
        Returns: {
          description: string
          focus_session_duration: number
          focus_session_end_at: string
          goal_hours: number
          goal_label: string
          member_count: number
          name: string
          online_count: number
          room_id: string
          room_type: string
          studying_count: number
          top_members: Json
          total_seconds: number
        }[]
      }
      get_room_ranking_by_period: {
        Args: { _period?: string; _room_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          total_seconds: number
          user_id: string
        }[]
      }
      get_room_streak: { Args: { _room_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      heartbeat_time_entry: { Args: { _entry_id: string }; Returns: boolean }
      is_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_room_owner: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_support_admin: { Args: { _user_id: string }; Returns: boolean }
      is_support_agent: { Args: { _user_id: string }; Returns: boolean }
      join_public_room: {
        Args: { _password?: string; _room_id: string }
        Returns: string
      }
      join_room_by_invite_code: {
        Args: { _code: string; _password?: string }
        Returns: string
      }
      kick_room_member: {
        Args: { _member_user_id: string; _room_id: string }
        Returns: undefined
      }
      pause_time_entry: {
        Args: { _client_seconds?: number; _entry_id: string }
        Returns: {
          created_at: string
          duration: number | null
          end_time: string | null
          id: string
          is_pomodoro: boolean | null
          last_heartbeat_at: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_type: string | null
          project_id: string
          start_time: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "time_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_last_known_streak: { Args: never; Returns: number }
      resume_time_entry: {
        Args: { _entry_id: string }
        Returns: {
          created_at: string
          duration: number | null
          end_time: string | null
          id: string
          is_pomodoro: boolean | null
          last_heartbeat_at: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_type: string | null
          project_id: string
          start_time: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "time_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      room_has_password: { Args: { _room_id: string }; Returns: boolean }
      set_member_role: {
        Args: { _member_user_id: string; _role: string; _room_id: string }
        Returns: undefined
      }
      stop_time_entry: {
        Args: { _client_seconds?: number; _entry_id: string }
        Returns: {
          created_at: string
          duration: number | null
          end_time: string | null
          id: string
          is_pomodoro: boolean | null
          last_heartbeat_at: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_type: string | null
          project_id: string
          start_time: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "time_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_mute_member: {
        Args: { _member_user_id: string; _muted: boolean; _room_id: string }
        Returns: undefined
      }
      update_folder_password: {
        Args: {
          _current_password: string
          _folder_id: string
          _new_password?: string
        }
        Returns: boolean
      }
      update_room_password: {
        Args: { _password?: string; _room_id: string }
        Returns: undefined
      }
      verify_folder_password: {
        Args: { _folder_id: string; _password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
