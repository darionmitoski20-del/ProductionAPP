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
      order_items: {
        Row: {
          addons: Json | null
          comment: string | null
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          addons?: Json | null
          comment?: string | null
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          addons?: Json | null
          comment?: string | null
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          accepted_buffer_minutes: number | null
          preparing_duration_minutes: number | null
          preparing_started_at: string | null
          ready_at: string | null
          created_at: string
          customer_name: string
          id: string
          order_note: string | null
          order_number: number
          phone: string
          pickup_time: string | null
          pickup_time_option: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
          confirmed_by: string | null
          confirmed_at: string | null
          confirmed_by_email: string | null
          canceled_by: string | null
          canceled_at: string | null
          canceled_by_email: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_buffer_minutes?: number | null
          preparing_duration_minutes?: number | null
          preparing_started_at?: string | null
          ready_at?: string | null
          created_at?: string
          customer_name: string
          id?: string
          order_note?: string | null
          order_number?: number
          phone: string
          pickup_time?: string | null
          pickup_time_option?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          confirmed_by?: string | null
          confirmed_at?: string | null
          confirmed_by_email?: string | null
          canceled_by?: string | null
          canceled_at?: string | null
          canceled_by_email?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_buffer_minutes?: number | null
          preparing_duration_minutes?: number | null
          preparing_started_at?: string | null
          ready_at?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          order_note?: string | null
          order_number?: number
          phone?: string
          pickup_time?: string | null
          pickup_time_option?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          confirmed_by?: string | null
          confirmed_at?: string | null
          confirmed_by_email?: string | null
          canceled_by?: string | null
          canceled_at?: string | null
          canceled_by_email?: string | null
        }
        Relationships: []
      }
      product_addons: {
        Row: {
          available: boolean | null
          id: string
          name: string
          name_mk: string | null
          name_en: string | null
          price: number
          product_id: string
        }
        Insert: {
          available?: boolean | null
          id?: string
          name: string
          name_mk?: string | null
          name_en?: string | null
          price?: number
          product_id: string
        }
        Update: {
          available?: boolean | null
          id?: string
          name?: string
          name_mk?: string | null
          name_en?: string | null
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          available: boolean | null
          created_at: string
          id: string
          name: string
          name_mk: string | null
          name_en: string | null
          price: number
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          available?: boolean | null
          created_at?: string
          id?: string
          name: string
          name_mk?: string | null
          name_en?: string | null
          price?: number
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          available?: boolean | null
          created_at?: string
          id?: string
          name?: string
          name_mk?: string | null
          name_en?: string | null
          price?: number
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          id: string
          name: string
          name_mk: string | null
          name_en: string | null
          slug: string
          icon: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_mk?: string | null
          name_en?: string | null
          slug: string
          icon?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_mk?: string | null
          name_en?: string | null
          slug?: string
          icon?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          available: boolean | null
          category: Database["public"]["Enums"]["product_category"] | null
          category_id: string | null
          created_at: string
          description: string | null
          description_mk: string | null
          description_en: string | null
          id: string
          image_url: string | null
          name: string
          name_mk: string | null
          name_en: string | null
          price: number
        }
        Insert: {
          available?: boolean | null
          category?: Database["public"]["Enums"]["product_category"] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_mk?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_mk?: string | null
          name_en?: string | null
          price: number
        }
        Update: {
          available?: boolean | null
          category?: Database["public"]["Enums"]["product_category"] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          description_mk?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_mk?: string | null
          name_en?: string | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          role: "ADMIN" | "STAFF"
          created_at: string
          full_name: string | null
        }
        Insert: {
          id: string
          email: string
          role?: "ADMIN" | "STAFF"
          created_at?: string
          full_name?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: "ADMIN" | "STAFF"
          created_at?: string
          full_name?: string | null
        }
        Relationships: []
      }
      app_design_settings: {
        Row: {
          app_name: string | null
          id: string
          logo_url: string | null
          hero_background_type: string
          hero_gradient_from: string
          hero_gradient_to: string
          hero_solid_color: string
          hero_image_url: string | null
          hero_title: string
          hero_subtitle: string
          primary_color: string
          secondary_color: string
          font_family: string
          button_radius: string
          timezone?: string | null
          social_facebook_url?: string | null
          social_instagram_url?: string | null
          updated_at: string
        }
        Insert: {
          app_name?: string | null
          id?: string
          logo_url?: string | null
          hero_background_type?: string
          hero_gradient_from?: string
          hero_gradient_to?: string
          hero_solid_color?: string
          hero_image_url?: string | null
          hero_title?: string
          hero_subtitle?: string
          primary_color?: string
          secondary_color?: string
          font_family?: string
          button_radius?: string
          timezone?: string | null
          social_facebook_url?: string | null
          social_instagram_url?: string | null
          updated_at?: string
        }
        Update: {
          app_name?: string | null
          id?: string
          logo_url?: string | null
          hero_background_type?: string
          hero_gradient_from?: string
          hero_gradient_to?: string
          hero_solid_color?: string
          hero_image_url?: string | null
          hero_title?: string
          hero_subtitle?: string
          primary_color?: string
          secondary_color?: string
          font_family?: string
          button_radius?: string
          timezone?: string | null
          social_facebook_url?: string | null
          social_instagram_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_category_uncategorize: {
        Args: { p_category_id: string }
        Returns: { moved_count: number; deleted: boolean }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: {
          uid: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      order_status:
        | "PENDING"
        | "ACCEPTED"
        | "PREPARING"
        | "READY"
        | "CANCELED"
      product_category:
        | "pizzas"
        | "burgers"
        | "wraps"
        | "toasts"
        | "fries"
        | "salads"
        | "drinks"
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
      app_role: ["admin", "staff"],
      order_status: [
        "PENDING",
        "ACCEPTED",
        "PREPARING",
        "READY",
        "CANCELED",
      ],
      product_category: [
        "pizzas",
        "burgers",
        "wraps",
        "toasts",
        "fries",
        "salads",
        "drinks",
      ],
    },
  },
} as const
