import React from "react";
import { useLocation } from "react-router-dom";
import FeaturePage from "../../components/common/FeaturePage";

const stateContent = {
  "/access-denied": ["403", "Access Denied", "Votre rôle actuel ne permet pas d'accéder à cet espace.", ["Permission required", "Your account remains secure"]],
  "/loading": ["System state", "Loading", "OMG Platform prépare vos informations.", ["Loading profile", "Loading module data"]],
  "/error": ["System state", "Something went wrong", "Une erreur simulée empêche l'affichage de cette page.", ["Reference · OMG-ERR-509", "Try again safely"]],
  "/success": ["System state", "Success", "Votre action frontend a été enregistrée.", ["Status · Completed", "Receipt · OMG-SUCCESS-509"]],
  "/empty": ["System state", "Nothing here yet", "Cette section est prête à recevoir vos premières données.", ["No items available", "Use the primary action to begin"]],
  "/maintenance": ["System state", "Maintenance", "Ce service est temporairement en maintenance.", ["Your data is safe", "Please return later"]],
  "/offline": ["PWA", "You are offline", "Certaines fonctions restent disponibles avec les données déjà chargées.", ["Offline mode active", "Changes will remain local"]]
};

export default function SystemStatePage() {
  const location = useLocation();
  const content = stateContent[location.pathname] || stateContent["/error"];

  return (
    <FeaturePage
      eyebrow={content[0]}
      title={content[1]}
      description={content[2]}
      items={content[3]}
      actions={[
        { label: "Accueil", to: "/" },
        { label: "Dashboard", to: "/dashboard", primary: true }
      ]}
    />
  );
}
