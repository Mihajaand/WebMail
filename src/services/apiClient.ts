// services/apiClient.ts - Client API de base
import type { StoredUser } from "../types/emailService";

const API_BASE = import.meta.env.VITE_STRAPI_URL || "http://localhost:1337/api";

export class ApiClient {
  protected baseUrl = API_BASE;

  protected getHeaders(): HeadersInit {
    const token = localStorage.getItem("jwt");
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    };
  }

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

    // ✅ CORRECTION CRITIQUE: Gérer les réponses vides (204 No Content)
    // Si la réponse est vide (comme pour DELETE), ne pas tenter de parser JSON
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");

    // Si pas de contenu (204) ou content-length = 0, retourner un objet vide
    if (response.status === 204 || contentLength === "0") {
      console.log("✅ Réponse vide (204 No Content ou content-length=0)");
      return {} as T;
    }

    // Si pas de content-type JSON, ne pas parser
    if (!contentType || !contentType.includes("application/json")) {
      console.log("⚠️ Réponse non-JSON, retour objet vide");
      return {} as T;
    }

    // Sinon, parser normalement le JSON
    try {
      const jsonResponse = await response.json();
      console.log("📦 API JSON Response:", jsonResponse);
      return jsonResponse as T;
    } catch (error) {
      console.warn("⚠️ Erreur parsing JSON, réponse probablement vide:", error);
      return {} as T;
    }
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
        return email.documentId || email.id.toString();
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