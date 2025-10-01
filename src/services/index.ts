// services/index.ts - Point d'entrée pour tous les services

// Export du service principal (recommandé pour la plupart des cas)
export { emailService as default } from "./emailService";
export { emailService } from "./emailService";

// Export des services spécialisés (pour un accès direct si nécessaire)
export { emailCrudService } from "./emailCrudService";
export { emailSendingService } from "./emailSendingService";
export { draftService } from "./draftService";
export { userService } from "./userService";
export { folderService } from "./folderService";
export { configService } from "./configService";

// Export de la classe ApiClient pour extension si nécessaire
export { ApiClient } from "./apiClient";

// Re-export des types depuis le service principal
export type {
  ApiResponse,
  ComposeEmailData,
  DraftData,
  StoredUser,
  UserResponse,
  EmailData,
  EmailStats,
  EmailJSConfig,
} from "../types/emailService";
