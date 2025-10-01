// types/api.ts
export interface ApiResponse<T> {
  data: {
    id: string | number;
    attributes: T;
  }[];
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}
export interface ComposeEmailData {
  from?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: File[];
  folder?: string;
  isRead?: boolean;
  isStarred?: boolean;
  isImportant?: boolean;
  threadId?: string;
  sentAt?: string;
}
