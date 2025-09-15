// types/user.ts
export interface User {
  // id: string;
  username: string;
  email: string;
  emailAddress: string; // ex: john@eni.mg
  signature?: string;
  avatar?: {
    url: string;
  };
}
