import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { submitModuleAction } from "../../services/backendService";
import { notifyModuleUser } from "../../services/notificationService";
import { saveModuleActivity } from "../../services/activityService";

const moduleFieldSets = {
  mailport: ["country", "city", "street", "postalCode", "photo", "qrTracking"],
  property: ["country", "city", "street", "postalCode", "photo", "amount"],
  store: ["product", "quantity", "amount", "photo", "payment"],
  restaurant: ["reservationDate", "reservationTime", "quantity", "payment"],
  school: ["studentName", "amount", "payment", "document"],
  city: ["merchantName", "country", "city", "street", "photo", "amount"],
  health: ["patientName", "reservationDate", "document", "video"],
  tax: ["taxDocumentType", "document", "amount", "signature"],
  university: ["country", "faculty", "studentEmail", "amount", "payment"],
  administration: ["adminRole", "auditNote", "amount"],
  payflow: ["contact", "amount", "payment", "pin"]
};

const actionFieldHints = [
  { tokens: ["photo", "image", "publish", "publier"], fields: ["photo"] },
  { tokens: ["address", "adresse", "location", "search", "chercher", "rechercher"], fields: ["country", "city", "street", "postalCode"] },
  { tokens: ["qr", "package", "colis", "tracking", "suivi"], fields: ["qrTracking"] },
  { tokens: ["payment", "paiement", "payer", "tax", "taxe", "fee", "frais", "revenue"], fields: ["amount", "payment"] },
  { tokens: ["reservation", "rendez", "appointment"], fields: ["reservationDate", "reservationTime"] },
  { tokens: ["document", "contract", "contrat", "scan"], fields: ["document"] },
  { tokens: ["product", "produit", "cart", "panier", "stock"], fields: ["product", "quantity"] },
  { tokens: ["student", "eleve", "postulant", "faculty", "faculte"], fields: ["studentName", "studentEmail", "faculty"] },
  { tokens: ["video", "teleconsultation"], fields: ["video"] },
  { tokens: ["audit", "role", "admin"], fields: ["adminRole", "auditNote"] }
];

function uniqueFields(fields) {
  return [...new Set(fields)];
}

function getFieldsForAction(moduleId, actionKey) {
  const key = String(actionKey || "").toLowerCase();
  const base = moduleFieldSets[moduleId] || ["country", "city", "amount", "payment"];
  const hinted = actionFieldHints
    .filter((hint) => hint.tokens.some((token) => key.includes(token)))
    .flatMap((hint) => hint.fields);
  return uniqueFields([...(hinted.length ? hinted : base.slice(0, 4)), "confirmation"]);
}

function ModuleFeatureGrid({ items = [], moduleName, moduleId }) {
  const { t } = useTranslation();
  const [activeItem, setActiveItem] = useState(null);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState("");

  const selectedItem = activeItem || items[0];
  const activeModuleId = moduleId || String(moduleName || "").toLowerCase().replaceAll(" ", "-");
  const activeFields = selectedItem ? getFieldsForAction(activeModuleId, selectedItem) : [];

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [selectedItem]: {
        ...(current[selectedItem] || {}),
        [field]: value
      }
    }));
  };

  const confirm = async () => {
    if (!selectedItem) return;
    const result = await submitModuleAction({
      moduleId: activeModuleId,
      moduleName,
      action: selectedItem,
      payload: form[selectedItem] || {}
    });
    const activity = saveModuleActivity(activeModuleId, {
      action: selectedItem,
      payload: form[selectedItem] || {},
      reference: result.data?.reference,
      functionName: result.functionName,
      status: result.live ? "confirmed" : "prepared"
    });
    await notifyModuleUser(activeModuleId, `${moduleName} - ${t(selectedItem)}`, t("module_action_notification"), {
      action: selectedItem,
      reference: activity.reference
    });
    setStatus(result.live ? t("module_action_notification") : `${t("module_action_notification")} (${activity.reference})`);
  };

  const renderField = (field) => {
    const value = form[selectedItem]?.[field] || "";
    const commonClass = "rounded border border-slate-300 bg-white p-3 text-slate-900";
    const fallbackLabel = field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
    const label = t(`field_${field}`, { defaultValue: fallbackLabel });

    if (field === "confirmation") {
      return (
        <label key={field} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
          <input type="checkbox" onChange={(event) => updateField(field, event.target.checked)} />
          {t("module_action_step_confirm")}
        </label>
      );
    }

    if (field === "payment") {
      return (
        <select key={field} className={commonClass} value={value} onChange={(event) => updateField(field, event.target.value)}>
          <option value="">{t("payment_methods")}</option>
          <option value="payflow">Payflow</option>
          <option value="card">{t("payflow_method_bank_card")}</option>
          <option value="operator">{t("payflow_method_operator")}</option>
          <option value="bank">{t("payflow_method_bank_transfer")}</option>
        </select>
      );
    }

    if (field === "photo") {
      return <input key={field} className={commonClass} type="file" accept="image/*" onChange={(event) => updateField(field, event.target.files?.[0]?.name || "")} />;
    }

    if (field === "document") {
      return <input key={field} className={commonClass} type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => updateField(field, event.target.files?.[0]?.name || "")} />;
    }

    if (field === "video") {
      return (
        <button key={field} type="button" onClick={() => updateField(field, "video-session-ready")} className="rounded bg-slate-900 p-3 font-bold text-white">
          {t("field_video")}
        </button>
      );
    }

    if (field === "qrTracking") {
      return <input key={field} className={commonClass} placeholder="QR / Tracking ID" value={value} onChange={(event) => updateField(field, event.target.value)} />;
    }

    if (field === "reservationDate") {
      return <input key={field} className={commonClass} type="date" value={value} onChange={(event) => updateField(field, event.target.value)} />;
    }

    if (field === "reservationTime") {
      return <input key={field} className={commonClass} type="time" value={value} onChange={(event) => updateField(field, event.target.value)} />;
    }

    if (field === "amount" || field === "quantity") {
      return <input key={field} className={commonClass} type="number" min="0" placeholder={label} value={value} onChange={(event) => updateField(field, event.target.value)} />;
    }

    return <input key={field} className={commonClass} placeholder={label} value={value} onChange={(event) => updateField(field, event.target.value)} />;
  };

  if (!items.length) return null;

  return (
    <section className="mt-6">
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setActiveItem(item)}
            className={`omg-card rounded-xl p-5 text-left hover:border-omgGreen omg-focus ${activeItem === item ? "border-omgGreen" : ""}`}
          >
            <span className="block font-bold text-white">{t(item)}</span>
          </button>
        ))}
      </div>

      {selectedItem && (
        <div className="omg-form-panel mt-5 rounded-2xl p-5 text-black">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{t(selectedItem)}</h3>
            </div>
            <button type="button" onClick={() => setActiveItem(null)} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold">
              {t("back")}
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {activeFields.map(renderField)}
          </div>

          {status && (
            <div className="mt-4 rounded-xl border border-omgGreen bg-green-50 p-3 text-sm font-semibold text-green-800">
              {status}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={confirm} className="rounded bg-omgGreen px-5 py-3 font-bold text-white">
              {t("continue")}
            </button>
            <button type="button" onClick={() => setActiveItem(null)} className="rounded border border-slate-300 px-5 py-3 font-bold text-slate-700">
              {t("return_menu")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ModuleFeatureGrid;
