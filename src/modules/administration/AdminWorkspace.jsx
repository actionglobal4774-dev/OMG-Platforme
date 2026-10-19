import React, { useMemo, useState } from "react";
import { getCollection, upsertItem } from "../../services/localActionService";
import { saveModuleActivity } from "../../services/activityService";
import AdminFinancialGovernance from "./AdminFinancialGovernance";

const businessModules = ["Payflow", "Mailport", "Property", "Restaurant", "Store", "Health", "School", "City", "USA Tax Pro", "University"];
const platformModules = [...businessModules, "Administration"];

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getMode(action) {
  const value = normalize(action);
  if (value.includes("dashboard global")) return "dashboard";
  if (value.includes("revenu")) return "revenue";
  if (value.includes("transaction")) return "revenue";
  if (value.includes("pilotage financier")) return "financial-governance";
  if (value.includes("administrateurs reserves")) return "roles";
  if (value.includes("role")) return "roles";
  if (value.includes("agents payflow")) return "payflow-agents";
  if (value.includes("livreurs mailport")) return "couriers";
  if (value.includes("university")) return "university";
  if (value.includes("audit")) return "audit";
  if (value.includes("controle pays")) return "country";
  if (value.includes("agents locaux")) return "local-agents";
  if (value.includes("rapports pays")) return "country-reports";
  if (value.includes("rapports module")) return "module-reports";
  if (value.includes("incident")) return "incidents";
  if (value.includes("verification")) return "verifications";
  return "dashboard";
}

function addAdminAudit(action, actor, target, details, approvalId = "") {
  return upsertItem("admin_audit", {
    action,
    actor,
    target,
    details,
    approvalId,
    immutable: true,
    occurredAt: new Date().toISOString()
  });
}

function AdminWorkspace({ selectedAction, profile, closeModuleAction }) {
  const mode = getMode(selectedAction);
  const [roleDraft, setRoleDraft] = useState({ email: "", role: "Admin pays", country: "United States", reason: "", scopes: ["lecture_transactions"] });
  const [agent, setAgent] = useState({ name: "", email: "", country: "", zone: "", type: "Payflow", status: "pending" });
  const [critical, setCritical] = useState({ targetId: "", action: "", approverEmail: "", approvalCode: "", confirmed: false });
  const [chapter, setChapter] = useState({ title: "", code: "", faculty: "", description: "", instructor: "", duration: "", confirmed: false });
  const [incident, setIncident] = useState({ module: "Payflow", severity: "Medium", title: "", description: "", owner: "" });
  const [verification, setVerification] = useState({ entityId: "", type: "Agent", evidence: "", decision: "needs-review", confirmed: false });
  const [country, setCountry] = useState(profile?.country || "United States");
  const [moduleFilter, setModuleFilter] = useState("Tous");
  const [notice, setNotice] = useState("");
  const [reference, setReference] = useState("");

  const payments = getCollection("payments");
  const activitiesByModule = (() => {
    try { return JSON.parse(localStorage.getItem("omg_module_activity") || "{}"); } catch { return {}; }
  })();
  const roles = getCollection("admin_roles");
  const agents = getCollection("admin_agents");
  const approvals = getCollection("admin_approvals");
  const audit = getCollection("admin_audit");
  const incidents = getCollection("admin_incidents");
  const verifications = getCollection("admin_verifications");
  const universityCourses = getCollection("university_admin_courses");

  const revenue = useMemo(() => payments.reduce((sum, item) => sum + Number(item.amount || 0), 0), [payments]);
  const moduleActivityCount = useMemo(() => Object.values(activitiesByModule).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0), [activitiesByModule]);
  const consolidatedTransactions = useMemo(() => {
    const paymentRows = payments.map((item) => ({ ...item, module: item.module || businessModules.find((name) => normalize(item.label).includes(normalize(name))) || "Payflow", kind: "Paiement" }));
    const activityRows = Object.entries(activitiesByModule).flatMap(([moduleId, items]) => (Array.isArray(items) ? items : []).filter((item) => Number(item.amount) > 0).map((item) => ({ ...item, id: item.id || item.reference, module: businessModules.find((name) => normalize(moduleId).includes(normalize(name))) || moduleId, kind: item.action || "Transaction" })));
    return [...paymentRows, ...activityRows].filter((item, index, rows) => rows.findIndex((row) => (row.id || row.reference) === (item.id || item.reference)) === index);
  }, [payments, activitiesByModule]);
  const filteredPayments = useMemo(() => consolidatedTransactions.filter((item) => moduleFilter === "Tous" || normalize(item.module).includes(normalize(moduleFilter))), [consolidatedTransactions, moduleFilter]);

  const complete = (action, nextReference, message) => {
    saveModuleActivity("administration", {
      action,
      reference: nextReference,
      status: "confirmed",
      profile: { email: profile?.email, userType: profile?.userType, country: profile?.country }
    });
    setReference(nextReference);
    setNotice(message);
  };

  const prepareWithAssistant = () => {
    if (mode === "dashboard" || mode === "revenue") {
      setNotice(`Assistant : ${consolidatedTransactions.length} transaction(s) consolidee(s), ${revenue.toFixed(2)} USD de volume local et ${moduleActivityCount} activite(s) analysees.`);
      return;
    }
    if (mode === "roles") {
      setRoleDraft((current) => ({ ...current, country: current.country || profile?.country || "United States" }));
      setNotice("Assistant : pays et controles RBAC prepares. Le role, la justification et la double validation restent humaines.");
      return;
    }
    if (["payflow-agents", "couriers", "local-agents"].includes(mode)) {
      setAgent((current) => ({
        ...current,
        country: current.country || profile?.country || "United States",
        type: mode === "couriers" ? "Mailport" : "Payflow"
      }));
      setNotice("Assistant : type et pays prepares. L'identite, la zone et l'activation restent humaines.");
      return;
    }
    if (mode === "incidents") {
      setIncident((current) => ({ ...current, owner: current.owner || profile?.email || "" }));
      setNotice("Assistant : responsable propose. La severite et la resolution doivent etre confirmees par un controleur.");
      return;
    }
    setNotice("Assistant : donnees analysees et formulaire prepare. Aucune permission, suspension, activation ou decision n'a ete executee.");
  };

  const createApprovalRequest = (action, targetId, details) => {
    if (!targetId || !action || !details.trim()) {
      setNotice("Cible, action et justification sont obligatoires.");
      return null;
    }
    const result = upsertItem("admin_approvals", {
      action,
      targetId,
      details,
      requestedBy: profile?.email,
      status: "pending-second-approval",
      firstApprovalAt: new Date().toISOString()
    });
    addAdminAudit("CRITICAL_ACTION_REQUESTED", profile?.email, targetId, `${action} · ${details}`, result.data.id);
    setCritical({ targetId, action, approverEmail: "", approvalCode: "", confirmed: false });
    complete("Demande double validation", result.data.id, "Action preparee. Une seconde personne autorisee doit confirmer.");
    return result.data;
  };

  const secondApprove = () => {
    const request = approvals.find((item) => item.id === reference) || approvals.find((item) => item.targetId === critical.targetId && item.status === "pending-second-approval");
    if (!request) {
      setNotice("Aucune demande de validation active.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(critical.approverEmail) || normalize(critical.approverEmail) === normalize(request.requestedBy)) {
      setNotice("Le second approbateur doit etre une autre personne avec un email valide.");
      return;
    }
    if (!/^\d{6}$/.test(critical.approvalCode) || !critical.confirmed) {
      setNotice("Code a 6 chiffres et confirmation du second approbateur obligatoires.");
      return;
    }
    upsertItem("admin_approvals", { ...request, status: "approved", secondApprover: critical.approverEmail, secondApprovalAt: new Date().toISOString() });
    addAdminAudit("CRITICAL_ACTION_APPROVED", critical.approverEmail, request.targetId, request.action, request.id);
    complete("Double validation", request.id, "Double validation enregistree. L'execution backend restera controlee par l'API securisee.");
  };

  const requestRoleChange = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(roleDraft.email) || !roleDraft.reason.trim()) {
      setNotice("Email et justification sont obligatoires.");
      return;
    }
    if (normalize(roleDraft.role).includes("super admin")) {
      setNotice("Operation interdite : le role Super Admin est unique et ne peut pas etre delegue.");
      return;
    }
    const draft = upsertItem("admin_roles", { ...roleDraft, isFounder: false, canManageAdmins: false, status: "reserved-pending-founder", requestedBy: profile?.email });
    createApprovalRequest("ROLE_CHANGE", draft.data.id, roleDraft.reason);
  };

  const saveAgent = (type) => {
    if (!agent.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agent.email) || !agent.country.trim() || !agent.zone.trim()) {
      setNotice("Nom, email, pays et zone sont obligatoires.");
      return;
    }
    const result = upsertItem("admin_agents", { ...agent, type, status: "pending-approval", createdBy: profile?.email });
    addAdminAudit("AGENT_CREATED_PENDING", profile?.email, result.data.id, `${type} · ${agent.country}`);
    complete(`Creer ${type}`, result.data.id, `${type} cree avec statut en attente. Activation soumise a double validation.`);
  };

  const requestAgentStatus = (item, nextStatus) => {
    createApprovalRequest("AGENT_STATUS_CHANGE", item.id, `${item.status} vers ${nextStatus}`);
  };

  const saveChapter = () => {
    if (!chapter.title.trim() || !chapter.code.trim() || !chapter.faculty.trim() || chapter.description.trim().length < 30 || !chapter.instructor.trim() || !chapter.duration.trim() || !chapter.confirmed) {
      setNotice("Titre, code, faculte, description, professeur, duree et confirmation sont obligatoires.");
      return;
    }
    const result = upsertItem("university_admin_courses", { ...chapter, author: profile?.email, status: "ready-for-university-integration" });
    addAdminAudit("UNIVERSITY_COURSE_CREATED", profile?.email, result.data.id, `${chapter.code} - ${chapter.title}`);
    complete("Cours University", result.data.id, "Cours ajoute et prepare pour l'integration au module University.");
  };

  const saveIncident = () => {
    if (!incident.title.trim() || !incident.description.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(incident.owner)) {
      setNotice("Titre, description et responsable valide sont obligatoires.");
      return;
    }
    const result = upsertItem("admin_incidents", { ...incident, reporter: profile?.email, status: "open" });
    addAdminAudit("INCIDENT_OPENED", profile?.email, result.data.id, `${incident.module} · ${incident.severity}`);
    complete("Incident", result.data.id, "Incident ouvert et trace dans l'audit.");
  };

  const saveVerification = () => {
    if (!verification.entityId.trim() || !verification.evidence.trim() || !verification.confirmed) {
      setNotice("Entite, preuve et confirmation du controleur sont obligatoires.");
      return;
    }
    const result = upsertItem("admin_verifications", { ...verification, controller: profile?.email, decidedAt: new Date().toISOString() });
    addAdminAudit("VERIFICATION_RECORDED", profile?.email, verification.entityId, `${verification.type} · ${verification.decision}`, result.data.id);
    complete("Verification", result.data.id, "Decision de controle enregistree et auditee.");
  };

  const Section = ({ title, children }) => <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="text-lg font-black text-slate-900">{title}</h3>{children}</section>;

  const ApprovalPanel = () => (
    <Section title="Seconde validation">
      <p className="mt-3 text-sm font-bold text-slate-600">Action : {critical.action || "Aucune"} · Cible : {critical.targetId || "Aucune"}</p>
      <input placeholder="Email du second approbateur" className="mt-3 w-full rounded border p-3" value={critical.approverEmail} onChange={(e) => setCritical({ ...critical, approverEmail: e.target.value })} />
      <input placeholder="Code d'approbation a 6 chiffres" maxLength="6" className="mt-3 w-full rounded border p-3" value={critical.approvalCode} onChange={(e) => setCritical({ ...critical, approvalCode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
      <label className="mt-3 flex gap-2"><input type="checkbox" checked={critical.confirmed} onChange={(e) => setCritical({ ...critical, confirmed: e.target.checked })} /> Je suis une seconde personne autorisee et j'ai verifie cette action.</label>
      <button type="button" onClick={secondApprove} className="mt-4 rounded bg-red-700 px-5 py-3 font-bold text-white">Approuver en seconde validation</button>
    </Section>
  );

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-omgGold/40 bg-slate-950 p-4 text-white">
        <div><strong className="text-omgGold">Assistant Administration</strong><p className="text-sm text-slate-300">Analyse et prepare · aucune permission ou suspension</p></div>
        <button type="button" onClick={prepareWithAssistant} className="rounded bg-omgGold px-4 py-2 font-black text-black">Preparer avec l'assistant</button>
      </div>

      {mode === "dashboard" && (
        <Section title="Dashboard global">
          <div className="mt-4 grid gap-3 md:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><strong>Modules supervises</strong><p className="text-2xl font-black">10</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Transactions</strong><p className="text-2xl font-black">{consolidatedTransactions.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Agents Payflow / Mailport</strong><p className="text-2xl font-black">{agents.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Cours University</strong><p className="text-2xl font-black">{universityCourses.length}</p></div></div>
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4"><strong>Gouvernance :</strong> 1 seul Super Admin (fondateur). Les administrateurs futurs sont limites, sans droit de nommer d'autres administrateurs.</div>
        </Section>
      )}

      {mode === "revenue" && (
        <Section title="Transactions consolidees des 10 modules">
          <select className="mt-4 w-full rounded border p-3" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}><option>Tous</option>{businessModules.map((item) => <option key={item}>{item}</option>)}</select>
          <div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><strong>Transactions</strong><p className="text-2xl font-black">{filteredPayments.length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Volume</strong><p className="text-2xl font-black">{filteredPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2)} USD</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Commission indicative 4.99%</strong><p className="text-2xl font-black">{(filteredPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0) * 0.0499).toFixed(2)} USD</p></div></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Reference</th><th className="p-2">Module</th><th className="p-2">Type</th><th className="p-2">Montant</th><th className="p-2">Statut</th><th className="p-2">Date</th></tr></thead><tbody>{filteredPayments.map((item, index) => <tr key={item.id || item.reference || index} className="border-b"><td className="p-2">{item.id || item.reference || "-"}</td><td className="p-2 font-bold">{item.module}</td><td className="p-2">{item.kind}</td><td className="p-2">{Number(item.amount || 0).toFixed(2)} {item.currency || "USD"}</td><td className="p-2">{item.status || "confirme"}</td><td className="p-2">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td></tr>)}</tbody></table>{!filteredPayments.length && <p className="p-4 text-slate-500">Aucune transaction enregistree pour ce filtre.</p>}</div>
        </Section>
      )}

      {mode === "financial-governance" && <AdminFinancialGovernance profile={profile} />}

      {mode === "roles" && (
        <>
          <Section title="Administrateurs avec permissions reservees">
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-900">Le role Super Admin est unique, non delegable et reserve au fondateur.</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Email du futur administrateur" className="rounded border p-3" value={roleDraft.email} onChange={(e) => setRoleDraft({ ...roleDraft, email: e.target.value })} /><select className="rounded border p-3" value={roleDraft.role} onChange={(e) => setRoleDraft({ ...roleDraft, role: e.target.value })}><option>Admin pays</option><option>Controle module</option><option>Lecture seule</option></select><input placeholder="Pays ou zone autorisee" className="rounded border p-3" value={roleDraft.country} onChange={(e) => setRoleDraft({ ...roleDraft, country: e.target.value })} /><textarea placeholder="Justification obligatoire et limites d'acces" className="rounded border p-3" value={roleDraft.reason} onChange={(e) => setRoleDraft({ ...roleDraft, reason: e.target.value })} /></div>
            <p className="mt-3 text-sm text-slate-600">Restrictions automatiques : aucun acces Super Admin, aucune gestion des administrateurs, aucune modification des regles de securite.</p>
            <button type="button" onClick={requestRoleChange} className="mt-4 rounded bg-amber-600 px-5 py-3 font-bold text-white">Soumettre a l'approbation du fondateur</button>
            <p className="mt-3 text-sm font-bold text-slate-600">{roles.length} demande(s) RBAC.</p>
          </Section>
          <ApprovalPanel />
        </>
      )}

      {(mode === "payflow-agents" || mode === "couriers" || mode === "local-agents") && (
        <>
          <Section title={mode === "couriers" ? "Livreurs Mailport" : "Agents Payflow"}>
            <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Nom complet" className="rounded border p-3" value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} /><input placeholder="Email" className="rounded border p-3" value={agent.email} onChange={(e) => setAgent({ ...agent, email: e.target.value })} /><input placeholder="Pays" className="rounded border p-3" value={agent.country} onChange={(e) => setAgent({ ...agent, country: e.target.value })} /><input placeholder="Zone" className="rounded border p-3" value={agent.zone} onChange={(e) => setAgent({ ...agent, zone: e.target.value })} /></div>
            <button type="button" onClick={() => saveAgent(mode === "couriers" ? "Mailport" : "Payflow")} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Creer en attente</button>
            <div className="mt-4 space-y-3">{agents.filter((item) => mode === "local-agents" ? item.country === country : item.type === (mode === "couriers" ? "Mailport" : "Payflow")).map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.name}</strong><p>{item.type} · {item.country} · {item.status}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => requestAgentStatus(item, "active")} className="rounded border px-3 py-2">Demander activation</button><button type="button" onClick={() => requestAgentStatus(item, "suspended")} className="rounded border border-red-400 px-3 py-2 text-red-700">Demander suspension</button></div></article>)}</div>
          </Section>
          <ApprovalPanel />
        </>
      )}

      {mode === "university" && (
        <Section title="Ajouter un cours pour University Integration">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Titre du cours" className="rounded border p-3" value={chapter.title} onChange={(e) => setChapter({ ...chapter, title: e.target.value })} /><input placeholder="Code du cours (ex. BUS-101)" className="rounded border p-3" value={chapter.code} onChange={(e) => setChapter({ ...chapter, code: e.target.value })} /><input placeholder="Faculte" className="rounded border p-3" value={chapter.faculty} onChange={(e) => setChapter({ ...chapter, faculty: e.target.value })} /><input placeholder="Professeur responsable" className="rounded border p-3" value={chapter.instructor} onChange={(e) => setChapter({ ...chapter, instructor: e.target.value })} /><input placeholder="Duree (ex. 12 semaines)" className="rounded border p-3" value={chapter.duration} onChange={(e) => setChapter({ ...chapter, duration: e.target.value })} /><textarea placeholder="Description du cours (minimum 30 caracteres)" className="rounded border p-3" value={chapter.description} onChange={(e) => setChapter({ ...chapter, description: e.target.value })} /></div>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={chapter.confirmed} onChange={(e) => setChapter({ ...chapter, confirmed: e.target.checked })} /> Je confirme les informations academiques.</label>
          <button type="button" onClick={saveChapter} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Ajouter le cours</button>
          <div className="mt-4 space-y-2">{universityCourses.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.code} - {item.title}</strong><p>{item.faculty} · {item.instructor} · {item.duration}</p><p className="text-sm text-emerald-700">{item.status}</p></article>)}</div>
        </Section>
      )}

      {mode === "audit" && (
        <Section title="Audit immuable">
          <div className="mt-4 space-y-3">{!audit.length && <p>Aucun evenement.</p>}{audit.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><strong>{item.action}</strong><p>{item.actor} · {item.target}</p><p>{item.details}</p><p className="text-xs text-slate-500">Lecture seule · {item.occurredAt}</p></article>)}</div>
        </Section>
      )}

      {mode === "country" && (
        <Section title="Controle pays">
          <input placeholder="Pays" className="mt-4 w-full rounded border p-3" value={country} onChange={(e) => setCountry(e.target.value)} />
          <div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><strong>Agents</strong><p className="text-2xl font-black">{agents.filter((item) => item.country === country).length}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Activites</strong><p className="text-2xl font-black">{moduleActivityCount}</p></div><div className="rounded-xl bg-slate-50 p-4"><strong>Incidents</strong><p className="text-2xl font-black">{incidents.filter((item) => item.country === country || !item.country).length}</p></div></div>
        </Section>
      )}

      {mode === "country-reports" && (
        <Section title="Rapport pays"><p className="mt-4 rounded-xl bg-slate-50 p-4 font-bold">{country} · {agents.filter((item) => item.country === country).length} agent(s) · {payments.length} transaction(s) plateforme · {incidents.length} incident(s)</p></Section>
      )}

      {mode === "module-reports" && (
        <Section title="Rapports par module">
          <div className="mt-4 grid gap-3 md:grid-cols-3">{platformModules.map((item) => <article key={item} className="rounded-xl bg-slate-50 p-4"><strong>{item}</strong><p>{(activitiesByModule[normalize(item).replace(/\s+/g, "-")] || []).length} activite(s)</p></article>)}</div>
        </Section>
      )}

      {mode === "incidents" && (
        <Section title="Incidents">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><select className="rounded border p-3" value={incident.module} onChange={(e) => setIncident({ ...incident, module: e.target.value })}>{platformModules.map((item) => <option key={item}>{item}</option>)}</select><select className="rounded border p-3" value={incident.severity} onChange={(e) => setIncident({ ...incident, severity: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select><input placeholder="Titre" className="rounded border p-3" value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} /><input placeholder="Responsable email" className="rounded border p-3" value={incident.owner} onChange={(e) => setIncident({ ...incident, owner: e.target.value })} /><textarea placeholder="Description" className="rounded border p-3 md:col-span-2" value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} /></div>
          <button type="button" onClick={saveIncident} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Ouvrir l'incident</button>
          <p className="mt-3 text-sm font-bold text-slate-600">{incidents.length} incident(s).</p>
        </Section>
      )}

      {mode === "verifications" && (
        <Section title="Verifications">
          <div className="mt-4 grid gap-3 md:grid-cols-2"><input placeholder="Identifiant de l'entite" className="rounded border p-3" value={verification.entityId} onChange={(e) => setVerification({ ...verification, entityId: e.target.value })} /><select className="rounded border p-3" value={verification.type} onChange={(e) => setVerification({ ...verification, type: e.target.value })}><option>Agent</option><option>Livreur</option><option>Module</option><option>Transaction</option></select><textarea placeholder="Preuves et controles" className="rounded border p-3 md:col-span-2" value={verification.evidence} onChange={(e) => setVerification({ ...verification, evidence: e.target.value })} /><select className="rounded border p-3" value={verification.decision} onChange={(e) => setVerification({ ...verification, decision: e.target.value })}><option value="needs-review">A revoir</option><option value="verified">Verifie</option><option value="rejected">Rejete</option></select></div>
          <label className="mt-3 flex gap-2"><input type="checkbox" checked={verification.confirmed} onChange={(e) => setVerification({ ...verification, confirmed: e.target.checked })} /> Je confirme avoir examine les preuves.</label>
          <button type="button" onClick={saveVerification} className="mt-4 rounded bg-omgGreen px-5 py-3 font-bold text-white">Enregistrer la decision</button>
          <p className="mt-3 text-sm font-bold text-slate-600">{verifications.length} verification(s).</p>
        </Section>
      )}

      {(notice || reference) && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-900">{notice}{reference && <div className="mt-1 text-sm">Reference : {reference}</div>}</div>}
      <button type="button" onClick={closeModuleAction} className="rounded border border-slate-300 px-4 py-2 font-bold text-slate-700">Retour au menu</button>
    </div>
  );
}

export default AdminWorkspace;
