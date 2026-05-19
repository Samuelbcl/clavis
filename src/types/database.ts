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
      biens: {
        Row: {
          adresse_complete: string
          code_postal: string
          created_at: string
          id: string
          nom: string
          notes: string | null
          type: Database["public"]["Enums"]["bien_type"]
          updated_at: string
          ville: string
        }
        Insert: {
          adresse_complete: string
          code_postal: string
          created_at?: string
          id?: string
          nom: string
          notes?: string | null
          type: Database["public"]["Enums"]["bien_type"]
          updated_at?: string
          ville: string
        }
        Update: {
          adresse_complete?: string
          code_postal?: string
          created_at?: string
          id?: string
          nom?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["bien_type"]
          updated_at?: string
          ville?: string
        }
        Relationships: []
      }
      cles: {
        Row: {
          bien_id: string
          code: string
          created_at: string
          description: string | null
          id: string
          personne_actuelle_id: string | null
          statut: Database["public"]["Enums"]["cle_statut"]
          type: Database["public"]["Enums"]["cle_type"]
          updated_at: string
        }
        Insert: {
          bien_id: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          personne_actuelle_id?: string | null
          statut?: Database["public"]["Enums"]["cle_statut"]
          type: Database["public"]["Enums"]["cle_type"]
          updated_at?: string
        }
        Update: {
          bien_id?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          personne_actuelle_id?: string | null
          statut?: Database["public"]["Enums"]["cle_statut"]
          type?: Database["public"]["Enums"]["cle_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cles_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cles_personne_actuelle_id_fkey"
            columns: ["personne_actuelle_id"]
            isOneToOne: false
            referencedRelation: "personnes"
            referencedColumns: ["id"]
          },
        ]
      }
      mouvements: {
        Row: {
          cle_id: string
          confirmee_par_receveur: boolean
          created_at: string
          date_confirmation: string | null
          date_mouvement: string
          id: string
          notes: string | null
          operateur_id: string
          personne_id: string | null
          photo_url: string | null
          signature_url: string | null
          type: Database["public"]["Enums"]["mouvement_type"]
        }
        Insert: {
          cle_id: string
          confirmee_par_receveur?: boolean
          created_at?: string
          date_confirmation?: string | null
          date_mouvement?: string
          id?: string
          notes?: string | null
          operateur_id: string
          personne_id?: string | null
          photo_url?: string | null
          signature_url?: string | null
          type: Database["public"]["Enums"]["mouvement_type"]
        }
        Update: {
          cle_id?: string
          confirmee_par_receveur?: boolean
          created_at?: string
          date_confirmation?: string | null
          date_mouvement?: string
          id?: string
          notes?: string | null
          operateur_id?: string
          personne_id?: string | null
          photo_url?: string | null
          signature_url?: string | null
          type?: Database["public"]["Enums"]["mouvement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_cle_id_fkey"
            columns: ["cle_id"]
            isOneToOne: false
            referencedRelation: "cles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_cle_id_fkey"
            columns: ["cle_id"]
            isOneToOne: false
            referencedRelation: "cles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_operateur_id_fkey"
            columns: ["operateur_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_personne_id_fkey"
            columns: ["personne_id"]
            isOneToOne: false
            referencedRelation: "personnes"
            referencedColumns: ["id"]
          },
        ]
      }
      personnes: {
        Row: {
          created_at: string
          email: string | null
          id: string
          metier: string | null
          nom: string
          notes: string | null
          prenom: string
          telephone: string
          type: Database["public"]["Enums"]["personne_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          metier?: string | null
          nom: string
          notes?: string | null
          prenom: string
          telephone: string
          type: Database["public"]["Enums"]["personne_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          metier?: string | null
          nom?: string
          notes?: string | null
          prenom?: string
          telephone?: string
          type?: Database["public"]["Enums"]["personne_type"]
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          nom: string
          prenom: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id: string
          nom?: string
          prenom?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          prenom?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      cles_view: {
        Row: {
          bien_adresse_complete: string | null
          bien_code_postal: string | null
          bien_id: string | null
          bien_nom: string | null
          bien_type: Database["public"]["Enums"]["bien_type"] | null
          bien_ville: string | null
          code: string | null
          created_at: string | null
          dernier_mouvement_date: string | null
          dernier_mouvement_type:
            | Database["public"]["Enums"]["mouvement_type"]
            | null
          description: string | null
          id: string | null
          personne_actuelle_id: string | null
          personne_email: string | null
          personne_nom: string | null
          personne_prenom: string | null
          personne_telephone: string | null
          personne_type: Database["public"]["Enums"]["personne_type"] | null
          search_vector: unknown
          statut: Database["public"]["Enums"]["cle_statut"] | null
          type: Database["public"]["Enums"]["cle_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cles_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cles_personne_actuelle_id_fkey"
            columns: ["personne_actuelle_id"]
            isOneToOne: false
            referencedRelation: "personnes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      bien_type:
        | "maison"
        | "appartement"
        | "studio"
        | "commerce"
        | "garage"
        | "autre"
      cle_statut: "disponible" | "remise" | "perdue" | "refaite" | "archivee"
      cle_type:
        | "porte_entree"
        | "garage"
        | "cave"
        | "boite_aux_lettres"
        | "badge_immeuble"
        | "autre"
      mouvement_type: "remise" | "retour" | "perte" | "refaite"
      personne_type:
        | "locataire"
        | "ouvrier"
        | "artisan"
        | "agent"
        | "notaire"
        | "proprietaire"
        | "autre"
      user_role: "admin" | "operateur"
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
      bien_type: [
        "maison",
        "appartement",
        "studio",
        "commerce",
        "garage",
        "autre",
      ],
      cle_statut: ["disponible", "remise", "perdue", "refaite", "archivee"],
      cle_type: [
        "porte_entree",
        "garage",
        "cave",
        "boite_aux_lettres",
        "badge_immeuble",
        "autre",
      ],
      mouvement_type: ["remise", "retour", "perte", "refaite"],
      personne_type: [
        "locataire",
        "ouvrier",
        "artisan",
        "agent",
        "notaire",
        "proprietaire",
        "autre",
      ],
      user_role: ["admin", "operateur"],
    },
  },
} as const
