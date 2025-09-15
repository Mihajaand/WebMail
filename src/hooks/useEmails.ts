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
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await emailService.getEmails(folder, page);

        // 🔹 Convertir les objets Strapi { id, attributes } en Email
        const emails: Email[] = response.data.map((item: any) => ({
          id: String(item.id),
          ...item.attributes,
        }));

        setState((prev) => ({
          ...prev,
          emails: reset ? emails : [...prev.emails, ...emails],
          totalCount: response.meta?.pagination?.total || 0,
          currentPage: page,
          hasMore: page < (response.meta?.pagination?.pageCount || 1),
          loading: false,
        }));
      } catch (error) {
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
        await emailService.sendEmail(emailData);
        if (folder === "sent") {
          fetchEmails(1, true);
        }
        return true;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Erreur lors de l'envoi",
        }));
        return false;
      }
    },
    [folder, fetchEmails],
  );

  const markAsRead = useCallback(async (id: string, isRead: boolean) => {
    try {
      await emailService.markAsRead(id, isRead);
      setState((prev) => ({
        ...prev,
        emails: prev.emails.map((email) =>
          email.id === id ? { ...email, isRead } : email,
        ),
      }));
    } catch (error) {
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
        if (!email) return;

        const newStarred = !email.isStarred;
        await emailService.toggleStar(id, newStarred);

        setState((prev) => ({
          ...prev,
          emails: prev.emails.map((email) =>
            email.id === id ? { ...email, isStarred: newStarred } : email,
          ),
        }));
      } catch (error) {
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
      await emailService.moveToFolder(id, targetFolder);
      setState((prev) => ({
        ...prev,
        emails: prev.emails.filter((email) => email.id !== id),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Erreur lors du déplacement",
      }));
    }
  }, []);

  const deleteEmail = useCallback(async (id: string) => {
    try {
      await emailService.deleteEmail(id);
      setState((prev) => ({
        ...prev,
        emails: prev.emails.filter((email) => email.id !== id),
      }));
    } catch (error) {
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
      fetchEmails(state.currentPage + 1, false);
    }
  }, [fetchEmails, state.loading, state.hasMore, state.currentPage]);

  const refresh = useCallback(() => {
    fetchEmails(1, true);
  }, [fetchEmails]);

  useEffect(() => {
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
