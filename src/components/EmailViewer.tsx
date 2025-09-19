import {
  ChevronLeft,
  Star,
  Archive,
  Trash2,
  MoreVertical,
  CornerUpLeft,
} from "lucide-react";
import type { Email } from "../types/email";

interface EmailViewerProps {
  email: Email;
  onClose: () => void;
  onToggleStar: (id: string | number, isStarred: boolean) => Promise<void>;
  onMoveToFolder: (id: string | number, folder: string) => Promise<void>;
}

const EmailViewer = ({
  email,
  onClose,
  onToggleStar,
  onMoveToFolder,
}: EmailViewerProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("fr-FR", { weekday: "short" });
    } else {
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const getInitial = (str?: string) =>
    str && str.length > 0 ? str.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="border-b p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded p-2 hover:bg-gray-100 md:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={async () =>
                await onToggleStar(email.id, email.isStarred)
              }
              className={`rounded p-2 hover:bg-gray-100 ${
                email.isStarred ? "text-yellow-500" : ""
              }`}
            >
              <Star
                className={`h-5 w-5 ${email.isStarred ? "fill-current" : ""}`}
              />
            </button>
            <button
              className="rounded p-2 hover:bg-gray-100"
              onClick={() => onMoveToFolder(email.id, "archive")}
            >
              <Archive className="h-5 w-5" />
            </button>
            <button
              className="rounded p-2 hover:bg-gray-100"
              onClick={() => onMoveToFolder(email.id, "trash")}
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button className="rounded p-2 hover:bg-gray-100">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div>
          <h1 className="mb-3 text-xl font-semibold">{email.subject}</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 font-semibold text-white">
                {getInitial(email.from)}
              </div>
              <div>
                <div className="font-medium">{email.from}</div>
                <div className="text-sm text-gray-600">
                  à {Array.isArray(email.to) ? email.to.join(", ") : email.to}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {formatDate(email.sentAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="leading-relaxed whitespace-pre-wrap text-gray-900">
          {email.body}
        </div>
      </div>

      <div className="border-t p-4">
        <button className="flex cursor-pointer items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-800">
          <CornerUpLeft className="h-4 w-4" />
          <span>Répondre</span>
        </button>
      </div>
    </div>
  );
};

export default EmailViewer;
