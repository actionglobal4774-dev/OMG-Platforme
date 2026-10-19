import React, { useState } from "react";
import FeaturePage from "../../components/common/FeaturePage";

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");

  const submitQuestion = (event) => {
    event.preventDefault();
    const question = message.trim();

    if (!question) {
      setResponse("Écrivez une question avant de l’envoyer.");
      return;
    }

    setResponse(
      "Votre demande a été préparée. L’assistant peut expliquer et guider, mais toute confirmation sensible reste sous votre contrôle."
    );
  };

  return (
    <FeaturePage
      eyebrow="OMG AI"
      title="How can I help you today?"
      description="Assistant transversal avec accès limité aux données sensibles."
      items={[
        "Rechercher dans les services OMG",
        "Comparer des options et expliquer les prochaines étapes",
        "Préparer une action sans jamais confirmer un paiement"
      ]}
      actions={[{ label: "Retour au Dashboard", to: "/dashboard", primary: true }]}
    >
      <form className="omg-feature-card omg-ai-prompt" onSubmit={submitQuestion}>
        <label htmlFor="omg-ai-message">Votre question</label>
        <textarea
          id="omg-ai-message"
          rows="4"
          placeholder="Écrivez votre demande…"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button type="submit">Envoyer la demande</button>
        {response && <p role="status">{response}</p>}
      </form>
    </FeaturePage>
  );
}
