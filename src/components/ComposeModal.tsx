import { useState, useEffect } from "react";
import { X, Send, Paperclip, RefreshCw, Save } from "lucide-react";

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

interface ComposeModalProps {
  onClose: () => void;
  onSend: (emailData: ComposeEmailData) => Promise<boolean>;
  onSaveDraft: (draftData: DraftData) => Promise<boolean>;
  draftData?: DraftData | null; // Données du brouillon à charger
}

const ComposeModal = ({
  onClose,
  onSend,
  onSaveDraft,
  draftData,
}: ComposeModalProps) => {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);

  // Charger les données du brouillon si disponibles
  useEffect(() => {
    if (draftData) {
      console.log("📝 Chargement du brouillon:", draftData);
      setTo(Array.isArray(draftData.to) ? draftData.to.join(", ") : "");
      setCc(Array.isArray(draftData.cc) ? draftData.cc.join(", ") : "");
      setBcc(Array.isArray(draftData.bcc) ? draftData.bcc.join(", ") : "");
      setSubject(draftData.subject || "");
      setBody(draftData.body || "");

      // Afficher CC/BCC si ils contiennent des données
      if (
        (draftData.cc && draftData.cc.length > 0) ||
        (draftData.bcc && draftData.bcc.length > 0)
      ) {
        setShowCcBcc(true);
      }
    }
  }, [draftData]);

  const handleSend = async () => {
    setSending(true);

    const newEmailData: ComposeEmailData = {
      to: to
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e),
      cc: cc
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e),
      bcc: bcc
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e),
      subject,
      body,
    };

    const success = await onSend(newEmailData);

    if (success) {
      // Si l'envoi réussit et que c'était un brouillon, on peut le supprimer
      resetForm();
    }

    setSending(false);
  };

  const handleSaveDraft = async () => {
    // Ne sauvegarder que si il y a du contenu
    if (!to.trim() && !subject.trim() && !body.trim()) {
      return;
    }

    setSavingDraft(true);

    const draftToSave: DraftData = {
      id: draftData?.id, // Garder l'ID si c'est une modification d'un brouillon existant
      to: to
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e),
      cc: cc
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e),
      bcc: bcc
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e),
      subject,
      body,
    };

    console.log("💾 Sauvegarde du brouillon:", draftToSave);

    const success = await onSaveDraft(draftToSave);

    setSavingDraft(false);

    if (success) {
      console.log("✅ Brouillon sauvegardé avec succès");
      onClose();
    }
  };

  const handleClose = async () => {
    // Sauvegarder automatiquement comme brouillon si il y a du contenu
    const hasContent = to.trim() || subject.trim() || body.trim();

    if (hasContent) {
      console.log(
        "📝 Contenu détecté lors de la fermeture, sauvegarde automatique...",
      );
      await handleSaveDraft();
    } else {
      onClose();
    }
  };

  const resetForm = () => {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
  };

  const isFormValid = to.trim() && subject.trim();

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">
            {draftData ? "Modifier le brouillon" : "Nouveau message"}
          </h2>
          <button onClick={handleClose} disabled={sending || savingDraft}>
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
                disabled={sending || savingDraft}
              />
            </div>

            {!showCcBcc && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowCcBcc(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={sending || savingDraft}
                >
                  Cc/Bcc
                </button>
              </div>
            )}

            {showCcBcc && (
              <>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Cc</label>
                  <input
                    type="email"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="copie@eni.mg"
                    disabled={sending || savingDraft}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Bcc
                  </label>
                  <input
                    type="email"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="copie.cachee@eni.mg"
                    disabled={sending || savingDraft}
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm text-gray-600">Objet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={sending || savingDraft}
              />
            </div>
          </div>

          <div className="flex-1 px-4 pb-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="h-full min-h-[200px] w-full resize-none rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Rédigez votre message..."
              disabled={sending || savingDraft}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <div className="flex items-center space-x-2">
            <button
              className="rounded p-2 hover:bg-gray-100"
              disabled={sending || savingDraft}
            >
              <Paperclip className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onClose()}
              className="rounded-md px-4 py-2 text-gray-600 hover:bg-gray-100"
              disabled={sending || savingDraft}
            >
              Annuler
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={
                savingDraft || (!to.trim() && !subject.trim() && !body.trim())
              }
              className="flex items-center space-x-2 rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingDraft ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{savingDraft ? "Sauvegarde..." : "Brouillon"}</span>
            </button>
            <button
              onClick={handleSend}
              disabled={!isFormValid || sending}
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
