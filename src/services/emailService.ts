// services/emailService.ts - Service principal refactorisé
import { emailCrudService } from "./emailCrudService";
import { emailSendingService } from "./emailSendingService";
import { draftService } from "./draftService";
import { userService } from "./userService";
import { folderService } from "./folderService";
import { configService } from "./configService";
import type {
  ComposeEmailData,
  DraftData,
  ApiResponse,
  EmailStats,
  EmailJSConfig,
} from "../types/emailService";
import type { Email, CustomFolder } from "../types/email";

/**
 * Service principal pour la gestion des emails
 * Coordonne tous les sous-services et expose une API unifiée
 */
class EmailService {
  // ===== OPÉRATIONS CRUD =====

  async getEmails(
    folder: string = "inbox",
    page: number = 1,
  ): Promise<ApiResponse<Email[]>> {
    return emailCrudService.getEmails(folder, page);
  }

  async getEmail(id: string): Promise<ApiResponse<Email>> {
    return emailCrudService.getEmail(id);
  }

  async getEmailById(id: string): Promise<Email | null> {
    return emailCrudService.getEmailById(id);
  }

  async searchEmails(query: string): Promise<ApiResponse<Email[]>> {
    return emailCrudService.searchEmails(query);
  }

  async toggleStar(id: string, isStarred: boolean): Promise<void> {
    return emailCrudService.toggleStar(id, isStarred);
  }

  async moveToFolder(id: string, folder: string): Promise<void> {
    return emailCrudService.moveToFolder(id, folder);
  }

  async deleteEmail(id: string): Promise<void> {
    return emailCrudService.deleteEmail(id);
  }

  async markAsRead(id: string, isRead: boolean = true): Promise<void> {
    return emailCrudService.markAsRead(id, isRead);
  }

  async markAsImportant(
    id: string,
    isImportant: boolean = true,
  ): Promise<void> {
    return emailCrudService.markAsImportant(id, isImportant);
  }

  async getUnreadCount(folder: string = "inbox"): Promise<number> {
    return emailCrudService.getUnreadCount(folder);
  }

  async refreshEmails(folder: string): Promise<ApiResponse<Email[]>> {
    return emailCrudService.refreshEmails(folder);
  }

  async getEmailsByStatus(
    status: "read" | "unread" | "starred" | "important",
    page: number = 1,
  ): Promise<ApiResponse<Email[]>> {
    return emailCrudService.getEmailsByStatus(status, page);
  }

  // ===== ENVOI D'EMAILS =====

  async sendEmail(emailData: ComposeEmailData): Promise<ApiResponse<Email>> {
    return emailSendingService.sendEmail(emailData);
  }

  async retryFailedEmail(emailId: string): Promise<boolean> {
    return emailSendingService.retryFailedEmail(emailId);
  }

  // ===== GESTION DES BROUILLONS =====

  async saveDraft(draftData: DraftData): Promise<ApiResponse<Email>> {
    return draftService.saveDraft(draftData);
  }

  async deleteDraft(draftId: string): Promise<void> {
    return draftService.deleteDraft(draftId);
  }

  // ===== GESTION DES DOSSIERS =====

  async getCustomFolders(): Promise<ApiResponse<CustomFolder[]>> {
    return folderService.getCustomFolders();
  }

  async createFolder(
    name: string,
    color: string,
  ): Promise<ApiResponse<CustomFolder>> {
    return folderService.createFolder(name, color);
  }

  async updateFolder(
    id: string,
    name: string,
    color: string,
  ): Promise<ApiResponse<CustomFolder>> {
    return folderService.updateFolder(id, name, color);
  }

  async deleteFolder(id: string): Promise<void> {
    return folderService.deleteFolder(id);
  }

  async getFolderById(id: string): Promise<ApiResponse<CustomFolder>> {
    return folderService.getFolderById(id);
  }

  async getAllFolders(): Promise<{
    default: { id: string; name: string; icon: string }[];
    custom: CustomFolder[];
  }> {
    return folderService.getAllFolders();
  }

  async folderNameExists(name: string): Promise<boolean> {
    return folderService.folderNameExists(name);
  }

  // ===== GESTION DES UTILISATEURS =====

  async getUserByEmail(email: string) {
    return userService.getUserByEmail(email);
  }

  // ===== STATISTIQUES ET RAPPORTS =====

  async getEmailStats(): Promise<EmailStats> {
    return emailCrudService.getEmailStats();
  }

  async getFolderStats() {
    return folderService.getFolderStats();
  }

  async getEmailsWithDeliveryStatus(
    folder: string = "sent",
    page: number = 1,
  ): Promise<ApiResponse<Email[]>> {
    return emailCrudService.getEmailsWithDeliveryStatus(folder, page);
  }

  // ===== UTILITAIRES ET MAINTENANCE =====

  async createTestEmail(): Promise<void> {
    return emailCrudService.createTestEmail();
  }

  async syncEmailStarStatus(id: string): Promise<boolean | null> {
    return emailCrudService.syncEmailStarStatus(id);
  }

  async exportEmails(folder?: string): Promise<Email[]> {
    return emailCrudService.exportEmails(folder);
  }

  async cleanupOldEmails(daysOld: number = 30): Promise<number> {
    return emailCrudService.cleanupOldEmails(daysOld);
  }

  // ===== CONFIGURATION =====

  getEmailJSConfig(): EmailJSConfig {
    return configService.getEmailJSConfig();
  }

  getApiConfig() {
    return configService.getApiConfig();
  }

  getAllConfigs() {
    return configService.getAllConfigs();
  }

  validateConfig() {
    return configService.validateConfig();
  }

  // ===== UTILITAIRES DE FORMATAGE =====

  formatFileSize(bytes: number): string {
    return configService.formatFileSize(bytes);
  }

  formatDate(date: string | Date): string {
    return configService.formatDate(date);
  }

  formatTime(date: string | Date): string {
    return configService.formatTime(date);
  }

  isExternalEmail(email: string): boolean {
    return configService.isExternalEmail(email);
  }

  isValidEmail(email: string): boolean {
    return configService.isValidEmail(email);
  }

  cleanEmailList(emails: string[]): string[] {
    return configService.cleanEmailList(emails);
  }

  generateId(): string {
    return configService.generateId();
  }

  getAvatarUrl(email: string, name?: string): string {
    return configService.getAvatarUrl(email, name);
  }

  // ===== MÉTHODES DE DÉBOGAGE =====

  logError(context: string, error: any, data?: any): void {
    return configService.logError(context, error, data);
  }

  logInfo(context: string, data: any): void {
    return configService.logInfo(context, data);
  }

  // ===== MÉTHODES BATCH =====

  /**
   * Marquer plusieurs emails comme lus/non lus
   */
  async markMultipleAsRead(
    ids: string[],
    isRead: boolean = true,
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await this.markAsRead(id, isRead);
        success++;
      } catch (error) {
        failed++;
        errors.push(`Erreur pour email ${id}: ${error}`);
      }
    }

    console.log(`📊 Batch markAsRead: ${success} succès, ${failed} échecs`);
    return { success, failed, errors };
  }

  /**
   * Déplacer plusieurs emails vers un dossier
   */
  async moveMultipleToFolder(
    ids: string[],
    folder: string,
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await this.moveToFolder(id, folder);
        success++;
      } catch (error) {
        failed++;
        errors.push(`Erreur pour email ${id}: ${error}`);
      }
    }

    console.log(`📊 Batch moveToFolder: ${success} succès, ${failed} échecs`);
    return { success, failed, errors };
  }

  /**
   * Supprimer plusieurs emails
   */
  async deleteMultipleEmails(ids: string[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await this.deleteEmail(id);
        success++;
      } catch (error) {
        failed++;
        errors.push(`Erreur pour email ${id}: ${error}`);
      }
    }

    console.log(`📊 Batch deleteEmails: ${success} succès, ${failed} échecs`);
    return { success, failed, errors };
  }

  /**
   * Marquer plusieurs emails avec étoile
   */
  async toggleMultipleStars(
    ids: string[],
    isStarred: boolean,
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await this.toggleStar(id, isStarred);
        success++;
      } catch (error) {
        failed++;
        errors.push(`Erreur pour email ${id}: ${error}`);
      }
    }

    console.log(`📊 Batch toggleStars: ${success} succès, ${failed} échecs`);
    return { success, failed, errors };
  }

  // ===== RECHERCHE AVANCÉE =====

  /**
   * Recherche d'emails avec filtres avancés
   */
  async advancedSearch(
    criteria: {
      query?: string;
      folder?: string;
      from?: string;
      to?: string;
      subject?: string;
      dateFrom?: string;
      dateTo?: string;
      isRead?: boolean;
      isStarred?: boolean;
      isImportant?: boolean;
      hasAttachments?: boolean;
    },
    page: number = 1,
  ): Promise<ApiResponse<Email[]>> {
    try {
      // Utiliser emailCrudService pour accéder à getStoredUser
      const user = this.getStoredUser();

      let filters = [`filters[user][id][$eq]=${user.id}`];

      // Ajouter les filtres selon les critères
      if (criteria.folder) {
        filters.push(`filters[folder][$eq]=${criteria.folder}`);
      }

      if (criteria.from) {
        filters.push(
          `filters[from][$containsi]=${encodeURIComponent(criteria.from)}`,
        );
      }

      if (criteria.to) {
        filters.push(
          `filters[to][$containsi]=${encodeURIComponent(criteria.to)}`,
        );
      }

      if (criteria.subject) {
        filters.push(
          `filters[subject][$containsi]=${encodeURIComponent(criteria.subject)}`,
        );
      }

      if (criteria.dateFrom) {
        filters.push(`filters[sentAt][$gte]=${criteria.dateFrom}`);
      }

      if (criteria.dateTo) {
        filters.push(`filters[sentAt][$lte]=${criteria.dateTo}`);
      }

      if (criteria.isRead !== undefined) {
        filters.push(`filters[isRead][$eq]=${criteria.isRead}`);
      }

      if (criteria.isStarred !== undefined) {
        filters.push(`filters[isStarred][$eq]=${criteria.isStarred}`);
      }

      if (criteria.isImportant !== undefined) {
        filters.push(`filters[isImportant][$eq]=${criteria.isImportant}`);
      }

      // Recherche textuelle globale si fournie
      if (criteria.query) {
        const textFilters = [
          `filters[$or][0][subject][$containsi]=${encodeURIComponent(criteria.query)}`,
          `filters[$or][1][body][$containsi]=${encodeURIComponent(criteria.query)}`,
          `filters[$or][2][from][$containsi]=${encodeURIComponent(criteria.query)}`,
        ];
        filters = filters.concat(textFilters);
      }

      const queryString = filters.join("&");
      const endpoint = `/emails?${queryString}&sort=sentAt:desc&pagination[page]=${page}&pagination[pageSize]=20&populate=*`;

      return emailCrudService["fetchApi"]<ApiResponse<Email[]>>(endpoint);
    } catch (error) {
      this.logError("advancedSearch", error, criteria);
      throw error;
    }
  }

  // Helper method pour accéder à getStoredUser
  private getStoredUser() {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      throw new Error("Utilisateur non trouvé dans localStorage");
    }
    return JSON.parse(userStr);
  }

  // ===== MÉTHODES D'ANALYSE =====

  /**
   * Obtenir un résumé complet des emails
   */
  async getEmailSummary(): Promise<{
    totalEmails: number;
    unreadCount: number;
    starredCount: number;
    importantCount: number;
    draftCount: number;
    sentCount: number;
    trashCount: number;
    folderCounts: { [key: string]: number };
  }> {
    try {
      const user = this.getStoredUser();

      // Requêtes parallèles pour optimiser les performances
      const [
        totalResponse,
        unreadResponse,
        starredResponse,
        importantResponse,
        draftResponse,
        sentResponse,
        trashResponse,
      ] = await Promise.all([
        emailCrudService["fetchApi"]<ApiResponse<any>>(
          `/emails?filters[user][id][$eq]=${user.id}&pagination[pageSize]=1`,
        ),
        emailCrudService["fetchApi"]<ApiResponse<any>>(
          `/emails?filters[user][id][$eq]=${user.id}&filters[isRead][$eq]=false&pagination[pageSize]=1`,
        ),
        emailCrudService["fetchApi"]<ApiResponse<any>>(
          `/emails?filters[user][id][$eq]=${user.id}&filters[isStarred][$eq]=true&pagination[pageSize]=1`,
        ),
        emailCrudService["fetchApi"]<ApiResponse<any>>(
          `/emails?filters[user][id][$eq]=${user.id}&filters[isImportant][$eq]=true&pagination[pageSize]=1`,
        ),
        emailCrudService["fetchApi"]<ApiResponse<any>>(
          `/emails?filters[user][id][$eq]=${user.id}&filters[folder][$eq]=draft&pagination[pageSize]=1`,
        ),
        emailCrudService["fetchApi"]<ApiResponse<any>>(
          `/emails?filters[user][id][$eq]=${user.id}&filters[folder][$eq]=sent&pagination[pageSize]=1`,
        ),
        emailCrudService["fetchApi"]<ApiResponse<any>>(
          `/emails?filters[user][id][$eq]=${user.id}&filters[folder][$eq]=trash&pagination[pageSize]=1`,
        ),
      ]);

      return {
        totalEmails: totalResponse.meta?.pagination?.total || 0,
        unreadCount: unreadResponse.meta?.pagination?.total || 0,
        starredCount: starredResponse.meta?.pagination?.total || 0,
        importantCount: importantResponse.meta?.pagination?.total || 0,
        draftCount: draftResponse.meta?.pagination?.total || 0,
        sentCount: sentResponse.meta?.pagination?.total || 0,
        trashCount: trashResponse.meta?.pagination?.total || 0,
        folderCounts: {
          inbox:
            (totalResponse.meta?.pagination?.total || 0) -
            (draftResponse.meta?.pagination?.total || 0) -
            (sentResponse.meta?.pagination?.total || 0) -
            (trashResponse.meta?.pagination?.total || 0),
          draft: draftResponse.meta?.pagination?.total || 0,
          sent: sentResponse.meta?.pagination?.total || 0,
          trash: trashResponse.meta?.pagination?.total || 0,
        },
      };
    } catch (error) {
      this.logError("getEmailSummary", error);
      return {
        totalEmails: 0,
        unreadCount: 0,
        starredCount: 0,
        importantCount: 0,
        draftCount: 0,
        sentCount: 0,
        trashCount: 0,
        folderCounts: {},
      };
    }
  }

  // ===== MÉTHODES DE NOTIFICATION =====

  /**
   * Obtenir les notifications système
   */
  async getSystemNotifications(): Promise<Email[]> {
    try {
      const user = this.getStoredUser();

      const response = await emailCrudService["fetchApi"]<ApiResponse<any>>(
        `/emails?filters[user][id][$eq]=${user.id}&filters[from][$eq]=system@eni.mg&filters[folder][$eq]=inbox&sort=sentAt:desc&pagination[pageSize]=10&populate=*`,
      );

      const emails = Array.isArray(response.data)
        ? response.data.map((item: any) => {
            return item.attributes
              ? { id: String(item.id), ...item.attributes }
              : { id: String(item.id), ...item };
          })
        : [];

      return emails as Email[];
    } catch (error) {
      this.logError("getSystemNotifications", error);
      return [];
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllNotificationsAsRead(): Promise<void> {
    try {
      const notifications = await this.getSystemNotifications();
      const unreadNotifications = notifications.filter((n) => !n.isRead);

      if (unreadNotifications.length > 0) {
        await this.markMultipleAsRead(
          unreadNotifications.map((n) => n.id),
          true,
        );
        console.log(
          `✅ ${unreadNotifications.length} notifications marquées comme lues`,
        );
      }
    } catch (error) {
      this.logError("markAllNotificationsAsRead", error);
    }
  }
}

// Export du service principal
export const emailService = new EmailService();

// Export de tous les sous-services pour un accès direct si nécessaire
export {
  emailCrudService,
  emailSendingService,
  draftService,
  userService,
  folderService,
  configService,
};
