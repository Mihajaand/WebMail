// services/userService.ts - Gestion des utilisateurs
import { ApiClient } from "./apiClient";
import type {
  UserResponse,
  UsersApiResponse,
  StrapiItem,
} from "../types/emailService";

export class UserService extends ApiClient {
  async getUserByEmail(email: string): Promise<UserResponse | null> {
    console.log(`🔍 RECHERCHE UTILISATEUR: ${email}`);

    const searchApproaches = [
      `/users?filters[email][$eq]=${email}`,
      `/users?filters[email]=${email}`,
      `/users?email=${email}`,
    ];

    for (const approach of searchApproaches) {
      try {
        console.log(`🧪 Tentative avec: ${approach}`);
        const response = await this.fetchApi<UsersApiResponse>(approach);
        console.log(`📡 Réponse:`, response);

        let users: UserResponse[] = [];

        // Gérer les différents formats de réponse
        if (Array.isArray(response)) {
          users = response.map((user: StrapiItem | UserResponse) => {
            if ("attributes" in user) {
              const strapiUser = user as StrapiItem;
              return {
                id: strapiUser.id,
                documentId: strapiUser.documentId,
                ...strapiUser.attributes,
              } as UserResponse;
            }
            return user as UserResponse;
          });
        } else if ("data" in response && Array.isArray(response.data)) {
          users = response.data.map((user: StrapiItem) => ({
            id: user.id,
            documentId: user.documentId,
            ...user.attributes,
          })) as UserResponse[];
        } else if ("users" in response && Array.isArray(response.users)) {
          users = response.users;
        }

        console.log(`👥 Utilisateurs trouvés:`, users);

        if (users.length > 0) {
          const user = users[0];
          console.log(`✅ Utilisateur sélectionné:`, user);
          return user;
        }
      } catch (error) {
        console.log(`❌ Approche ${approach} échouée:`, error);
        continue;
      }
    }

    console.log(`❌ Aucun utilisateur trouvé pour: ${email}`);
    return null;
  }
}

export const userService = new UserService();
