import { ArrowLeft, Search, HelpCircle, Mail, Lock, Trash2, AlertCircle, BookOpen, MessageCircle, Users, X } from "lucide-react";
import eni from "./../assets/logo/eni.jpg";
import { useState } from "react";

interface SupportProps {
  onBack: () => void;
  userEmail?: string;
}

interface PopupContent {
  title: string;
  content: string;
  steps?: string[];
}

const Support = ({ onBack, userEmail }: SupportProps) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<PopupContent | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const popularTopics = [
    {
      icon: Mail,
      title: "Problèmes de réception d'emails",
      description: "Vous ne recevez pas vos emails ou ils arrivent en retard",
      color: "blue",
      popupContent: {
        title: "Problèmes de réception d'emails",
        content: "Si vous rencontrez des problèmes de réception d'emails, voici quelques solutions courantes pour résoudre ce problème.",
        steps: [
          "Vérifiez votre connexion Internet et assurez-vous qu'elle est stable",
          "Consultez votre dossier Spam ou Courrier indésirable - les emails peuvent y être filtrés automatiquement",
          "Vérifiez que votre boîte de réception n'est pas pleine (limite de 5 Go)",
          "Assurez-vous que l'expéditeur n'est pas dans votre liste de blocage",
          "Essayez de vous déconnecter puis de vous reconnecter à votre compte",
          "Vérifiez les paramètres de transfert d'emails qui pourraient rediriger vos messages",
          "Si le problème persiste, contactez notre équipe de support technique"
        ]
      }
    },
    {
      icon: Lock,
      title: "Sécurité et confidentialité",
      description: "Protégez votre compte et vos données personnelles",
      color: "green",
      popupContent: {
        title: "Sécurité et confidentialité",
        content: "La sécurité de votre compte est primordiale. Voici nos recommandations pour protéger vos données.",
        steps: [
          "Utilisez un mot de passe fort avec au moins 12 caractères, incluant majuscules, minuscules, chiffres et symboles",
          "Changez régulièrement votre mot de passe (tous les 3-6 mois recommandés)",
          "Ne partagez jamais votre mot de passe avec qui que ce soit",
          "Activez l'authentification à deux facteurs pour une sécurité renforcée",
          "Méfiez-vous des emails de phishing - vérifiez toujours l'adresse de l'expéditeur",
          "Déconnectez-vous de votre compte sur les ordinateurs publics",
          "Vérifiez régulièrement l'activité récente de votre compte",
          "Ne cliquez pas sur des liens suspects dans les emails"
        ]
      }
    },
    {
      icon: Trash2,
      title: "Récupération d'emails supprimés",
      description: "Comment restaurer des emails de la corbeille",
      color: "red",
      popupContent: {
        title: "Récupération d'emails supprimés",
        content: "Les emails supprimés peuvent être récupérés s'ils sont encore dans la corbeille. Voici comment procéder.",
        steps: [
          "Accédez à votre dossier 'Corbeille' dans le menu de navigation",
          "Les emails restent dans la corbeille pendant 30 jours avant suppression définitive",
          "Recherchez l'email que vous souhaitez récupérer",
          "Sélectionnez l'email en cliquant sur la case à cocher",
          "Cliquez sur le bouton 'Restaurer' ou 'Déplacer vers' pour le remettre dans votre boîte de réception",
          "Vous pouvez également déplacer l'email vers un autre dossier de votre choix",
          "Note: Après 30 jours, les emails sont définitivement supprimés et ne peuvent plus être récupérés",
          "Pensez à vider régulièrement votre corbeille pour libérer de l'espace"
        ]
      }
    },
    {
      icon: AlertCircle,
      title: "Recuperer un compte ou supprimer un compte",
      description: "Veuillez contacter le support pour toute demande",
      color: "orange",
      popupContent: {
        title: "Récupération ou suppression de compte",
        content: "Pour des raisons de sécurité, ces opérations nécessitent une vérification par notre équipe de support.",
        steps: [
          "Contactez notre équipe de support à service.eni.reply@gmail.com",
          "Pour la récupération de compte: Fournissez votre adresse email et toute information permettant de vérifier votre identité",
          "Pour la suppression de compte: Cette action est irréversible et entraînera la perte définitive de tous vos emails et données",
          "Notre équipe vous répondra dans un délai de 24 à 48 heures",
          "Préparez une pièce d'identité valide pour la vérification",
          "En cas de récupération, vous recevrez des instructions par email ou SMS",
          "Pour la suppression, nous vous demanderons une confirmation écrite de votre demande"
        ]
      }
    },
  ];

  const quickLinks = [
    { icon: BookOpen, text: "Guide de démarrage", color: "purple", videoId: "az7IvqRhYq4" },
    { icon: MessageCircle, text: "Contacter le support", color: "blue", videoId: "10_y4x38jbU" },
    { icon: Users, text: "Forum de la communauté", color: "green", videoId: "gz_sgLFjALY" },
  ];

  const faqs = [
    {
      question: "Comment changer mon mot de passe ?",
      answer: "Allez dans le petit logo Paramètres > Éditer > Changer le mot de passe",
    },
    {
      question: "Pourquoi mes emails ne sont pas envoyés ?",
      answer: "Vérifiez le destinataire ou reconnectez votre compte",
    },
    {
      question: "Comment suivre des emails ?",
      answer: "Boite de réception > Sélectionner un email > bouton étoile",
    },
    {
      question: "Combien d'espace de stockage ai-je ?",
      answer: "Acutellement vous disposez de 5 Go d'espace de stockage gratuit.",
    },
  ];

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-300 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="flex cursor-pointer items-center space-x-2 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Revenir à la boîte de réception</span>
              </button>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <HelpCircle className="h-5 w-5" />
              <span>Page de centre d'aide</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans l'aide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-gray-300 py-3 pl-12 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          {/* Welcome Section */}
          <div className="mb-8 text-center flex flex-col items-center justify-center gap-2">
            <img src={eni} alt="ENI Logo" className="h-16 w-16 rounded-full" />
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Centre d'aide Webmail ENI
            </h1>
            <p className="text-gray-600">
              Trouvez des réponses à vos questions et obtenez de l'aide
              {userEmail && ` pour ${userEmail}`}
            </p>
          </div>

          {/* Popular Topics */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Sujets populaires
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {popularTopics.map((topic, index) => {
                const Icon = topic.icon;
                const colorClasses = {
                  blue: "bg-blue-100 text-blue-600",
                  green: "bg-green-100 text-green-600",
                  red: "bg-red-100 text-red-600",
                  orange: "bg-orange-100 text-orange-600",
                };
                return (
                  <div
                    key={index}
                    onClick={() => setSelectedTopic(topic.popupContent)}
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white p-5 transition-all hover:shadow-md"
                  >
                    <div className="mb-3 flex items-start space-x-3">
                      <div className={`rounded-lg p-2 ${colorClasses[topic.color as keyof typeof colorClasses]}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-1 font-semibold text-gray-900">
                          {topic.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {topic.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          {!searchQuery && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Liens rapides
              </h2>
              <div className="flex flex-wrap gap-3">
                {quickLinks.map((link, index) => {
                  const Icon = link.icon;
                  const colorClasses = {
                    purple: "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100",
                    blue: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
                    green: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
                  };
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedVideo(link.videoId)}
                      className={`flex cursor-pointer items-center space-x-2 rounded-full border px-4 py-2 transition-all ${colorClasses[link.color as keyof typeof colorClasses]}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{link.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* FAQs */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Questions fréquentes
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <details
                  key={index}
                  className="group rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between font-medium text-gray-900">
                    <span>{faq.question}</span>
                    <HelpCircle className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-gray-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="rounded-lg border bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-center text-white">
            <MessageCircle className="mx-auto mb-4 h-12 w-12" />
            <h2 className="mb-2 text-2xl font-bold">
              Vous n'avez pas trouvé de réponse ?
            </h2>
            <p className="mb-4 text-blue-100">
              Notre équipe de support est là pour vous aider
            </p>
          <a
  href={`https://mail.google.com/mail/?view=cm&fs=1&to=service.eni.reply@gmail.com&su=Assistance%20Webmail&body=Bonjour,%0A%0AJe%20souhaite%20obtenir%20de%20l'aide%20pour...`}
  target="_blank"
  rel="noopener noreferrer"
  className="rounded-full bg-white px-6 py-3 font-semibold text-blue-600 transition-all hover:bg-blue-50"
>
  Contacter le support
</a>

          </div>
        </div>
      </div>

      {/* Popup for Topics */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/10 p-4" onClick={() => setSelectedTopic(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-300 bg-white px-6 py-4">
              <h3 className="text-2xl font-bold text-gray-900">{selectedTopic.title}</h3>
              <button
                onClick={() => setSelectedTopic(null)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-6 text-lg text-gray-700">{selectedTopic.content}</p>
              {selectedTopic.steps && (
                <div>
                  <h4 className="mb-4 text-lg font-semibold text-gray-900">Étapes à suivre :</h4>
                  <ol className="space-y-3">
                    {selectedTopic.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                          {idx + 1}
                        </span>
                        <span className="pt-1 text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="rounded-lg cursor-pointer bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Compris
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup for Videos */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-white/10 bg-opacity-50 p-4" onClick={() => setSelectedVideo(null)}>
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-300 bg-white px-6 py-4">
              <h3 className="text-xl font-bold text-gray-900">Vidéo d'aide</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              <div className="aspect-video w-full">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedVideo}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;