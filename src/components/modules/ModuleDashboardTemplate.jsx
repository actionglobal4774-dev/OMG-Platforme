import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../layout/DashboardLayout";
import FredChat from "../fred509/FredChat";
import CountryLanguageFields from "../common/CountryLanguageFields";
import AddressAutocomplete from "../common/AddressAutocomplete";
import { useAuth } from "../../context/AuthContext";
import { createSecureModuleAccount } from "../../services/backendService";
import { getActionsForUserType, getModuleLogic } from "../../data/moduleLogic";
import { createMonCashPayment, createPayPalOrder, createStripeCheckoutSession, submitModuleAction } from "../../services/backendService";
import { notifyModuleUser } from "../../services/notificationService";
import { getModuleActivities, saveModuleActivity } from "../../services/activityService";
import { getPayflowContactAccountKey, getPayflowContacts, savePayflowContact } from "../../services/payflowContactService";

function normalizeAction(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createLocalReference(moduleId) {
  return `OMG-${String(moduleId || "MODULE").toUpperCase()}-${Date.now()}`;
}

function getActionSuccessMessage(moduleId, actionName, reference) {
  const action = normalizeAction(actionName);
  const ref = reference ? ` Reference: ${reference}.` : "";

  if (moduleId === "mailport") {
    if (action.includes("acheter")) return `Achat d'adresse prepare. Le QR et les details seront disponibles dans l'historique apres confirmation du paiement.${ref}`;
    if (action.includes("chercher")) return `Recherche d'adresse preparee. Les resultats peuvent etre filtres par pays, ville, rue, quartier, section communale ou code postal.${ref}`;
    if (action.includes("publier") || action.includes("adresse") || action.includes("photo")) return `Adresse referentielle enregistree. Elle peut maintenant apparaitre dans la recherche par pays, ville, rue ou code postal.${ref}`;
    if (action.includes("revenu") || action.includes("gain")) return `Revenus Mailport prepares. Les paiements seront relies a Payflow apres validation de l'etape.${ref}`;
    if (action.includes("livraison") || action.includes("colis")) return `Etape colis enregistree. Les personnes concernees recevront la notification de suivi.${ref}`;
  }

  if (moduleId === "property") {
    if (action.includes("publier")) return `Bien prepare pour publication. Les photos, l'adresse et les informations de paiement sont gardees pour la fiche du bien.${ref}`;
    if (action.includes("rechercher")) return `Recherche preparee. Les resultats seront filtres par pays, ville, rue, quartier ou code postal.${ref}`;
    if (action.includes("payer")) return `Paiement proprietaire prepare. Le recu sera garde dans l'historique apres validation.${ref}`;
  }

  if (moduleId === "store") {
    if (action.includes("boutique")) return `Boutique preparee. Vous pouvez maintenant ajouter produits, photos, stock et prix.${ref}`;
    if (action.includes("panier") || action.includes("produit") || action.includes("commande")) return `Action Store enregistree. Le panier, le paiement et la livraison Mailport sont prets pour la prochaine etape.${ref}`;
  }

  if (moduleId === "restaurant") {
    if (action.includes("reservation")) return `Reservation preparee. La confirmation et le recu seront gardes dans l'historique.${ref}`;
    if (action.includes("commande")) return `Commande enregistree. La cuisine, le service ou la livraison pourront suivre l'etape.${ref}`;
  }

  if (moduleId === "school") {
    if (action.includes("payer") || action.includes("livre")) return `Paiement scolaire prepare. Le recu et le rapport correspondant seront gardes dans l'historique.${ref}`;
    return `Action School enregistree. Les informations restent rattachees au profil du parent, beneficiaire ou etablissement.${ref}`;
  }

  if (moduleId === "city") {
    if (action.includes("marchand")) return `Dossier marchand prepare. Il pourra etre suivi par zone avec statut paye ou retard.${ref}`;
    if (action.includes("tax")) return `Taxe preparee. Le statut du marchand sera mis a jour apres confirmation du paiement.${ref}`;
  }

  if (moduleId === "health") {
    return `Action Health Care preparee. Le dossier reste separe selon le role autorise et les regles de confidentialite.${ref}`;
  }

  if (moduleId === "tax") {
    return `Dossier USA Tax Pro prepare. Le systeme peut continuer avec scan, questions IA, signature et paiement du service.${ref}`;
  }

  if (moduleId === "university") {
    return `Etape University Integration preparee. Le postulant continue selon pays, facultes, paiement et regle de 75%.${ref}`;
  }

  if (moduleId === "payflow") {
    return `Action Payflow preparee. La confirmation finale reste protegee par PIN, QR ou validation utilisateur.${ref}`;
  }

  if (moduleId === "administration") {
    return `Action administrative preparee. Elle doit rester sous audit et validation autorisee.${ref}`;
  }

  return `Action preparee avec succes.${ref}`;
}

function getActionValidationMessage(moduleId, actionName, draft, t) {
  const action = normalizeAction(actionName);

  if (moduleId !== "payflow") {
    return null;
  }

  if (!draft.confirmed) {
    return t("payflow_final_confirmation_required", {
      defaultValue: "Veuillez confirmer cette action Payflow avant de continuer."
    });
  }

  const requiresAmount = ["envoyer", "demander", "depot", "retrait", "recevoir", "paiement"].some((keyword) => action.includes(keyword));
  if (requiresAmount) {
    const amount = Number(String(draft.amount || "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      return t("payflow_amount_required", {
        defaultValue: "Veuillez entrer un montant valide pour terminer cette action Payflow."
      });
    }
  }

  const requiresContact = ["envoyer", "demander"].some((keyword) => action.includes(keyword));
  if (requiresContact && !draft.contactId && !draft.title?.trim()) {
    return t("payflow_contact_required", {
      defaultValue: "Veuillez choisir ou ajouter un contact Payflow avant de continuer."
    });
  }

  return null;
}

function isPayflowContactAction(moduleId, actionName) {
  const action = normalizeAction(actionName);
  return moduleId === "payflow" && ["envoyer", "demander"].some((keyword) => action.includes(keyword));
}

const PAYMENT_METHOD_TYPES = [
  "Payflow",
  "Carte de credit",
  "Mastercard",
  "Carte de debit",
  "Compte bancaire",
  "Mobile Money",
  "Operateur local",
  "PayPal",
  "MonCash",
  "NatCash"
];

function createPaymentMethodId() {
  return `PM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createBlankPaymentMethod() {
  return {
    id: "",
    type: "Payflow",
    label: "",
    provider: "",
    holder: "",
    last4: "",
    country: "",
    currency: "USD"
  };
}

function normalizePaymentMethods(methods) {
  if (!Array.isArray(methods)) return [];
  return methods
    .filter((method) => method && typeof method === "object")
    .map((method) => ({
      id: method.id || createPaymentMethodId(),
      type: method.type || "Payflow",
      label: method.label || method.provider || method.type || "Moyen de paiement",
      provider: method.provider || "",
      holder: method.holder || "",
      last4: String(method.last4 || "").replace(/\D/g, "").slice(-4),
      country: method.country || "",
      currency: method.currency || "USD"
    }));
}

function getDefaultModuleProfile(module) {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "+1 ",
    region: "Massachusetts",
    country: "United States",
    language: "en",
    userType: module.userTypes[0],
    modulePassword: "",
    paymentMethods: [],
    preferredPaymentMethodId: ""
  };
}

function hydrateModuleProfile(savedProfile, module) {
  const paymentMethods = normalizePaymentMethods(savedProfile?.paymentMethods);
  const preferredPaymentMethodId = paymentMethods.some((method) => method.id === savedProfile?.preferredPaymentMethodId)
    ? savedProfile.preferredPaymentMethodId
    : paymentMethods[0]?.id || "";

  return {
    ...getDefaultModuleProfile(module),
    ...(savedProfile || {}),
    paymentMethods,
    preferredPaymentMethodId
  };
}

function validateModuleProfile(profile, t) {
  if (!profile.firstName?.trim()) {
    return t("module_first_name_required", { defaultValue: "Veuillez entrer votre prenom." });
  }
  if (!profile.lastName?.trim()) {
    return t("module_last_name_required", { defaultValue: "Veuillez entrer votre nom." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email?.trim() || "")) {
    return t("module_email_invalid", { defaultValue: "Veuillez entrer une adresse email valide." });
  }
  if ((profile.phone || "").replace(/\D/g, "").length < 7) {
    return t("module_phone_invalid", { defaultValue: "Veuillez entrer un numero de telephone valide." });
  }
  if ((profile.modulePassword?.trim() || "").length < 6) {
    return t("module_password_required", { defaultValue: "Le mot de passe du module doit contenir au moins 6 caracteres." });
  }
  return "";
}

function ModuleDashboardTemplate({ module, children, compactMenu = false, menuActions = null, assistantContext = null, renderCompactAction = null, suppressCompactActionFooter = false, publicEntryContent = null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, saveModuleProfile, getModuleProfile, hasModuleProfile } = useAuth();
  const existingProfile = getModuleProfile(module.id);
  const [step, setStep] = useState(existingProfile ? "accountLogin" : "entry");
  const [activeTab, setActiveTab] = useState("home");
  const [activeAction, setActiveAction] = useState(null);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [actionDraft, setActionDraft] = useState({
    title: "",
    location: "",
    amount: "",
    details: "",
    fileName: "",
    paymentMethodId: "",
    confirmed: false
  });
  const [actionResult, setActionResult] = useState(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [activities, setActivities] = useState(() => getModuleActivities(module.id));
  const [profile, setProfile] = useState(() => hydrateModuleProfile(existingProfile, module));
  const [payflowContacts, setPayflowContacts] = useState(() => getPayflowContacts(getPayflowContactAccountKey(existingProfile || {})));
  const [payflowContactDraft, setPayflowContactDraft] = useState({
    name: "",
    phone: "",
    email: "",
    payflowId: "",
    other: ""
  });
  const [paymentMethodDraft, setPaymentMethodDraft] = useState(createBlankPaymentMethod);
  const [profileNotice, setProfileNotice] = useState("");

  useEffect(() => {
    const currentProfile = getModuleProfile(module.id);
    setProfile(hydrateModuleProfile(currentProfile, module));
    setStep(currentProfile ? "accountLogin" : "entry");
    setActiveTab("home");
    setActiveAction(null);
    setAccountPassword("");
    setAccountError("");
    setActionResult(null);
    setProfileNotice("");
  }, [user?.uid, module.id]);

  const Icon = module.icon;
  const assistantId = module.id;
  const moduleText = (field) => t(`${module.id}_${field}`, { defaultValue: module[field] || "" });
  const userTypeLabel = (type, index) => t(`${module.id}_user_type_${index + 1}`, { defaultValue: type });
  const actionLabel = (action, index) => (
    module.actions?.[index] === action
      ? t(`${module.id}_action_${index + 1}`, { defaultValue: action })
      : action
  );
  const logic = getModuleLogic(module.id);
  const visibleActions = getActionsForUserType(module.id, profile.userType, menuActions || module.actions);
  const selectedAction = activeAction !== null ? visibleActions[activeAction] : null;
  const selectedPayflowContact = payflowContacts.find((contact) => contact.id === actionDraft.contactId);
  const paymentMethods = normalizePaymentMethods(profile.paymentMethods);
  const activePaymentMethodId = actionDraft.paymentMethodId || profile.preferredPaymentMethodId || paymentMethods[0]?.id || "";
  const selectedPaymentMethod = paymentMethods.find((method) => method.id === activePaymentMethodId) || null;
  const showPayflowContacts = isPayflowContactAction(module.id, selectedAction);
  const hasSavedModuleProfile = hasModuleProfile(module.id);
  const tabs = useMemo(() => [
    { id: "home", label: t("home") },
    { id: "profile", label: t("profile") },
    { id: "history", label: t("history") },
    { id: "services", label: t("about", { defaultValue: "A propos" }) }
  ], [t]);

  const createProfile = async (event) => {
    event.preventDefault();
    const validationError = validateModuleProfile(profile, t);
    if (validationError) {
      setAccountError(validationError);
      return;
    }
    setAccountError("");
    const profileToSave = {
      ...profile,
      userType: profile.userType || module.userTypes?.[0] || "",
      paymentMethods,
      preferredPaymentMethodId: profile.preferredPaymentMethodId || paymentMethods[0]?.id || ""
    };
    if (module.id === "mailport") {
      const normalizedType = String(profileToSave.userType || "").toLowerCase();
      const role = normalizedType.includes("propriet")
        ? "reference_address_owner"
        : normalizedType.includes("livreur")
          ? "carrier"
          : "reference_address_buyer";
      try {
        const backendAccount = await createSecureModuleAccount({
          moduleId: "mailport",
          role,
          country: profileToSave.country,
          language: profileToSave.language || "Francais",
          displayName: `${profileToSave.firstName || ""} ${profileToSave.lastName || ""}`.trim(),
          email: profileToSave.email,
          phone: profileToSave.phone,
          passwordConfigured: true
        });
        profileToSave.backendStatus = backendAccount.status;
        profileToSave.backendAccountId = backendAccount.accountId;
      } catch (backendError) {
        setAccountError(backendError?.message || "Creation du profil Mailport impossible.");
        return;
      }
    }
    setProfile(profileToSave);
    saveModuleProfile(module.id, profileToSave);
    setPayflowContacts(getPayflowContacts(getPayflowContactAccountKey(profileToSave)));
    setActiveAction(null);
    setStep("terms");
  };

  const openAccount = () => {
    setAccountPassword("");
    setAccountError("");
    setActiveAction(null);
    setStep("accountLogin");
  };

  const accessExistingAccount = (event) => {
    event.preventDefault();
    const savedProfile = getModuleProfile(module.id);
    if (!savedProfile) {
      setAccountError(t("module_account_not_found", { defaultValue: "Aucun profil n'est encore cree pour ce module." }));
      return;
    }
    if (savedProfile.modulePassword && savedProfile.modulePassword !== accountPassword) {
      setAccountError(t("module_password_invalid", { defaultValue: "Mot de passe incorrect pour ce module." }));
      return;
    }
    const hydratedProfile = hydrateModuleProfile(savedProfile, module);
    setProfile(hydratedProfile);
    setPayflowContacts(getPayflowContacts(getPayflowContactAccountKey(hydratedProfile)));
    setAccountError("");
    setActiveAction(null);
    setStep("menu");
  };

  const saveEditableProfile = (event) => {
    event.preventDefault();
    const validationError = validateModuleProfile(profile, t);
    if (validationError) {
      setProfileNotice(validationError);
      return;
    }
    const profileToSave = hydrateModuleProfile(profile, module);
    setProfile(profileToSave);
    saveModuleProfile(module.id, profileToSave);
    setProfileNotice(t("profile_saved", { defaultValue: "Profil enregistre." }));
    setActiveTab("home");
  };

  const updateProfile = (field, value) => {
    if (field === "userType") {
      setActiveAction(null);
    }
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const openModuleAction = (index) => {
    setActiveAction(index);
    setActionResult(null);
    setActionDraft({
      title: "",
      location: "",
      amount: "",
      details: "",
      fileName: "",
      paymentMethodId: profile.preferredPaymentMethodId || normalizePaymentMethods(profile.paymentMethods)[0]?.id || "",
      confirmed: false
    });
  };

  const closeModuleAction = () => {
    setActiveAction(null);
    setActionResult(null);
  };

  const updateActionDraft = (field, value) => {
    setActionDraft((current) => ({ ...current, [field]: value }));
  };

  const choosePayflowContact = (contactId) => {
    if (!contactId) {
      setActionDraft((current) => ({
        ...current,
        contactId: "",
        contactValue: ""
      }));
      return;
    }
    const contact = payflowContacts.find((item) => item.id === contactId);
    setActionDraft((current) => ({
      ...current,
      contactId,
      title: contact?.name || current.title,
      contactValue: contact?.payflowId || contact?.phone || contact?.email || contact?.other || ""
    }));
  };

  const addPayflowContact = () => {
    const hasContactValue = payflowContactDraft.phone || payflowContactDraft.email || payflowContactDraft.payflowId || payflowContactDraft.other;
    if (!payflowContactDraft.name.trim() || !hasContactValue) {
      setActionResult({
        reference: "",
        status: "needs-confirmation",
        functionName: "local-validation",
        message: t("payflow_contact_add_required", {
          defaultValue: "Entrez le nom du contact et au moins un moyen: telephone, email, Payflow ID ou autre identifiant."
        })
      });
      return;
    }
    const accountKey = getPayflowContactAccountKey(profile);
    const result = savePayflowContact(accountKey, payflowContactDraft);
    setPayflowContacts(result.contacts);
    setPayflowContactDraft({ name: "", phone: "", email: "", payflowId: "", other: "" });
    setActionDraft((current) => ({
      ...current,
      contactId: result.contact.id,
      title: result.contact.name,
      contactValue: result.contact.payflowId || result.contact.phone || result.contact.email || result.contact.other || ""
    }));
    setActionResult({
      reference: "",
      status: "prepared",
      functionName: "local-contact",
      message: t("payflow_contact_saved", {
        defaultValue: "Contact Payflow memorise. Vous pourrez le reutiliser sans remplir ses informations."
      })
    });
  };

  const savePaymentMethod = () => {
    if (!paymentMethodDraft.label.trim()) {
      setProfileNotice(t("payment_method_label_required", {
        defaultValue: "Donnez un nom simple au moyen de paiement avant de le memoriser."
      }));
      return;
    }

    const id = paymentMethodDraft.id || createPaymentMethodId();
    const cleanedMethod = {
      ...paymentMethodDraft,
      id,
      label: paymentMethodDraft.label.trim(),
      provider: paymentMethodDraft.provider.trim(),
      holder: paymentMethodDraft.holder.trim(),
      last4: String(paymentMethodDraft.last4 || "").replace(/\D/g, "").slice(-4),
      country: paymentMethodDraft.country || profile.country,
      currency: paymentMethodDraft.currency || "USD"
    };
    const currentMethods = normalizePaymentMethods(profile.paymentMethods);
    const exists = currentMethods.some((method) => method.id === id);
    const nextMethods = exists
      ? currentMethods.map((method) => method.id === id ? cleanedMethod : method)
      : [...currentMethods, cleanedMethod];
    const nextProfile = {
      ...profile,
      paymentMethods: nextMethods,
      preferredPaymentMethodId: profile.preferredPaymentMethodId || id
    };

    setProfile(nextProfile);
    saveModuleProfile(module.id, nextProfile);
    setPaymentMethodDraft(createBlankPaymentMethod());
    setProfileNotice(t("payment_method_saved", {
      defaultValue: "Moyen de paiement memorise dans le profil. Vous pourrez le modifier ou en ajouter un autre."
    }));
  };

  const editPaymentMethod = (method) => {
    setPaymentMethodDraft(method);
    setProfileNotice(t("payment_method_editing", {
      defaultValue: "Vous pouvez modifier ce moyen de paiement puis l'enregistrer."
    }));
  };

  const removePaymentMethod = (methodId) => {
    const nextMethods = normalizePaymentMethods(profile.paymentMethods).filter((method) => method.id !== methodId);
    const nextProfile = {
      ...profile,
      paymentMethods: nextMethods,
      preferredPaymentMethodId: profile.preferredPaymentMethodId === methodId ? nextMethods[0]?.id || "" : profile.preferredPaymentMethodId
    };
    setProfile(nextProfile);
    saveModuleProfile(module.id, nextProfile);
    setProfileNotice(t("payment_method_removed", { defaultValue: "Moyen de paiement retire du profil." }));
  };

  const setPreferredPaymentMethod = (methodId) => {
    const nextProfile = { ...profile, preferredPaymentMethodId: methodId };
    setProfile(nextProfile);
    saveModuleProfile(module.id, nextProfile);
    setActionDraft((current) => ({ ...current, paymentMethodId: methodId }));
    setProfileNotice(t("payment_method_preferred", { defaultValue: "Moyen de paiement principal mis a jour." }));
  };

  const confirmAction = async () => {
    const actionName = selectedAction || module.name;
    if (isSubmittingAction) return;
    const validationMessage = getActionValidationMessage(module.id, actionName, actionDraft, t);
    if (validationMessage) {
      setActionResult({
        reference: "",
        status: "needs-confirmation",
        functionName: "local-validation",
        message: validationMessage
      });
      return;
    }
    const actionPayload = {
      ...actionDraft,
      contact: selectedPayflowContact || null,
      paymentMethod: selectedPaymentMethod,
      confirmed: true
    };
    setIsSubmittingAction(true);
    setActionResult(null);
    try {
      if (selectedPaymentMethod?.type === "NatCash") {
        throw new Error("NatCash attend encore l'activation du compte marchand et les identifiants API officiels de Natcom. Aucun paiement n'a ete lance.");
      }
      if (selectedPaymentMethod?.type === "MonCash") {
        const amount = Number(String(actionDraft.amount || "").replace(",", "."));
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error(t("moncash_amount_required", { defaultValue: "Veuillez entrer un montant valide en gourdes pour MonCash." }));
        }
        if ((selectedPaymentMethod.currency || "").toUpperCase() !== "HTG") {
          throw new Error("MonCash exige actuellement un montant en gourdes haitiennes (HTG). Modifiez la devise du moyen de paiement.");
        }
        const payment = await createMonCashPayment({
          amount,
          moduleId: module.id,
          action: actionName
        });
        if (!payment.redirectUrl) throw new Error("MonCash n'a pas fourni de lien de paiement.");
        sessionStorage.setItem("omgMonCashPending", JSON.stringify({
          orderId: payment.orderId,
          moduleId: module.id,
          action: actionName
        }));
        window.location.assign(payment.redirectUrl);
        return;
      }
      if (selectedPaymentMethod?.type === "PayPal") {
        const amount = Number(String(actionDraft.amount || "").replace(",", "."));
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error(t("paypal_amount_required", { defaultValue: "Veuillez entrer un montant valide pour PayPal." }));
        }
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const order = await createPayPalOrder({
          amount,
          currency: selectedPaymentMethod.currency || "USD",
          moduleId: module.id,
          action: actionName,
          returnUrl: `${baseUrl}#/paypal-return`,
          cancelUrl: `${baseUrl}#/paypal-cancel`
        });
        const approvalUrl = order.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
        if (!approvalUrl) throw new Error("PayPal n'a pas fourni de lien d'autorisation.");
        sessionStorage.setItem("omgPayPalPending", JSON.stringify({
          orderId: order.orderId,
          moduleId: module.id,
          action: actionName
        }));
        window.location.assign(approvalUrl);
        return;
      }
      if (["Carte de credit", "Mastercard", "Carte de debit"].includes(selectedPaymentMethod?.type)) {
        const amount = Number(String(actionDraft.amount || "").replace(",", "."));
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Veuillez entrer un montant valide pour le paiement par carte.");
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const session = await createStripeCheckoutSession({
          amount,
          currency: selectedPaymentMethod.currency || "USD",
          moduleId: module.id,
          action: actionName,
          successUrl: `${baseUrl}#/stripe-return?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${baseUrl}#/stripe-cancel`
        });
        if (!session.redirectUrl) throw new Error("Stripe n'a pas fourni de page de paiement securisee.");
        window.location.assign(session.redirectUrl);
        return;
      }
      const result = await submitModuleAction({
        moduleId: module.id,
        moduleName: module.name,
        action: actionName,
        profile,
        payload: actionPayload
      });
      const activity = saveModuleActivity(module.id, {
        action: actionName,
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          country: profile.country,
          language: profile.language,
          userType: profile.userType
        },
        reference: result.data?.reference || createLocalReference(module.id),
        functionName: result.functionName,
        status: result.live ? "confirmed" : "prepared"
      });
      setActivities(getModuleActivities(module.id));
      setActionResult({
        reference: activity.reference,
        status: activity.status,
        functionName: result.functionName,
        message: getActionSuccessMessage(module.id, actionName, activity.reference)
      });
      notifyModuleUser(module.id, `${module.name} - ${actionName}`, t("module_action_notification"), {
        action: actionName,
        reference: activity.reference
      }).catch(() => null);
    } catch (error) {
      const reference = createLocalReference(module.id);
      const activity = saveModuleActivity(module.id, {
        action: actionName,
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          country: profile.country,
          language: profile.language,
          userType: profile.userType
        },
        reference,
        functionName: "local-fallback",
        status: "prepared"
      });
      setActivities(getModuleActivities(module.id));
      setActionResult({
        reference: activity.reference,
        status: activity.status,
        functionName: "local-fallback",
        message: getActionSuccessMessage(module.id, actionName, activity.reference)
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const customCompactAction = compactMenu && activeAction !== null && renderCompactAction
    ? renderCompactAction({
        selectedAction,
        activeAction,
        closeModuleAction,
        profile,
        actionDraft,
        updateActionDraft,
        confirmAction,
        actionResult,
        isSubmittingAction,
        paymentMethods,
        activePaymentMethodId,
        selectedPaymentMethod,
        setActiveTab,
        t
      })
    : null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl pb-24">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigate(-1)} className="rounded border border-omgGold/50 px-4 py-2 text-sm text-omgGold omg-focus">
            {t("back")}
          </button>
          <Link to="/" className="rounded border border-omgGreen/60 px-4 py-2 text-sm text-omgGreen omg-focus">
            {t("return_modules")}
          </Link>
        </div>

        <section className="omg-card omg-module-hero rounded-2xl p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="omg-icon-orb grid h-16 w-16 place-items-center rounded-xl border border-omgGold text-3xl text-omgGreen">
                <Icon />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-omgGold">{module.name}</h1>
              </div>
            </div>
          </div>
        </section>

        {step === "entry" && !hasSavedModuleProfile && (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <button type="button" onClick={() => setStep("profile")} className="omg-card omg-action-button rounded-xl p-6 text-left hover:border-omgGreen omg-focus">
                <h2 className="text-xl font-bold text-white">{t("create_profile")}</h2>
              </button>
              <button type="button" onClick={openAccount} className="omg-card omg-action-button rounded-xl p-6 text-left hover:border-omgGreen omg-focus">
                <h2 className="text-xl font-bold text-white">{t("access_account")}</h2>
              </button>
            </section>
            {publicEntryContent && (
              typeof publicEntryContent === "function"
                ? publicEntryContent({ onCreateProfile: () => setStep("profile"), onAccessAccount: openAccount })
                : publicEntryContent
            )}
          </>
        )}

        {step === "accountLogin" && (
          <form onSubmit={accessExistingAccount} className="omg-form-panel mt-6 grid gap-4 rounded-2xl p-5 text-black md:grid-cols-2">
            <h2 className="md:col-span-2 text-2xl font-bold text-slate-900">
              {t("access_account")} - {module.name}
            </h2>
            <input
              value={accountPassword}
              onChange={(event) => setAccountPassword(event.target.value)}
              className="rounded border p-3 md:col-span-2"
              type="password"
              placeholder={t("module_password", { defaultValue: "Mot de passe du module" })}
            />
            {accountError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 md:col-span-2">
                {accountError}
              </div>
            )}
            <button type="submit" className="rounded bg-omgGreen p-3 font-bold text-white">
              {t("continue")}
            </button>
            <button type="button" onClick={() => setStep("entry")} className="rounded border border-slate-300 p-3 font-bold text-slate-700">
              {t("back")}
            </button>
          </form>
        )}

        {step === "profile" && (
          <form onSubmit={createProfile} className="omg-form-panel mt-6 grid gap-4 rounded-2xl p-5 text-black md:grid-cols-2">
            <h2 className="md:col-span-2 text-2xl font-bold text-slate-900">{t("profile")} {module.name}</h2>
            <CountryLanguageFields
              country={profile.country}
              language={profile.language}
              phone={profile.phone}
              region={profile.region}
              onChange={updateProfile}
            />
            <input value={profile.firstName} onChange={(event) => updateProfile("firstName", event.target.value)} className="rounded border p-3" placeholder="Prenom" />
            <input value={profile.lastName} onChange={(event) => updateProfile("lastName", event.target.value)} className="rounded border p-3" placeholder="Nom" />
            <input value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} className="rounded border p-3" placeholder="Email" />
            <input
              value={profile.modulePassword || ""}
              onChange={(event) => updateProfile("modulePassword", event.target.value)}
              className="rounded border p-3"
              type="password"
              placeholder={t("module_password", { defaultValue: "Mot de passe du module" })}
            />
            <select value={profile.userType} onChange={(event) => updateProfile("userType", event.target.value)} className="rounded border p-3 md:col-span-2">
              {module.userTypes.map((type, index) => <option key={type} value={type}>{userTypeLabel(type, index)}</option>)}
            </select>
            {accountError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 md:col-span-2">
                {accountError}
              </div>
            )}
            <button type="submit" className="rounded bg-omgGreen p-3 font-bold text-white md:col-span-2">{t("continue")}</button>
          </form>
        )}

        {step === "terms" && (
          <section className="omg-form-panel mt-6 rounded-2xl p-6 text-black">
            <h2 className="text-2xl font-bold">{t("terms")} - {module.name}</h2>
            <p className="mt-3 text-gray-700">{t("module_terms_summary")}</p>
            <button type="button" onClick={() => setStep("menu")} className="mt-5 rounded bg-omgGreen px-5 py-3 font-bold text-white">
              {t("accept_terms")}
            </button>
          </section>
        )}

        {step === "menu" && activeTab === "home" && (
          <>
            <section className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr]">
              <aside className="omg-card rounded-xl p-4">
                <h2 className="text-sm font-black uppercase tracking-wide text-omgGold">
                  {t("notifications", { defaultValue: "Notifications" })}
                </h2>
                <div className="mt-4 space-y-2">
                  {(logic.notifications || []).slice(0, 4).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setActiveTab("services")}
                      className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-left text-xs leading-5 text-gray-300 hover:border-omgGreen omg-focus"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </aside>

              <div className="omg-card rounded-xl p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-2xl font-black text-omgGold">
                    {t("menu", { defaultValue: "Menu" })} {module.name}
                  </h2>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleActions.map((action, index) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => openModuleAction(index)}
                      className={`omg-card omg-action-button rounded-xl p-5 text-center hover:border-omgGreen omg-focus ${activeAction === index ? "border-omgGreen shadow-[0_0_28px_rgba(11,143,60,.28)]" : ""}`}
                    >
                      <span className="block text-lg font-bold text-white">{actionLabel(action, index)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {activeAction !== null && (
              <section className="omg-form-panel mt-6 rounded-2xl p-6 text-black">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{actionLabel(selectedAction, activeAction)}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={closeModuleAction}
                    className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {t("back")}
                  </button>
                </div>

                {compactMenu && customCompactAction}

                {compactMenu && !customCompactAction && (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {showPayflowContacts && (
                      <div className="rounded-xl border border-omgGold/30 bg-amber-50 p-4 md:col-span-2">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900">
                              {t("payflow_contacts_title", { defaultValue: "Mes contacts Payflow" })}
                            </h3>
                          </div>
                          <select
                            value={actionDraft.contactId || ""}
                            onChange={(event) => choosePayflowContact(event.target.value)}
                            className="rounded border border-slate-300 bg-white p-3 text-slate-900"
                          >
                            <option value="">
                              {t("payflow_choose_contact", { defaultValue: "Choisir un contact memorise" })}
                            </option>
                            {payflowContacts.map((contact) => (
                              <option key={contact.id} value={contact.id}>
                                {contact.name} - {contact.payflowId || contact.phone || contact.email || contact.other}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-5">
                          <input
                            value={payflowContactDraft.name}
                            onChange={(event) => setPayflowContactDraft((current) => ({ ...current, name: event.target.value }))}
                            className="rounded border p-3"
                            placeholder={t("payflow_contact_name", { defaultValue: "Nom du contact" })}
                          />
                          <input
                            value={payflowContactDraft.phone}
                            onChange={(event) => setPayflowContactDraft((current) => ({ ...current, phone: event.target.value }))}
                            className="rounded border p-3"
                            placeholder={t("payflow_contact_phone", { defaultValue: "Telephone" })}
                          />
                          <input
                            value={payflowContactDraft.email}
                            onChange={(event) => setPayflowContactDraft((current) => ({ ...current, email: event.target.value }))}
                            className="rounded border p-3"
                            placeholder={t("payflow_contact_email", { defaultValue: "Email" })}
                          />
                          <input
                            value={payflowContactDraft.payflowId}
                            onChange={(event) => setPayflowContactDraft((current) => ({ ...current, payflowId: event.target.value }))}
                            className="rounded border p-3"
                            placeholder={t("payflow_contact_id", { defaultValue: "Payflow ID" })}
                          />
                          <input
                            value={payflowContactDraft.other}
                            onChange={(event) => setPayflowContactDraft((current) => ({ ...current, other: event.target.value }))}
                            className="rounded border p-3"
                            placeholder={t("payflow_contact_other", { defaultValue: "Autre moyen" })}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addPayflowContact}
                          className="mt-3 rounded border border-omgGreen px-4 py-2 text-sm font-bold text-omgGreen"
                        >
                          {t("payflow_save_contact", { defaultValue: "Memoriser ce contact" })}
                        </button>
                        {selectedPayflowContact && (
                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            {t("payflow_contact_selected", { defaultValue: "Contact selectionne" })}: {selectedPayflowContact.name}
                          </p>
                        )}
                      </div>
                    )}
                    <input
                      value={actionDraft.title}
                      onChange={(event) => updateActionDraft("title", event.target.value)}
                      className="rounded border p-3"
                      placeholder={t("module_action_title", { defaultValue: "Nom ou titre" })}
                    />
                    <AddressAutocomplete
                      value={actionDraft.location}
                      onChange={(value) => updateActionDraft("location", value)}
                      onAddress={(address) => setActionDraft((current) => ({ ...current, location: address.formattedAddress, address }))}
                      placeholder={t("module_action_location", { defaultValue: "Pays, ville, rue ou zone" })}
                    />
                    <input
                      value={actionDraft.amount}
                      onChange={(event) => updateActionDraft("amount", event.target.value)}
                      className="rounded border p-3"
                      inputMode="decimal"
                      placeholder={t("module_action_amount", { defaultValue: "Montant si paiement" })}
                    />
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 md:col-span-2">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <strong className="text-slate-900">
                            {t("saved_payment_method", { defaultValue: "Moyen de paiement memorise" })}
                          </strong>
                        </div>
                        {paymentMethods.length > 0 ? (
                          <select
                            value={activePaymentMethodId}
                            onChange={(event) => updateActionDraft("paymentMethodId", event.target.value)}
                            className="rounded border border-slate-300 bg-white p-3 text-slate-900"
                          >
                            {paymentMethods.map((method) => (
                              <option key={method.id} value={method.id}>
                                {method.label} - {method.type}{method.last4 ? ` ****${method.last4}` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("profile");
                              setActiveAction(null);
                            }}
                            className="rounded border border-omgGreen px-4 py-2 font-bold text-omgGreen"
                          >
                            {t("add_payment_method", { defaultValue: "Ajouter un moyen de paiement" })}
                          </button>
                        )}
                      </div>
                    </div>
                    <label className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-600">
                      {actionDraft.fileName || t("module_action_file", { defaultValue: "Ajouter photo ou document si necessaire" })}
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(event) => updateActionDraft("fileName", event.target.files?.[0]?.name || "")}
                      />
                    </label>
                    <textarea
                      value={actionDraft.details}
                      onChange={(event) => updateActionDraft("details", event.target.value)}
                      className="rounded border p-3 md:col-span-2"
                      rows={3}
                      placeholder={t("module_action_details", { defaultValue: "Details utiles pour finaliser cette action" })}
                    />
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={Boolean(actionDraft.confirmed)}
                        onChange={(event) => updateActionDraft("confirmed", event.target.checked)}
                      />
                      {t("module_action_step_confirm")}
                    </label>
                  </div>
                )}

                {actionResult && !suppressCompactActionFooter && (
                  <div className={`mt-5 rounded-xl border p-4 text-sm ${actionResult.status === "needs-confirmation" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-green-200 bg-green-50 text-green-900"}`}>
                    <strong>{actionResult.status === "needs-confirmation" ? t("action_needs_confirmation", { defaultValue: "Confirmation requise" }) : t("action_confirmed", { defaultValue: "Action confirmee" })}</strong>
                    <br />
                    {actionResult.message || `${t("reference", { defaultValue: "Reference" })}: ${actionResult.reference}`}
                    {actionResult.reference && (
                      <div className="mt-2 font-semibold">
                        {t("reference", { defaultValue: "Reference" })}: {actionResult.reference}
                      </div>
                    )}
                  </div>
                )}

                {!suppressCompactActionFooter && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={confirmAction} disabled={isSubmittingAction} className="rounded bg-omgGreen px-5 py-3 font-bold text-white disabled:opacity-60">
                    {isSubmittingAction ? t("loading", { defaultValue: "Chargement..." }) : t("continue")}
                  </button>
                  <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-5 py-3 font-bold text-slate-700">
                    {t("return_menu")}
                  </button>
                  {actionResult && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("history");
                        closeModuleAction();
                      }}
                      className="rounded border border-omgGreen px-5 py-3 font-bold text-omgGreen"
                    >
                      {t("history")}
                    </button>
                  )}
                </div>
                )}
              </section>
            )}

            {compactMenu && children}

            {!compactMenu && (
              children
            )}
          </>
        )}

        {activeTab === "history" && (
          <section className="mt-6 rounded-xl bg-zinc-950 p-5 text-gray-300">
            <h2 className="text-xl font-bold text-omgGold">{t("history_summary")} {module.name}</h2>
            {activities.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">{t("history_empty", { defaultValue: "Aucune activite pour le moment." })}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-white">{activity.action}</p>
                        <p className="mt-1 text-xs text-gray-400">{new Date(activity.createdAt).toLocaleString()} - {activity.reference}</p>
                      </div>
                      <span className="rounded-full border border-omgGreen/60 px-3 py-1 text-xs font-bold text-omgGreen">
                        {activity.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {activeTab === "services" && (
          <section className="mt-6 rounded-xl bg-zinc-950 p-5 text-gray-300">
            <h2 className="text-xl font-bold text-omgGold">
              {t("services_summary")} {module.name}
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-omgGold">{t("module_objective", { defaultValue: "Objectif du module" })}</h3>
                <p className="mt-2 text-sm leading-6">{logic.objective || moduleText("subtitle")}</p>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-omgGold">{t("payflow_connection", { defaultValue: "Connexion Payflow" })}</h3>
                <p className="mt-2 text-sm leading-6">
                  {module.id === "payflow"
                    ? t("payflow_core_note", { defaultValue: "Payflow est le coeur financier qui connecte les paiements, les confirmations, les commissions et les recus." })
                    : t("module_payflow_note", { defaultValue: "Ce module garde Payflow comme moyen principal de paiement, de confirmation et de suivi financier." })}
                </p>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-omgGold">{t("user_journey", { defaultValue: "Parcours utilisateur" })}</h3>
                <ol className="mt-3 space-y-2 text-sm leading-6">
                  {(logic.journey || []).map((item, index) => (
                    <li key={item}>{index + 1}. {item}</li>
                  ))}
                </ol>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-omgGold">{t("module_safeguards", { defaultValue: "Regles et protections" })}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6">
                  {(logic.safeguards || []).map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-omgGold">{t("photo_documents")}</h3>
                <p className="mt-2 text-sm leading-6">{moduleText("photoRule")}</p>
                <ul className="mt-3 space-y-2 text-sm leading-6">
                  {(logic.documents || []).map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-omgGold">{t("payment")}</h3>
                <p className="mt-2 text-sm leading-6">{moduleText("paymentRule")}</p>
                <ul className="mt-3 space-y-2 text-sm leading-6">
                  {(logic.fees || []).map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-omgGold">{t("notifications")}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6">
                  {(logic.notifications || []).map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="font-bold text-omgGold">{t("role_services", { defaultValue: "Services selon le type utilisateur" })}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6">
                  {visibleActions.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </article>
            </div>
          </section>
        )}
        {activeTab === "profile" && (
          <form onSubmit={saveEditableProfile} className="omg-form-panel mt-6 grid gap-4 rounded-xl p-5 text-black md:grid-cols-2">
            <h2 className="md:col-span-2 text-xl font-bold text-slate-900">{t("editable_profile")}</h2>
            {profileNotice && (
              <div className="rounded border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800 md:col-span-2">
                {profileNotice}
              </div>
            )}
            <CountryLanguageFields
              country={profile.country}
              language={profile.language}
              phone={profile.phone}
              region={profile.region}
              onChange={updateProfile}
            />
            <input value={profile.firstName} onChange={(event) => updateProfile("firstName", event.target.value)} className="rounded border p-3" placeholder="Prenom" />
            <input value={profile.lastName} onChange={(event) => updateProfile("lastName", event.target.value)} className="rounded border p-3" placeholder="Nom" />
            <input value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} className="rounded border p-3 md:col-span-2" placeholder="Email" />
            <input
              value={profile.modulePassword || ""}
              onChange={(event) => updateProfile("modulePassword", event.target.value)}
              className="rounded border p-3 md:col-span-2"
              type="password"
              placeholder={t("module_password", { defaultValue: "Mot de passe du module" })}
            />
            <section className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
              <h3 className="text-lg font-bold text-slate-900">
                {t("profile_payment_methods", { defaultValue: "Moyens de paiement du profil" })}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {t("profile_payment_methods_hint", {
                  defaultValue: "Gardez les moyens utiles pour payer plus vite. Pour votre securite, le systeme ne memorise pas le numero complet de carte ni le CVV."
                })}
              </p>

              {paymentMethods.length > 0 && (
                <div className="mt-4 grid gap-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-bold text-slate-900">
                            {method.label} {method.id === profile.preferredPaymentMethodId ? `- ${t("main_payment_method", { defaultValue: "Principal" })}` : ""}
                          </p>
                          <p className="text-sm text-slate-600">
                            {method.type}{method.provider ? ` - ${method.provider}` : ""}{method.last4 ? ` - ****${method.last4}` : ""}{method.currency ? ` - ${method.currency}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setPreferredPaymentMethod(method.id)} className="rounded border border-omgGreen px-3 py-2 text-sm font-bold text-omgGreen">
                            {t("set_default", { defaultValue: "Mettre principal" })}
                          </button>
                          <button type="button" onClick={() => editPaymentMethod(method)} className="rounded border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700">
                            {t("edit", { defaultValue: "Modifier" })}
                          </button>
                          <button type="button" onClick={() => removePaymentMethod(method.id)} className="rounded border border-red-200 px-3 py-2 text-sm font-bold text-red-700">
                            {t("delete", { defaultValue: "Supprimer" })}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <select
                  value={paymentMethodDraft.type}
                  onChange={(event) => setPaymentMethodDraft((current) => ({ ...current, type: event.target.value }))}
                  className="rounded border p-3"
                >
                  {PAYMENT_METHOD_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  value={paymentMethodDraft.label}
                  onChange={(event) => setPaymentMethodDraft((current) => ({ ...current, label: event.target.value }))}
                  className="rounded border p-3"
                  placeholder={t("payment_method_label", { defaultValue: "Nom visible ex: Carte principale" })}
                />
                <input
                  value={paymentMethodDraft.provider}
                  onChange={(event) => setPaymentMethodDraft((current) => ({ ...current, provider: event.target.value }))}
                  className="rounded border p-3"
                  placeholder={t("payment_method_provider", { defaultValue: "Fournisseur ex: Payflow, Visa, banque" })}
                />
                <input
                  value={paymentMethodDraft.holder}
                  onChange={(event) => setPaymentMethodDraft((current) => ({ ...current, holder: event.target.value }))}
                  className="rounded border p-3"
                  placeholder={t("payment_method_holder", { defaultValue: "Nom du titulaire" })}
                />
                <input
                  value={paymentMethodDraft.last4}
                  onChange={(event) => setPaymentMethodDraft((current) => ({ ...current, last4: event.target.value }))}
                  className="rounded border p-3"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={t("payment_method_last4", { defaultValue: "4 derniers chiffres ou reference" })}
                />
                <input
                  value={paymentMethodDraft.currency}
                  onChange={(event) => setPaymentMethodDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                  className="rounded border p-3"
                  maxLength={3}
                  placeholder={t("currency", { defaultValue: "Devise" })}
                />
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={savePaymentMethod} className="rounded bg-omgGreen px-4 py-3 font-bold text-white">
                  {paymentMethodDraft.id
                    ? t("update_payment_method", { defaultValue: "Mettre a jour le moyen de paiement" })
                    : t("save_payment_method", { defaultValue: "Memoriser ce moyen de paiement" })}
                </button>
                {paymentMethodDraft.id && (
                  <button type="button" onClick={() => setPaymentMethodDraft(createBlankPaymentMethod())} className="rounded border border-slate-300 px-4 py-3 font-bold text-slate-700">
                    {t("cancel", { defaultValue: "Annuler" })}
                  </button>
                )}
              </div>
            </section>
            <button type="submit" className="rounded bg-omgGreen p-3 font-bold text-white md:col-span-2">{t("save_profile")}</button>
          </form>
        )}

        <nav className="omg-bottom-nav fixed bottom-0 left-0 right-0 z-30 border-t border-omgGold/30 bg-black/95">
          <div className="mx-auto grid max-w-3xl grid-cols-4">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`px-2 py-3 text-sm ${activeTab === tab.id ? "text-omgGold" : "text-gray-300"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
      <FredChat moduleId={assistantId} compact assistantContext={assistantContext} />
    </DashboardLayout>
  );
}

export default ModuleDashboardTemplate;
