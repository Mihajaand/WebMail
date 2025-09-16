import { useState } from "react";
import { X, Send, Paperclip, RefreshCw } from "lucide-react";

interface ComposeEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
}

interface ComposeModalProps {
  onClose: () => void;
  onSend: (emailData: ComposeEmailData) => Promise<boolean>;
}

const ComposeModal = ({ onClose, onSend }: ComposeModalProps) => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);

    const newEmailData: ComposeEmailData = {
      to: to.split(",").map((e) => e.trim()),
      subject,
      body,
    };

    const success = await onSend(newEmailData);

    if (success) {
      setTo("");
      setSubject("");
      setBody("");
    }

    setSending(false);
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Nouveau message</h2>
          <button onClick={onClose} disabled={sending}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 p-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600">À</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="destinataire@eni.mg"
                disabled={sending}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">Objet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={sending}
              />
            </div>
          </div>

          <div className="flex-1 px-4 pb-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="h-full min-h-[200px] w-full resize-none rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Rédigez votre message..."
              disabled={sending}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <div className="flex items-center space-x-2">
            <button
              className="rounded p-2 hover:bg-gray-100"
              disabled={sending}
            >
              <Paperclip className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-gray-600 hover:bg-gray-100"
              disabled={sending}
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={!to || !subject || sending}
              className="flex items-center space-x-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{sending ? "Envoi..." : "Envoyer"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;
