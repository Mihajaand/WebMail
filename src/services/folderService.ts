// services/folderService.ts - Gestion des dossiers
import { ApiClient } from "./apiClient";
import type { ApiResponse } from "../types/emailService";
import type { CustomFolder } from "../types/email";

export class FolderService extends ApiClient {
  async getCustomFolders(): Promise<ApiResponse<CustomFolder[]>> {
    return this.fetchApi<ApiResponse<CustomFolder[]>>("/folders?populate=*");
  }

  async createFolder(
    name: string,
    color: string,
  ): Promise<ApiResponse<CustomFolder>> {
    const user = this.getStoredUser();
    return this.fetchApi<ApiResponse<CustomFolder>>("/folders", {
      method: "POST",
      body: JSON.stringify({
        data: { name, color, user: user.id },
      }),
    });
  }

  async updateFolder(
    id: string,
    name: string,
    color: string,
  ): Promise<ApiResponse<CustomFolder>> {
    return this.fetchApi<ApiResponse<CustomFolder>>(`/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        data: { name, color },
      }),
    });
  }

  async deleteFolder(id: string): Promise<void> {
    await this.fetchApi(`/folders/${id}`, {
      method: "DELETE",
    });
  }

  async getFolderById(id: string): Promise<ApiResponse<CustomFolder>> {
    return this.fetchApi<ApiResponse<CustomFolder>>(
      `/folders/${id}?populate=*`,
    );
  }

  // Méthode pour obtenir les statistiques des dossiers
  async getFolderStats(): Promise<{
    totalFolders: number;
    customFolders: number;
    defaultFolders: number;
  }> {
    try {
      const response = await this.getCustomFolders();
      const customFolders = Array.isArray(response.data)
        ? response.data.length
        : 0;
      const defaultFolders = 5; // inbox, sent, draft, trash, spam

      return {
        totalFolders: customFolders + defaultFolders,
        customFolders,
        defaultFolders,
      };
    } catch (error) {
      console.error("❌ Erreur récupération stats dossiers:", error);
      return {
        totalFolders: 5,
        customFolders: 0,
        defaultFolders: 5,
      };
    }
  }

  // Méthode pour vérifier si un nom de dossier existe déjà
  async folderNameExists(name: string): Promise<boolean> {
    try {
      const response = await this.fetchApi<ApiResponse<any>>(
        `/folders?filters[name][$eq]=${encodeURIComponent(name)}&populate=*`,
      );

      const folders = Array.isArray(response.data) ? response.data : [];
      return folders.length > 0;
    } catch (error) {
      console.error("❌ Erreur vérification nom dossier:", error);
      return false;
    }
  }

  // Méthode pour obtenir tous les dossiers (par défaut + personnalisés)
  async getAllFolders(): Promise<{
    default: { id: string; name: string; icon: string }[];
    custom: CustomFolder[];
  }> {
    try {
      const customFoldersResponse = await this.getCustomFolders();
      const customFolders = Array.isArray(customFoldersResponse.data)
        ? customFoldersResponse.data
        : [];

      const defaultFolders = [
        { id: "inbox", name: "Boîte de réception", icon: "📥" },
        { id: "sent", name: "Envoyés", icon: "📤" },
        { id: "draft", name: "Brouillons", icon: "📝" },
        { id: "trash", name: "Corbeille", icon: "🗑️" },
        { id: "spam", name: "Spam", icon: "🚫" },
      ];

      return {
        default: defaultFolders,
        custom: customFolders,
      };
    } catch (error) {
      console.error("❌ Erreur récupération tous les dossiers:", error);
      return {
        default: [
          { id: "inbox", name: "Boîte de réception", icon: "📥" },
          { id: "sent", name: "Envoyés", icon: "📤" },
          { id: "draft", name: "Brouillons", icon: "📝" },
          { id: "trash", name: "Corbeille", icon: "🗑️" },
          { id: "spam", name: "Spam", icon: "🚫" },
        ],
        custom: [],
      };
    }
  }
}

export const folderService = new FolderService();
