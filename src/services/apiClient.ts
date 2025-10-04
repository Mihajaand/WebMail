// services/apiClient.ts - Client API de base
import type { StoredUser } from "../types/emailService";

const API_BASE = import.meta.env.VITE_STRAPI_URL || "http://localhost:1337/api";

export class ApiClient {
  protected async fetchApi<T>(
    endpoint: string,
    options?: RequestInit & { params?: Record<string, string | number> },
  ): Promise<T> {
    const token = localStorage.getItem("jwt");
    let fullUrl = `${API_BASE}${endpoint}`;
    
    // Ajouter les paramètres d'URL si présents
    if (options?.params) {
      const queryParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        queryParams.append(key, String(value));
      });
      fullUrl += `?${queryParams.toString()}`;
      // Supprimer params de options pour ne pas l'envoyer dans fetch
      delete options.params;
    }

    console.log("🌐 Making API request:", {
      url: fullUrl,
      method: options?.method || "GET",
      hasToken: !!token,
      headers: options?.headers,
    });

    const response = await fetch(fullUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    console.log("📡 API Response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: fullUrl,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: fullUrl,
      });
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const jsonResponse = await response.json();
    console.log("📦 API JSON Response:", jsonResponse);

    return jsonResponse as T;
  }

  protected getStoredUser(): StoredUser {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      throw new Error("Utilisateur non trouvé dans localStorage");
    }
    return JSON.parse(userStr) as StoredUser;
  }

  // Fonction helper pour obtenir l'identifiant correct (documentId ou id)
  protected async getEmailIdentifier(id: string): Promise<string> {
    try {
      const emailResponse = await this.fetchApi<any>(
        `/emails?filters[id][$eq]=${id}&populate=*`,
      );

      if (Array.isArray(emailResponse.data) && emailResponse.data.length > 0) {
        const email = emailResponse.data[0];
        return email.id.toString();
      }
    } catch (error) {
      console.warn(
        `❌ Impossible de récupérer l'identifiant pour ${id}:`,
        error,
      );
    }
    return id; // Fallback vers l'ID original
  }
}
