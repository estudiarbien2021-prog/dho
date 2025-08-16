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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      match_uploads: {
        Row: {
          created_at: string
          error_message: string | null
          filename: string
          id: string
          processed_matches: number
          status: string
          total_matches: number
          upload_date: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          filename: string
          id?: string
          processed_matches?: number
          status?: string
          total_matches?: number
          upload_date?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          filename?: string
          id?: string
          processed_matches?: number
          status?: string
          total_matches?: number
          upload_date?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          ai_confidence: number | null
          ai_prediction: string | null
          away_team: string
          category: string
          country: string | null
          created_at: string
          home_team: string
          id: string
          is_low_vig_1x2: boolean
          kickoff_local: string
          kickoff_utc: string
          league: string
          match_date: string
          odds_away: number
          odds_btts_no: number | null
          odds_btts_yes: number | null
          odds_draw: number
          odds_home: number
          odds_over_2_5: number | null
          odds_under_2_5: number | null
          p_away_fair: number
          p_btts_no_fair: number
          p_btts_yes_fair: number
          p_draw_fair: number
          p_home_fair: number
          p_over_2_5_fair: number
          p_under_2_5_fair: number
          updated_at: string
          vig_1x2: number
          vig_btts: number
          vig_ou_2_5: number
          watch_btts: boolean
          watch_over25: boolean
        }
        Insert: {
          ai_confidence?: number | null
          ai_prediction?: string | null
          away_team: string
          category: string
          country?: string | null
          created_at?: string
          home_team: string
          id?: string
          is_low_vig_1x2?: boolean
          kickoff_local: string
          kickoff_utc: string
          league: string
          match_date?: string
          odds_away?: number
          odds_btts_no?: number | null
          odds_btts_yes?: number | null
          odds_draw?: number
          odds_home?: number
          odds_over_2_5?: number | null
          odds_under_2_5?: number | null
          p_away_fair?: number
          p_btts_no_fair?: number
          p_btts_yes_fair?: number
          p_draw_fair?: number
          p_home_fair?: number
          p_over_2_5_fair?: number
          p_under_2_5_fair?: number
          updated_at?: string
          vig_1x2?: number
          vig_btts?: number
          vig_ou_2_5?: number
          watch_btts?: boolean
          watch_over25?: boolean
        }
        Update: {
          ai_confidence?: number | null
          ai_prediction?: string | null
          away_team?: string
          category?: string
          country?: string | null
          created_at?: string
          home_team?: string
          id?: string
          is_low_vig_1x2?: boolean
          kickoff_local?: string
          kickoff_utc?: string
          league?: string
          match_date?: string
          odds_away?: number
          odds_btts_no?: number | null
          odds_btts_yes?: number | null
          odds_draw?: number
          odds_home?: number
          odds_over_2_5?: number | null
          odds_under_2_5?: number | null
          p_away_fair?: number
          p_btts_no_fair?: number
          p_btts_yes_fair?: number
          p_draw_fair?: number
          p_home_fair?: number
          p_over_2_5_fair?: number
          p_under_2_5_fair?: number
          updated_at?: string
          vig_1x2?: number
          vig_btts?: number
          vig_ou_2_5?: number
          watch_btts?: boolean
          watch_over25?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      validated_picks: {
        Row: {
          away_team: string
          bet_type: string
          country: string | null
          created_at: string
          home_team: string
          id: string
          is_validated: boolean
          kickoff_utc: string
          league: string
          match_id: string
          odds: number
          prediction: string
          probability: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          vigorish: number
        }
        Insert: {
          away_team: string
          bet_type: string
          country?: string | null
          created_at?: string
          home_team: string
          id?: string
          is_validated?: boolean
          kickoff_utc: string
          league: string
          match_id: string
          odds: number
          prediction: string
          probability: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vigorish: number
        }
        Update: {
          away_team?: string
          bet_type?: string
          country?: string | null
          created_at?: string
          home_team?: string
          id?: string
          is_validated?: boolean
          kickoff_utc?: string
          league?: string
          match_id?: string
          odds?: number
          prediction?: string
          probability?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vigorish?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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
    Enums: {},
  },
} as const
