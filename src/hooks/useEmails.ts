// hooks/useEmails.ts - Version corrigée avec gestion des brouillons
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

interface DraftData extends ComposeEmailData {
  id?: string;
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
          const folders = ["inbox", "sent", "draft"];

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
            console.log("Premier item JSON:", JSON.stringify(response.data[0]));
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
        try {
          await fetchEmails(1, true);
        } catch (fetchError) {
          console.warn("⚠️ Impossible de rafraîchir les emails immédiatement:", fetchError);
          // On programme un rafraîchissement différé
          setTimeout(() => fetchEmails(1, true), 2000);
        }

        return true;
      } catch (error) {
        // Si l'erreur vient de la récupération de l'email mis à jour (404), on considère quand même que l'envoi a réussi
        if (error instanceof Error && error.message.includes("404 Not Found")) {
          console.warn("⚠️ Email envoyé mais impossible de le récupérer immédiatement");
          // On programme un rafraîchissement différé
          setTimeout(() => fetchEmails(1, true), 2000);
          return true;
        }

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

  const saveDraft = useCallback(
    async (draftData: DraftData): Promise<boolean> => {
      try {
        console.log("💾 Saving draft:", draftData);

        const result = await emailService.saveDraft(draftData);
        console.log("✅ Draft saved successfully:", result);

        // Rafraîchir les emails pour refléter les changements
        await fetchEmails(1, true);

        return true;
      } catch (error) {
        console.error("❌ Error saving draft:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Erreur lors de la sauvegarde du brouillon",
        }));
        return false;
      }
    },
    [fetchEmails],
  );

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

        // Mise à jour optimiste de l'interface
        setState((prev) => ({
          ...prev,
          emails: prev.emails.map((email) =>
            email.id === id ? { ...email, isStarred: newStarred } : email,
          ),
        }));

        try {
          // Mise à jour du backend
          await emailService.toggleStar(id, newStarred);
          console.log(`✅ Star toggled successfully in backend for ${id}`);

          // Si on retire l'étoile d'un email dans le dossier starred,
          // on le retire immédiatement de la vue
          if (folder === "starred" && !newStarred) {
            console.log("🔄 Removing unstarred email from starred view");
            setState((prev) => ({
              ...prev,
              emails: prev.emails.filter((email) => email.id !== id),
            }));
          }
        } catch (backendError) {
          console.error("❌ Error updating star in backend:", backendError);

          // En cas d'erreur backend, revenir à l'état précédent
          setState((prev) => ({
            ...prev,
            emails: prev.emails.map((email) =>
              email.id === id ? { ...email, isStarred: !newStarred } : email,
            ),
            error: "Erreur lors de la mise à jour de l'étoile",
          }));
        }
      } catch (error) {
        console.error("❌ Error in toggleStar:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Erreur lors de la mise à jour",
        }));
      }
    },
    [state.emails, folder],
  );

  const moveToFolder = useCallback(
    async (id: string, targetFolder: string) => {
      try {
        console.log(`📁 Moving email ${id} to folder: ${targetFolder}`);

        // Mise à jour dans le backend d'abord
        await emailService.moveToFolder(id, targetFolder);
        console.log(`✅ Email ${id} moved to ${targetFolder} successfully`);

        // Attendre que l'opération soit terminée avant de mettre à jour l'interface
        const success = await emailService.getEmails(targetFolder, 1);
        if (success) {
          // Si c'est un déplacement vers la corbeille, retirer l'email de la liste actuelle
          if (targetFolder === "trash") {
            setState((prev) => ({
              ...prev,
              emails: prev.emails.filter((email) => email.id !== id),
            }));
          }

          // Rafraîchir la vue actuelle
          await fetchEmails(1, true);
        } else {
          throw new Error("Erreur de synchronisation après déplacement");
        }
      } catch (error) {
        console.error("❌ Error moving email:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Erreur lors du déplacement",
        }));
        throw error; // Propager l'erreur pour la gestion dans le composant
      }
    },
    [folder, fetchEmails],
  );

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
const markAsRead = useCallback(
  async (id: string) => {
    try {
      const email = state.emails.find((e) => e.id === id);
      if (!email || email.isRead) return;

      // Mise à jour optimiste
      setState((prev) => ({
        ...prev,
        emails: prev.emails.map((e) =>
          e.id === id ? { ...e, isRead: true } : e
        ),
      }));

      // Mettre à jour le backend
      await emailService.markAsRead(id); // tu peux créer cette méthode dans emailService
      console.log(`✅ Email ${id} marked as read in backend`);
    } catch (error) {
      console.error("❌ Failed to mark email as read:", error);
    }
  },
  [state.emails]
);

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
    saveDraft,
    toggleStar,
    moveToFolder,
    deleteEmail,
    loadMore,
    refresh,
    markAsRead,
  };
};
