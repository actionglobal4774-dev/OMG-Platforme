import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import TravelWorkspace from "./TravelWorkspace";

export default function TravelDashboard() {
  const module = getModuleById("travel");
  return <ModuleDashboardTemplate module={module} compactMenu menuActions={module.actions} suppressCompactActionFooter renderCompactAction={({ selectedAction, profile, closeModuleAction }) => <TravelWorkspace selectedAction={selectedAction} profile={profile} closeModuleAction={closeModuleAction} />} />;
}
