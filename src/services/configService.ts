// services/configService.ts - Configuration et utilitaires
import type { EmailJSConfig } from "../types/emailService";

export class ConfigService {
  // Méthode pour obtenir la configuration EmailJS
  getEmailJSConfig(): EmailJSConfig {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || null;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || null;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || null;

    return {
      isEnabled: !!(serviceId && templateId && publicKey),
      hasValidConfig: !!(serviceId && templateId && publicKey),
      serviceId,
      templateId,
    };
  }

  // Méthode pour obtenir la configuration de l'API
  getApiConfig(): {
    baseUrl: string;
    hasValidConfig: boolean;
  } {
    const baseUrl =
      import.meta.env.VITE_STRAPI_URL || "http://localhost:1337/api";

    return {
      baseUrl,
      hasValidConfig: !!baseUrl,
    };
  }

  // Méthode pour obtenir toutes les configurations
  getAllConfigs(): {
    api: ReturnType<ConfigService["getApiConfig"]>;
    emailjs: EmailJSConfig;
    environment: string;
  } {
    return {
      api: this.getApiConfig(),
      emailjs: this.getEmailJSConfig(),
      environment: import.meta.env.MODE || "development",
    };
  }

  // Méthode pour valider la configuration
  validateConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const apiConfig = this.getApiConfig();
    const emailjsConfig = this.getEmailJSConfig();

    // Validation API
    if (!apiConfig.hasValidConfig) {
      errors.push("Configuration API manquante (VITE_STRAPI_URL)");
    }

    // Validation EmailJS
    if (!emailjsConfig.hasValidConfig) {
      warnings.push(
        "Configuration EmailJS incomplète - les emails externes ne fonctionneront pas",
      );
    }

    // Validation environnement
    if (import.meta.env.MODE === "development") {
      warnings.push("Mode développement détecté");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Méthodes utilitaires pour le formatage
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `Il y a ${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 48) {
      return "Hier";
    } else {
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    }
  }

  formatTime(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Méthode pour détecter si un email est externe
  isExternalEmail(email: string): boolean {
    const internalDomains = ["eni.mg", "localhost"];
    const domain = email.split("@")[1]?.toLowerCase();
    return !internalDomains.includes(domain);
  }

  // Méthode pour valider un email
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Méthode pour nettoyer une liste d'emails
  cleanEmailList(emails: string[]): string[] {
    return emails
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email && this.isValidEmail(email))
      .filter((email, index, array) => array.indexOf(email) === index); // Supprimer les doublons
  }

  // Méthode pour générer un ID unique
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Méthode pour obtenir l'avatar d'un utilisateur (gravatar ou initiales)
  getAvatarUrl(email: string, name?: string): string {
    // Pour l'instant, retourner une URL simple basée sur les initiales
    const initials = name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : email.split("@")[0].substring(0, 2).toUpperCase();

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=40`;
  }

  // Méthode pour déboguer les erreurs
  logError(context: string, error: any, data?: any): void {
    console.group(`❌ Erreur ${context}`);
    console.error("Error:", error);
    if (data) {
      console.log("Données contextuelles:", data);
    }
    console.trace("Stack trace");
    console.groupEnd();
  }

  // Méthode pour déboguer les informations
  logInfo(context: string, data: any): void {
    if (import.meta.env.MODE === "development") {
      console.group(`ℹ️ Info ${context}`);
      console.log("Données:", data);
      console.groupEnd();
    }
  }
}

export const configService = new ConfigService();
