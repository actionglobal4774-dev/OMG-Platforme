import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import ModuleActionDestination from "../../components/modules/ModuleActionDestination";

const propertyMenuActions = [
  "Publier un bien",
  "Chercher un bien",
  "Favoris",
  "Paiement",
  "Accepter un paiement"
];

function PropertyDashboard() {
  return (
    <ModuleDashboardTemplate
      module={getModuleById("property")}
      compactMenu
      menuActions={propertyMenuActions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction }) => (
        <ModuleActionDestination moduleId="property" action={selectedAction} />
      )}
    />
  );
}

export default PropertyDashboard;
