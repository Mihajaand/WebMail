import { useState } from "react";
import { X } from "lucide-react";
import { emailService } from "../services/emailService";

interface EmailDiagnosticProps {
  showDiagnostic: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const EmailDiagnostic = ({
  showDiagnostic,
  onClose,
  onRefresh,
}: EmailDiagnosticProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const createTestEmail = async () => {
    try {
      await emailService.createTestEmail();
      setTimeout(() => onRefresh(), 1000);
    } catch (error) {
      console.error("Erreur création email de test:", error);
    }
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    clearResults();

    addResult("🚀 Début du diagnostic...");

    try {
      addResult("📋 Test 1: Récupération inbox");
      await emailService.getEmails("inbox", 1);
      addResult("✅ Test 1 terminé (voir console)");

      addResult("📧 Test 2: Création email de test");
      await emailService.createTestEmail();
      addResult("✅ Test 2 terminé");

      addResult("🔄 Test 3: Re-récupération");
      await emailService.getEmails("inbox", 1);
      addResult("✅ Test 3 terminé");
    } catch (error: any) {
      addResult(`❌ Erreur: ${error.message}`);
    } finally {
      setIsRunning(false);
      addResult("🏁 Diagnostic terminé");
    }
  };

  if (!showDiagnostic) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-h-96 w-96 rounded-lg border-2 border-blue-500 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b bg-blue-500 p-4 text-white">
        <h3 className="font-bold">🔧 Diagnostic Email</h3>
        <button onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        <div className="mb-4 space-y-2">
          <button
            onClick={runDiagnostic}
            disabled={isRunning}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? "🔄 En cours..." : "🚀 Diagnostic Complet"}
          </button>

          <button
            onClick={createTestEmail}
            disabled={isRunning}
            className="w-full rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isRunning ? "🔄 En cours..." : "📧 Créer Email Test"}
          </button>

          <button
            onClick={clearResults}
            className="w-full rounded bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            🗑️ Effacer Résultats
          </button>
        </div>

        <div className="max-h-48 overflow-y-auto rounded bg-gray-100 p-2 text-xs">
          {results.length === 0 ? (
            <p className="text-gray-500 italic">Aucun résultat</p>
          ) : (
            results.map((result, index) => (
              <div key={index} className="mb-1 font-mono">
                {result}
              </div>
            ))
          )}
        </div>

        <div className="mt-2 text-xs text-gray-500">
          💡 Regardez la console pour plus de détails
        </div>
      </div>
    </div>
  );
};

export default EmailDiagnostic;
