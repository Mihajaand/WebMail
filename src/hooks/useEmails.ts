// hooks/useEmails.ts - Version corrigée pour supporter les messages suivis
import { useState, useEffect, useCallback } from "react";
import { emailService } from "../services/emailService";
import type { Email } from "../types/email";

// Interface locale pour éviter les erreurs d'import
interface ComposeEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
}

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

        let allEmails: Email[] = [];

        // Pour les messages suivis, on doit récupérer de tous les dossiers
        // pour avoir accès à tous les emails étoilés
        if (folder === "starred") {
          console.log("⭐ Fetching starred emails from all folders...");

          // Récupérer les emails de tous les dossiers principaux
          const folders = ["inbox", "sent", "drafts"];

          for (const folderName of folders) {
            try {
              console.log(`📁 Fetching from ${folderName}...`);
              const response = await emailService.getEmails(folderName, page);

              if (response.data && Array.isArray(response.data)) {
                const folderEmails: Email[] = response.data.map((item: any) => {
                  if (item.attributes) {
                    return {
                      id: String(item.id),
                      ...item.attributes,
                    };
                  } else {
                    return {
                      id: String(item.id || item._id),
                      ...item,
                    };
                  }
                });

                // Ajouter les emails de ce dossier
                allEmails = [...allEmails, ...folderEmails];
                console.log(
                  `✅ Added ${folderEmails.length} emails from ${folderName}`,
                );
              }
            } catch (error) {
              console.warn(`⚠️ Could not fetch from ${folderName}:`, error);
              // Continue avec les autres dossiers même si un échoue
            }
          }

          console.log(`📊 Total emails collected: ${allEmails.length}`);

          // Filtrer uniquement les emails étoilés
          const starredEmails = allEmails.filter((email) => {
            console.log(
              `Email ${email.id}: isStarred=${email.isStarred}, subject="${email.subject}"`,
            );
            return email.isStarred === true;
          });

          console.log(`⭐ Found ${starredEmails.length} starred emails`);
          allEmails = starredEmails;
        } else {
          // Pour tous les autres dossiers, fonctionnement normal
          console.log(`📁 Fetching from single folder: ${folder}`);
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

          // Convertir les objets Strapi { id, attributes } en Email
          allEmails = response.data.map((item: any) => {
            console.log("Processing item for folder", folder, ":", item);

            let email: Email;

            // Si c'est la structure Strapi classique
            if (item.attributes) {
              console.log(
                "Using Strapi structure, attributes:",
                item.attributes,
              );
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

            // Validation : Vérifier que l'email a les bonnes propriétés
            if (!email.from || !email.subject || !email.sentAt) {
              console.warn("⚠️ Email incomplet:", email);
            }

            return email;
          });
        }

        console.log(
          `✅ Processed ${allEmails.length} emails for folder ${folder}`,
        );
        console.log("Processed emails:", allEmails);

        // Trier les emails par date (plus récent en premier)
        allEmails.sort(
          (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
        );

        setState((prev) => ({
          ...prev,
          emails: reset ? allEmails : [...prev.emails, ...allEmails],
          totalCount: allEmails.length,
          currentPage: page,
          hasMore: false, // Pour simplifier, on charge tout d'un coup
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

        // Rafraîchir les emails pour refléter les changements
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

        // Si on est dans le dossier starred et qu'on retire l'étoile,
        // on doit rafraîchir pour que l'email disparaisse de la vue
        if (folder === "starred" && !newStarred) {
          console.log("🔄 Refreshing starred folder after unstar");
          setTimeout(() => fetchEmails(1, true), 500);
        }
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
    [state.emails, folder, fetchEmails],
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

  // Auto-refresh périodique pour la boîte de réception
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
