import { useState, useEffect, useRef } from "react";
import { X, Send, Paperclip, RefreshCw, Save, XCircle, Download } from "lucide-react";

interface ComposeEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: File[];
}

interface DraftData extends ComposeEmailData {
  id?: string;
  forwardedAttachments?: any[]; // Pièces jointes d'un email transféré
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [forwardedAttachments, setForwardedAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les données du brouillon si disponibles
  useEffect(() => {
    if (draftData) {
      console.log("📝 Chargement du brouillon:", draftData);
      setTo(Array.isArray(draftData.to) ? draftData.to.join(", ") : "");
      setCc(Array.isArray(draftData.cc) ? draftData.cc.join(", ") : "");
      setBcc(Array.isArray(draftData.bcc) ? draftData.bcc.join(", ") : "");
      setSubject(draftData.subject || "");
      setBody(draftData.body || "");

      // Charger les pièces jointes transférées
      if (draftData.forwardedAttachments && draftData.forwardedAttachments.length > 0) {
        console.log("📎 Chargement des pièces jointes transférées:", draftData.forwardedAttachments);
        setForwardedAttachments(draftData.forwardedAttachments);
      }

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
      attachments,
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
    setAttachments([]);
    setForwardedAttachments([]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveForwardedAttachment = (index: number) => {
    setForwardedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const isFormValid = to.trim() && subject.trim();

  const totalAttachments = attachments.length + forwardedAttachments.length;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center border justify-center shadow-blue-600 shadow-2xl backdrop-blur-sm bg-black/10">
      <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-gray-300 p-4">
          <h2 className="text-lg font-semibold">
            {draftData ? "Modifier le brouillon" : "Nouveau message"}
          </h2>
          <button
  onClick={handleClose}
  disabled={sending || savingDraft}
  className={`flex cursor-pointer items-center justify-center rounded-full p-2 
    transition-all duration-300
    hover:bg-white hover:bg-opacity-10 hover:backdrop-blur-md
    hover:shadow-[0_6px_15px_rgba(0,0,0,0.25),inset_0_0_8px_rgba(255,255,255,0.15)]
    hover:-translate-y-0.5
    active:translate-y-0 active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed`}
>
  <X className="h-5 w-5 text-gray-700 hover:text-gray-900 transition-colors duration-300" />
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="destinataire@eni.mg"
                disabled={sending || savingDraft}
              />
            </div>

            {!showCcBcc && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowCcBcc(true)}
                  className={`text-sm cursor-pointer text-blue-600 transition-all duration-300 
  hover:text-blue-800 hover:drop-shadow-[0_0_6px_rgba(0,150,255,0.6)] 
  hover:-translate-y-0.5 hover:backdrop-blur-sm hover:bg-opacity-10`}

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
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={sending || savingDraft}
              />
            </div>
          </div>

          <div className="px-4 pb-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer items-center space-x-2 rounded-xl px-3 py-2 text-gray-600 
  transition-all duration-300 
  hover:bg-white hover:bg-opacity-10 hover:backdrop-blur-md 
  hover:shadow-[0_8px_20px_rgba(100,100,200,0.25),0_0_40px_rgba(200,200,200,0.15),inset_0_0_8px_rgba(255,255,255,0.1)]
  hover:-translate-y-0.5`}

                disabled={sending || savingDraft}
              >
                <Paperclip className="h-4 w-4" />
                <span>Ajouter une pièce jointe</span>
              </button>
              {totalAttachments > 0 && (
                <span className="text-sm text-gray-500">
                  ({totalAttachments} pièce{totalAttachments > 1 ? 's' : ''} jointe{totalAttachments > 1 ? 's' : ''})
                </span>
              )}
            </div>
            
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />

            {/* Liste des pièces jointes transférées */}
            {forwardedAttachments.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-500 font-medium">Pièces jointes transférées :</p>
                {forwardedAttachments.map((attachment, index) => (
                  <div key={`fwd-${index}`} className="flex items-center justify-between rounded bg-blue-50 px-3 py-2 border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Paperclip className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{attachment.name}</span>
                      <span className="text-xs text-blue-600">
                        ({Math.round(attachment.size / 1024)}KB)
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <a
                        href={attachment.url}
                        download={attachment.name}
                        className="rounded p-1 hover:bg-blue-200 text-blue-600"
                        title="Télécharger"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleRemoveForwardedAttachment(index)}
                        className="text-blue-600 hover:text-red-600"
                        type="button"
                        title="Retirer"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Liste des nouvelles pièces jointes */}
            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {forwardedAttachments.length > 0 && (
                  <p className="text-xs text-gray-500 font-medium">Nouvelles pièces jointes :</p>
                )}
                {attachments.map((file, index) => (
                  <div key={`new-${index}`} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <Paperclip className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({Math.round(file.size / 1024)}KB)
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-gray-500 hover:text-red-500"
                      type="button"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 px-4 pb-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="h-full min-h-[200px] w-full resize-none rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Rédigez votre message..."
              disabled={sending || savingDraft}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-300 p-4">
          <div className="flex items-center space-x-2">
            <button
              className="rounded p-2 hover:bg-gray-100"
              disabled={sending || savingDraft}
            >
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onClose()}
             className={`rounded-md px-4 py-2 text-red-600 border-2 border-red-200
  cursor-pointer transition-all duration-300
  hover:bg-white hover:bg-opacity-10 hover:backdrop-blur-lg
  hover:shadow-[0_12px_25px_rgba(255,0,0,0.3),0_0_50px_rgba(255,100,100,0.15),inset_0_0_8px_rgba(200,0,0,0.2)]
  hover:-translate-y-1`}

              disabled={sending || savingDraft}
            >
              <X className="h-4 w-4  mr-1 inline" />
              <span>Annuler</span>
            </button>
            {/* <button
              onClick={handleSaveDraft}
              disabled={
                savingDraft || (!to.trim() && !subject.trim() && !body.trim())
              }
              className="flex cursor-pointer items-center space-x-2 rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingDraft ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{savingDraft ? "Sauvegarde..." : "Brouillon"}</span>
            </button> */}
            <button
              onClick={handleSend}
              disabled={!isFormValid || sending}
              className={`flex cursor-pointer items-center space-x-2 rounded-md px-6 py-2 text-blue-600 border-2 border-blue-200
  transition-all duration-300
  hover:bg-white hover:bg-opacity-10 hover:backdrop-blur-lg
  hover:shadow-[0_10px_25px_rgba(0,0,255,0.35),0_0_50px_rgba(0,150,255,0.25),inset_0_0_12px_rgba(0,0,255,0.3)]
  hover:-translate-y-1
  disabled:cursor-not-allowed disabled:opacity-50`}
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