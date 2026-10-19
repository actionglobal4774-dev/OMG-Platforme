import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { submitModuleAction } from "../../services/backendService";

const adminSections = [
  {
    id: "governance",
    titleKey: "admin_global_dashboard",
    points: ["Volume Payflow", "Activite par module", "Alertes securite", "Incidents ouverts"]
  },
  {
    id: "payflowAgents",
    titleKey: "admin_payflow_agents",
    points: ["Creer agent", "Activer / suspendre", "Zones", "Limites", "Commissions"]
  },
  {
    id: "mailportDrivers",
    titleKey: "admin_mailport_drivers",
    points: ["Validation livreur", "Zones", "Historique missions", "Sanctions"]
  },
  {
    id: "finance",
    titleKey: "admin_revenue_commissions",
    points: ["Revenus modules", "Depenses", "Commissions", "Rapports financiers"]
  },
  {
    id: "audit",
    titleKey: "admin_audit_security",
    points: ["Audit log", "Double validation", "RBAC", "Actions avant/apres"]
  }
];

const universityFlow = [
  "Ajouter un chapitre",
  "Inserer contenu chapitre",
  "Ajouter questions",
  "Rattacher aux facultes",
  "Retour a Integration Universite"
];

function AdminControlCenter() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState(adminSections[0].id);
  const [chapterStep, setChapterStep] = useState(0);
  const [chapterDraft, setChapterDraft] = useState({
    name: "",
    content: "",
    questions: "",
    faculties: ""
  });
  const [confirmation, setConfirmation] = useState("");

  const currentSection = adminSections.find((section) => section.id === activeSection) || adminSections[0];

  const saveAdminAction = async (action) => {
    const result = await submitModuleAction({
      moduleId: "administration",
      moduleName: "Platform Administration",
      action,
      profile: { userType: "Super admin" }
    });
    setConfirmation(result.data?.reference || "ADMIN-DEMO-OK");
  };

  const nextChapterStep = async () => {
    if (chapterStep < universityFlow.length - 1) {
      setChapterStep((current) => current + 1);
      return;
    }
    await saveAdminAction("University contenu - chapitre prepare");
    setChapterStep(0);
    setChapterDraft({ name: "", content: "", questions: "", faculties: "" });
  };

  return (
    <section className="mt-6 grid gap-5 xl:grid-cols-[320px_1fr]">
      <aside className="omg-card rounded-xl p-5">
        <h2 className="text-xl font-black text-omgGold">One Million Administration</h2>
        <p className="mt-2 text-sm leading-6 text-gray-300">
          Centre de controle pour super admin, admins pays, agents Payflow, livreurs Mailport et contenu University Integration.
        </p>
        <div className="mt-5 space-y-2">
          {adminSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`w-full rounded border p-3 text-left text-sm font-bold ${activeSection === section.id ? "border-omgGreen text-omgGreen" : "border-omgGold/30 text-gray-200"}`}
            >
              {t(section.titleKey)}
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-5">
        <div className="omg-card rounded-xl p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-omgGreen">Supervision</p>
              <h2 className="mt-1 text-2xl font-black text-omgGold">{t(currentSection.titleKey)}</h2>
            </div>
            <button
              type="button"
              onClick={() => saveAdminAction(t(currentSection.titleKey))}
              className="rounded bg-omgGreen px-5 py-3 font-bold text-white"
            >
              {t("continue")}
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {currentSection.points.map((point) => (
              <div key={point} className="rounded-xl border border-omgGold/30 bg-black/40 p-4 text-sm text-gray-200">
                {point}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 text-black">
          <h2 className="text-2xl font-black text-slate-900">{t("admin_university_chapters")}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Flux sequentiel: chapitre, contenu, questions, rattachement facultes, puis retour automatique.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {universityFlow.map((step, index) => (
              <span key={step} className={`rounded-full px-3 py-1 text-xs font-bold ${chapterStep === index ? "bg-omgGreen text-white" : "bg-slate-100 text-slate-700"}`}>
                {index + 1}. {step}
              </span>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            {chapterStep === 0 && (
              <input
                className="rounded border p-3"
                placeholder="Nom du chapitre"
                value={chapterDraft.name}
                onChange={(event) => setChapterDraft({ ...chapterDraft, name: event.target.value })}
              />
            )}
            {chapterStep === 1 && (
              <textarea
                className="min-h-40 rounded border p-3"
                placeholder="Copier-coller le contenu du chapitre"
                value={chapterDraft.content}
                onChange={(event) => setChapterDraft({ ...chapterDraft, content: event.target.value })}
              />
            )}
            {chapterStep === 2 && (
              <textarea
                className="min-h-40 rounded border p-3"
                placeholder="Copier-coller les questions et reponses"
                value={chapterDraft.questions}
                onChange={(event) => setChapterDraft({ ...chapterDraft, questions: event.target.value })}
              />
            )}
            {chapterStep === 3 && (
              <input
                className="rounded border p-3"
                placeholder="Facultes concernees, separees par virgule"
                value={chapterDraft.faculties}
                onChange={(event) => setChapterDraft({ ...chapterDraft, faculties: event.target.value })}
              />
            )}
            {chapterStep === 4 && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                Le chapitre est pret a etre memorise dans University Integration avec ses facultes.
              </div>
            )}
          </div>

          <button type="button" onClick={nextChapterStep} className="mt-5 rounded bg-omgGold px-5 py-3 font-bold text-black">
            {chapterStep < universityFlow.length - 1 ? t("continue") : "Memoriser le chapitre"}
          </button>
        </div>

        {confirmation && (
          <div className="rounded-xl border border-omgGreen bg-green-950/40 p-4 text-sm font-bold text-green-200">
            Action admin preparee: {confirmation}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminControlCenter;
