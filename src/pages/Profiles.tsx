import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Lock,
  ArrowBigLeft,
} from "lucide-react";

const Profiles = () => {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
      setFormData({
        username: userData.username || "",
        email: userData.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Validation des mots de passe
    if (
      formData.newPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      const jwt = localStorage.getItem("jwt");

      // Préparer les données à envoyer
      const updateData: any = {
        username: formData.username,
        email: formData.email,
      };

      // Ajouter le nouveau mot de passe seulement s'il est renseigné
      if (formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      const res = await fetch(`http://localhost:1337/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Erreur lors de la mise à jour");
        setLoading(false);
        return;
      }

      // Mise à jour du localStorage
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      setSuccess("Profil mis à jour avec succès !");
      setIsEditing(false);

      // Réinitialiser les champs de mot de passe
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      console.error(err);
      setError("Erreur réseau ou serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user.username || "",
      email: user.email || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };
  const handleBack = () => {
    window.history.back();
  };
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="font-medium text-gray-600">
            Chargement de votre profil...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header Card */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
                  <User className="h-10 w-10" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Mon Profil</h1>
                  <p className="mt-1 text-blue-100">
                    Gérez vos informations personnelles
                  </p>
                </div>
              </div>
              {!isEditing && (
                <button
  onClick={() => setIsEditing(true)}
  className="group cursor-pointer rounded-xl bg-white/20 p-3 backdrop-blur-sm transition-all duration-300
    hover:bg-white/30 hover:backdrop-blur-lg
    hover:shadow-[0_8px_20px_rgba(0,150,255,0.3),0_0_15px_rgba(0,100,255,0.2),inset_0_0_6px_rgba(0,50,255,0.1)]
    hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
  title="Modifier le profil"
>
  <Edit2 className="h-5 w-5 transition-transform group-hover:scale-110" />
</button>

              )}
            </div>
          </div>
        </div>

        {/* Alert messages */}
        {error && (
          <div className="mb-6 flex animate-pulse items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        )}

        {/* Profile Content */}
        <div className="overflow-hidden rounded-2xl bg-white p-8 shadow-xl">
          <div className="space-y-6">
            {/* Informations générales */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <User className="h-5 w-5 text-blue-600" />
                Informations générales
              </h2>

              <div className="space-y-4">
                {/* Username */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nom d'utilisateur
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 pl-11 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        !isEditing ? "cursor-not-allowed opacity-60" : ""
                      }`}
                      placeholder="johndoe"
                    />
                    <User className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 pl-11 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        !isEditing ? "cursor-not-allowed opacity-60" : ""
                      }`}
                      placeholder="john@exemple.com"
                    />
                    <Mail className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section Mot de passe */}
            {isEditing && (
              <div className="border-t border-gray-200 pt-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Lock className="h-5 w-5 text-blue-600" />
                  Changer le mot de passe
                </h2>
                <p className="mb-4 text-sm text-gray-500">
                  Laissez ces champs vides si vous ne souhaitez pas modifier
                  votre mot de passe
                </p>

                <div className="space-y-4">
                  {/* Mot de passe actuel */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 pl-11 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="••••••••"
                      />
                      <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {/* Nouveau mot de passe */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 pl-11 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="••••••••"
                      />
                      <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">
                      Minimum 6 caractères
                    </p>
                  </div>

                  {/* Confirmation nouveau mot de passe */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Confirmer le nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 pl-11 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="••••••••"
                      />
                      <Lock className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-3 border-t border-gray-200 pt-6">
                <button
  onClick={handleSubmit}
  disabled={loading}
  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg 
    bg-white px-4 py-3 font-semibold text-blue-600
    shadow-[0_8px_20px_rgba(0,100,255,0.3),0_0_15px_rgba(0,150,255,0.2),inset_0_0_6px_rgba(0,50,255,0.1)]
    transition-all duration-300
    hover:from-blue-700 hover:to-blue-800 hover:shadow-[0_12px_25px_rgba(0,120,255,0.4),0_0_25px_rgba(0,150,255,0.25),inset_0_0_8px_rgba(0,80,255,0.15)]
    hover:-translate-y-0.5 active:translate-y-0 active:scale-95
    focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
    disabled:cursor-not-allowed disabled:opacity-50"
>
  {loading ? (
    <>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
      <span>Enregistrement...</span>
    </>
  ) : (
    <>
      <Save className="h-5 w-5" />
      <span>Enregistrer les modifications</span>
    </>
  )}
</button>

<button
  onClick={handleCancel}
  disabled={loading}
  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg 
    border-2 border-red-200 px-4 py-3 font-semibold text-red-700
    shadow-[0_8px_20px_rgba(255,0,0,0.3),0_0_15px_rgba(255,80,80,0.2),inset_0_0_6px_rgba(200,0,0,0.15)]
    transition-all duration-300
    hover:bg-white hover:shadow-[0_12px_25px_rgba(255,0,0,0.4),0_0_25px_rgba(255,80,80,0.25),inset_0_0_8px_rgba(200,0,0,0.2)]
    hover:-translate-y-0.5 active:translate-y-0 active:scale-95
    focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none
    disabled:cursor-not-allowed disabled:opacity-50"
>
  <X className="h-5 w-5" />
  <span>Annuler</span>
</button>

              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center text-center">
          <button
  onClick={handleBack}
  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-red-200 px-4 py-3 font-semibold text-red-600
    shadow-[0_6px_15px_rgba(128,128,128,0.25),0_0_10px_rgba(200,0,0,0.1),inset_0_0_5px_rgba(0,0,0,0.05)]
    transition-all duration-300
    hover:bg-white hover:bg-opacity-20 hover:backdrop-blur-md
    hover:shadow-[0_10px_20px_rgba(255,0,0,0.3),0_0_25px_rgba(255,100,100,0.15),inset_0_0_6px_rgba(200,0,0,0.2)]
    hover:-translate-y-0.5 active:translate-y-0 active:scale-95
    focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none
    disabled:cursor-not-allowed disabled:opacity-50"
>
  <ArrowBigLeft className="h-5 w-5" />
  <span>Revenir en arrière</span>
</button>

        </div>
        {/* Info Card */}
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">💡 Astuce :</span> Gardez vos
            informations à jour pour une meilleure expérience. Utilisez un mot
            de passe fort pour sécuriser votre compte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profiles;
