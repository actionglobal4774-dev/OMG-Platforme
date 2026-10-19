import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FaRobot, FaTimes } from "react-icons/fa";
import { useFred } from "../../context/FredContext";
import { modules } from "../../data/modules";
import { getModuleLogic } from "../../data/moduleLogic";

function FredChat({ moduleId = "platform", compact = false, assistantContext = null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { messages, sendMessage } = useFred();
  const [open, setOpen] = useState(!compact);
  const [draft, setDraft] = useState("");
  const currentModule = modules.find((module) => module.id === moduleId);
  const currentLogic = getModuleLogic(moduleId);
  const platformShortcuts = modules
    .filter((module) => ["payflow", "mailport", "university", "health", "property", "store"].includes(module.id))
    .slice(0, 6);
  const moduleActions = Object.values(currentLogic.roleActions || {}).flat().slice(0, 5);

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    await sendMessage(draft.trim(), moduleId, assistantContext);
    setDraft("");
  };

  const quickAsk = async (label, route) => {
    await sendMessage(label, moduleId, assistantContext);
    if (route) navigate(route);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-40 rounded-full bg-omgGreen p-4 text-white shadow-lg omg-focus"
        aria-label="Ouvrir l'assistant OMG"
      >
        <FaRobot />
      </button>
    );
  }

  return (
    <section className="fixed bottom-20 right-4 z-40 w-[min(92vw,360px)] rounded-xl border border-omgGold/60 bg-black p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-omgGold">{moduleId === "university" ? t("fred") : t("cherlensky")}</h2>
          <p className="text-xs text-gray-300">{t("assistant_limit")}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded p-2 text-gray-300 hover:text-white" aria-label="Fermer">
          <FaTimes />
        </button>
      </div>

      <div className="mt-4 max-h-52 space-y-3 overflow-auto">
        {messages.filter((message) => message.moduleId === moduleId || (moduleId === "platform" && message.moduleId === "platform")).slice(-6).map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
            <span className={`inline-block rounded-lg px-3 py-2 text-sm ${message.role === "user" ? "bg-omgGreen text-white" : "bg-zinc-900 text-gray-100"}`}>
              {message.content}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {moduleId === "platform"
          ? platformShortcuts.map((module) => (
              <button
                key={module.id}
                type="button"
                onClick={() => quickAsk(`${t("open_module", { defaultValue: "Ouvrir" })} ${t(module.nameKey, { defaultValue: module.name })}`, module.route)}
                className="rounded-full border border-omgGold/50 px-3 py-1 text-xs text-omgGold hover:border-omgGreen hover:text-omgGreen omg-focus"
              >
                {t(module.nameKey, { defaultValue: module.name })}
              </button>
            ))
          : moduleActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => quickAsk(`${currentModule?.name || ""}: ${action}`)}
                className="rounded-full border border-omgGold/50 px-3 py-1 text-xs text-omgGold hover:border-omgGreen hover:text-omgGreen omg-focus"
              >
                {action}
              </button>
            ))}
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("assistant_placeholder")}
          className="min-w-0 flex-1 rounded border border-gray-700 bg-zinc-950 px-3 py-2 text-sm text-white omg-focus"
        />
        <button type="submit" className="rounded bg-omgGold px-4 py-2 font-semibold text-black omg-focus">
          OK
        </button>
      </form>
    </section>
  );
}

export default FredChat;
