import {
  ChevronLeft,
  Star,
  Archive,
  Trash2,
  MoreVertical,
  CornerUpLeft,
  Paperclip,
  Download,
  CornerUpRight,
  MailPlus,
  MailCheck,
  HelpCircle,
  Printer,
} from "lucide-react";
import type { Email } from "../types/email";
import { useEffect, useState } from "react";
import eni from "./../assets/logo/eni.jpg";

interface EmailViewerProps {
  email: Email;
  onClose: () => void;
  onToggleStar: (id: string | number, isStarred: boolean) => Promise<void>;
  onMoveToFolder: (id: string | number, folder: string) => Promise<void>;
  onMarkAsUnread?: (id: string | number) => Promise<void>;
  onReply?: (emailData: { to: string; subject: string; body: string }) => void;
  onForward?: (emailData: { subject: string; body: string; attachments?: any[] }) => void;
   onShowSupport?: () => void;
}

const EmailViewer = ({
  email,
  onClose,
  onToggleStar,
  onMoveToFolder,
  onReply,
  onForward,
  onShowSupport, 
  onMarkAsUnread,
}: EmailViewerProps) => {
  const [showMenu, setShowMenu] = useState(false);

// Ferme le menu quand on clique à l’extérieur
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".relative")) {
      setShowMenu(false);
    }
  };
  document.addEventListener("click", handleClickOutside);
  return () => document.removeEventListener("click", handleClickOutside);
}, []);

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

  const handleReply = () => {
    if (onReply) {
      onReply({
        to: email.from,
        subject: email.subject.startsWith("Re: ") ? email.subject : `Re: ${email.subject}`,
        body: `\n\n--- Message original ---\nDe: ${email.from}\nDate: ${formatDate(email.sentAt)}\nObjet: ${email.subject}\n\n${email.body}`,
      });
    }
  };

  const handleForward = () => {
    if (onForward) {
      onForward({
        subject: email.subject.startsWith("Fwd: ") ? email.subject : `Fwd: ${email.subject}`,
        body: `\n\n--- Message transféré ---\nDe: ${email.from}\nDate: ${formatDate(email.sentAt)}\nÀ: ${Array.isArray(email.to) ? email.to.join(", ") : email.to}\nObjet: ${email.subject}\n\n${email.body}`,
        attachments: email.attachments,
      });
    }
  };
const handlePrint = () => {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (printWindow) {
    let attachmentsHtml = "";
    if (email.attachments.length > 0) {
      attachmentsHtml = `
        <h3 style="margin-top:20px; color:#1D4ED8; border-bottom:1px solid #1D4ED8; padding-bottom:4px;">Pièces jointes :</h3>
        <ul style="padding-left:20px; color:#1F2937;">
          ${email.attachments
            .map(
              (att) =>
                `<li style="margin-bottom:4px;">${att.name} (${Math.round(
                  att.size / 1024
                )} KB)</li>`
            )
            .join("")}
        </ul>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Impression du message</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              padding: 40px;
              color: #1F2937;
              background-color: white;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header img {
              height: 80px;
              margin-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 26px;
              color: #1D4ED8;
            }
            .meta-container {
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 15px;
              background-color: #EFF6FF;
              margin-bottom: 20px;
            }
            .meta-container div {
              margin-bottom: 5px;
              font-size: 14px;
            }
            .body {
              background-color: #ffffff;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #E5E7EB;
              font-size: 15px;
              white-space: pre-wrap;
              margin-bottom: 20px;
            }
            h3 {
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${eni}" alt="ENI Logo" />
            <h1>${email.subject}</h1>
          </div>

          <div class="meta-container">
            <div><strong>De :</strong> ${email.from}</div>
            <div><strong>À :</strong> ${
              Array.isArray(email.to) ? email.to.join(", ") : email.to
            }</div>
            <div><strong>Date :</strong> ${formatDate(email.sentAt)}</div>
          </div>

          <div class="body">${email.body}</div>

          ${attachmentsHtml}

        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
};



  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="border-b border-gray-300 p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded p-2 hover:bg-gray-100 md:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-row space-between justify-between space-x-2  w-[300%]">
            <div className="flex items-center space-x-2 ">
            
              <button
                className="rounded cursor-pointer p-2 hover:bg-gray-100"
                onClick={() => onMoveToFolder(email.id, "trash")}
                title="Archiver l'email"
              >
                <Archive className="h-5 w-5" />
              </button>
              <button
                className="rounded cursor-pointer p-2 hover:bg-gray-100"
                onClick={() => onMoveToFolder(email.id, "trash")}
                title="Supprimer l'email"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
              className="rounded cursor-pointer p-2 hover:bg-gray-100"
              onClick={async () => {
                if (onMarkAsUnread) {
                  await onMarkAsUnread(email.id);
                  window.location.reload();
            
                }
              }}
              title="Marquer comme non lu"
            >
              <MailCheck className="h-5 w-5" />
            </button>
                <button
                className="rounded p-2 cursor-pointer hover:bg-gray-100"
                onClick={() => onShowSupport && onShowSupport()}
                title="Centre d'aide"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
             {/* Menu contextuel (MoreVertical) */}
<div className="relative">
  <button
    className="rounded p-2 cursor-pointer hover:bg-gray-100"
    onClick={() => setShowMenu((prev) => !prev)}
    title="Plus d'options"
  >
    <MoreVertical className="h-5 w-5" />
  </button>

  {showMenu && (
    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
      <button
        onClick={() => onMoveToFolder(email.id, "archive")}
        className="flex w-full justify-center cursor-pointer items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
      >
        Archiver
      </button>
      <button
        onClick={() => onMoveToFolder(email.id, "trash")}
        className="flex w-full justify-center cursor-pointer items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
      >
         Supprimer
      </button>
      <button
        onClick={async () => {
          if (onMarkAsUnread) {
            await onMarkAsUnread(email.id);
            window.location.reload();
          }
        }}
        className="flex w-full justify-center cursor-pointer items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
      >
         Marquer comme non lu
      </button>
      <button
        onClick={() => onShowSupport && onShowSupport()}
        className="flex w-full justify-center cursor-pointer items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
      >
        Aide et support
      </button>
    </div>
  )}
</div>

            </div>
            <div className=" w-[100%] flex flex-row justify-end">
              <button 
              onClick={handlePrint}
  title="Imprimer le contenu de l'email"
               >
                <Printer className="h-10 w-10 rounded p-2 cursor-pointer hover:bg-gray-100" />
              </button>
               <button
            
                className={`rounded p-2  ${
                  email.isStarred ? "text-yellow-500" : ""
                }`}
              >
                <Star
                  className={`h-7 w-7 ${email.isStarred ? "fill-current" : ""}`}
                />
              </button>
            </div>
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

        {/* Section pièces jointes */}
        {email.attachments.length > 0 && (
  <div className="mt-6 border-t border-gray-200 pt-4">
    <h4 className="mb-2 font-medium">Pièces jointes</h4>
    <div className="space-y-2">
      {email.attachments?.map((attachment, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded bg-gray-50 px-3 py-2"
        >
          <div className="flex items-center space-x-2">
            <Paperclip className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{attachment.name}</span>
           <span className="text-xs text-gray-500">
  {attachment.size && attachment.size > 0
    ? `(${Math.round(attachment.size)} KB)`
    : `(${Math.round(attachment.size)} KB)`}
</span>

          </div>
          <a
            href={attachment.url}
            download={attachment.name}
            className="rounded p-1 hover:bg-gray-200"
          >
            <Download className="h-4 w-4 text-gray-600" />
          </a>
        </div>
      ))}
    </div>
  </div>
)}

      </div>

      <div className="border-t gap-2 border-gray-300 p-[12.9px] flex justify-end items-end">
  <button 
    onClick={handleReply}
    className="flex gap-1 cursor-pointer items-center space-x-2 rounded-3xl bg-white px-4 py-2 font-semibold text-gray-600 border-2 border-gray-600 hover:bg-gray-100"
  >
    <CornerUpLeft className="h-4 w-4" />
    <span>Répondre</span>
  </button>
  <button 
    onClick={handleForward}
    className="flex gap-1 cursor-pointer items-center space-x-2 rounded-3xl bg-white px-4 py-2 font-semibold text-gray-600 border-2 border-gray-600 hover:bg-gray-100"
  >
    <span>Transférer</span>
    <CornerUpRight className="h-4 w-4" />
  </button>
</div>

    </div>
  );
};

export default EmailViewer;