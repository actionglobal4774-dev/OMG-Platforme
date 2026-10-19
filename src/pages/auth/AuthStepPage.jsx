import React from "react";
import { useLocation } from "react-router-dom";
import FeaturePage from "../../components/common/FeaturePage";

const authSteps = {
  "/splash": ["OMG Platform", "One Account. One Ecosystem.", "One Global Future.", ["Loading secure experience", "OMG Platform · Global"]],
  "/onboarding": ["Welcome", "Everything you need in one ecosystem", "Découvrez les services essentiels avant de créer votre compte.", ["Global services", "Secure identity", "Personalized modules"]],
  "/welcome": ["OMG Platform", "Welcome", "Choisissez de vous connecter ou de créer votre compte.", ["One account", "11 connected modules", "OMG AI assistance"]],
  "/select-language": ["Setup", "Choose your language", "La préférence pourra être modifiée plus tard.", ["English", "Français", "Español · Português · Other"]],
  "/select-country": ["Setup", "Select your country", "Le pays adapte la devise, les services et les règles disponibles.", ["United States", "Haiti", "Brazil · Canada · France"]],
  "/select-user-type": ["Setup", "Choose your user type", "Le dashboard sera personnalisé selon votre rôle.", ["Local User", "International User", "Operator · Business · Student · Parent"]],
  "/verify-phone": ["Verification", "Verify your phone", "Un code de démonstration à six chiffres a été envoyé.", ["Phone · +1 ••• ••• 5090", "OTP · 509509", "Resend available in 30s"]],
  "/verify-email": ["Verification", "Verify your email", "Confirmez l'adresse liée à votre compte OMG.", ["fred•••@example.com", "Verification link sent", "Link valid for 15 minutes"]],
  "/kyc-verification": ["Identity", "KYC Verification", "Vérification simulée selon le niveau et le service demandé.", ["Identity document", "Address confirmation", "Review status · Pending"]],
  "/biometric-login": ["Security", "Biometric Login", "Activez une méthode rapide sur un appareil compatible.", ["Face ID", "Fingerprint", "6-digit PIN"]]
};

export default function AuthStepPage() {
  const location = useLocation();
  const content = authSteps[location.pathname] || authSteps["/welcome"];
  const isSplash = location.pathname === "/splash";

  return (
    <FeaturePage
      eyebrow={content[0]}
      title={content[1]}
      description={content[2]}
      items={content[3]}
      actions={isSplash
        ? [{ label: "Continuer", to: "/onboarding", primary: true }]
        : [
            { label: "Connexion", to: "/login" },
            { label: "Créer un compte", to: "/register", primary: true }
          ]}
    />
  );
}
