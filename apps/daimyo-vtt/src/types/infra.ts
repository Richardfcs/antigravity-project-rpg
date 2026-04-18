export interface InfraReadiness {
  supabase: boolean;
  cloudinary: boolean;
  serviceRole: boolean;
  lobbyReady: boolean;
  all: boolean;
  missing: string[];
}
