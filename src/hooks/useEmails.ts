// hooks/useEmails.ts
import { useState, useEffect, useCallback } from "react";
import { emailService } from "../services/emailService";
import type { Email } from "../types/email";
import type { ComposeEmailData } from "../types/api";

interface UseEmailsState {
  emails: Email[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
}

export const useEmails = (folder: string = "inbox") => {
  const [state, setState] = useState<UseEmailsState>({
    emails: [],
    loading: true,
    error: null,
    totalCount: 0,
    currentPage: 1,
    hasMore: true,
  });

  const fetchEmails = useCallback(
    async (page: number = 1, reset: boolean = true) => {
      try {
        console.log(`📥 Fetching emails for folder: ${folder}, page: ${page}`);
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await emailService.getEmails(folder, page);

        console.log("=== DEBUG API RESPONSE ===");
        console.log("Folder:", folder);
        console.log("Response complète:", response);
        console.log("Response.data length:", response.data?.length || 0);

        if (response.data && response.data[0]) {
          console.log("Premier item brut:", response.data[0]);
          console.log(
            "Attributes du premier item:",
            response.data[0].attributes,
          );
        }

        // 🔹 Convertir les objets Strapi { id, attributes } en Email
        const emails: Email[] = response.data.map((item: any) => {
          console.log("Processing item for folder", folder, ":", item);

          let email: Email;

          // Si c'est la structure Strapi classique
          if (item.attributes) {
            console.log("Using Strapi structure, attributes:", item.attributes);
            email = {
              id: String(item.id),
              ...item.attributes,
            };
          }
          // Si c'est une structure directe
          else {
            console.log("Using direct structure");
            email = {
              id: String(item.id || item._id),
              ...item,
            };
          }

          // ✅ VALIDATION : Vérifier que l'email a les bonnes propriétés
          if (!email.from || !email.subject || !email.sentAt) {
            console.warn("⚠️ Email incomplet:", email);
          }

          return email;
        });

        console.log(
          `✅ Processed ${emails.length} emails for folder ${folder}`,
        );
        console.log("Processed emails:", emails);

        setState((prev) => ({
          ...prev,
          emails: reset ? emails : [...prev.emails, ...emails],
          totalCount: response.meta?.pagination?.total || emails.length,
          currentPage: page,
          hasMore: page < (response.meta?.pagination?.pageCount || 1),
          loading: false,
        }));
      } catch (error) {
        console.error(`❌ Error fetching emails for folder ${folder}:`, error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Une erreur est survenue",
          loading: false,
        }));
      }
    },
    [folder],
  );

  const sendEmail = useCallback(
    async (emailData: ComposeEmailData): Promise<boolean> => {
      try {
        console.log("📤 Sending email:", emailData);

        const result = await emailService.sendEmail(emailData);
        console.log("✅ Email sent successfully:", result);

        // ✅ CORRECTION : Rafraîchir les emails pour refléter les changements
        // Si on est dans le dossier "sent", on verra le nouvel email envoyé
        // Si on est dans "inbox" et qu'on s'envoie un email, on le verra aussi
        await fetchEmails(1, true);

        return true;
      } catch (error) {
        console.error("❌ Error sending email:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Erreur lors de l'envoi",
        }));
        return false;
      }
    },
    [fetchEmails],
  );

  const markAsRead = useCallback(async (id: string, isRead: boolean) => {
    try {
      console.log(`📖 Marking email ${id} as read: ${isRead}`);
      await emailService.markAsRead(id, isRead);
      setState((prev) => ({
        ...prev,
        emails: prev.emails.map((email) =>
          email.id === id ? { ...email, isRead } : email,
        ),
      }));
    } catch (error) {
      console.error("❌ Error marking email as read:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la mise à jour",
      }));
    }
  }, []);

  const toggleStar = useCallback(
    async (id: string) => {
      try {
        const email = state.emails.find((e) => e.id === id);
        if (!email) {
          console.warn(`⚠️ Email not found for starring: ${id}`);
          return;
        }

        const newStarred = !email.isStarred;
        console.log(`⭐ Toggling star for email ${id}: ${newStarred}`);

        await emailService.toggleStar(id, newStarred);

        setState((prev) => ({
          ...prev,
          emails: prev.emails.map((email) =>
            email.id === id ? { ...email, isStarred: newStarred } : email,
          ),
        }));
      } catch (error) {
        console.error("❌ Error toggling star:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Erreur lors de la mise à jour",
        }));
      }
    },
    [state.emails],
  );

  const moveToFolder = useCallback(async (id: string, targetFolder: string) => {
    try {
      console.log(`📁 Moving email ${id} to folder: ${targetFolder}`);
      await emailService.moveToFolder(id, targetFolder);

      // Retirer l'email de la liste actuelle
      setState((prev) => ({
        ...prev,
        emails: prev.emails.filter((email) => email.id !== id),
      }));
    } catch (error) {
      console.error("❌ Error moving email:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Erreur lors du déplacement",
      }));
    }
  }, []);

  const deleteEmail = useCallback(async (id: string) => {
    try {
      console.log(`🗑️ Deleting email: ${id}`);
      await emailService.deleteEmail(id);
      setState((prev) => ({
        ...prev,
        emails: prev.emails.filter((email) => email.id !== id),
      }));
    } catch (error) {
      console.error("❌ Error deleting email:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la suppression",
      }));
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      console.log(`📄 Loading more emails, page: ${state.currentPage + 1}`);
      fetchEmails(state.currentPage + 1, false);
    }
  }, [fetchEmails, state.loading, state.hasMore, state.currentPage]);

  const refresh = useCallback(() => {
    console.log(`🔄 Refreshing emails for folder: ${folder}`);
    fetchEmails(1, true);
  }, [fetchEmails, folder]);

  // ✅ NOUVEAU : Auto-refresh périodique pour la boîte de réception
  useEffect(() => {
    if (folder === "inbox") {
      const interval = setInterval(() => {
        console.log("🔄 Auto-refreshing inbox...");
        fetchEmails(1, true);
      }, 30000); // Refresh toutes les 30 secondes

      return () => clearInterval(interval);
    }
  }, [folder, fetchEmails]);

  useEffect(() => {
    console.log(`🔄 Folder changed to: ${folder}`);
    fetchEmails(1, true);
  }, [fetchEmails]);

  return {
    ...state,
    sendEmail,
    markAsRead,
    toggleStar,
    moveToFolder,
    deleteEmail,
    loadMore,
    refresh,
  };
};
