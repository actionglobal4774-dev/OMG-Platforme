import assert from "node:assert/strict";
import { modulePageInventory } from "../src/data/pageInventory.js";
import { moduleLogic } from "../src/data/moduleLogic.js";
import { getMailportActionPath, getMailportRole, getMailportSection, mailportReferenceLink, mailportSections } from "../src/modules/mailport/mailportNavigation.js";

const inventory = modulePageInventory.find((item) => item.id === "mailport");
assert.deepEqual(Object.keys(mailportSections).sort(), inventory.pages.map(([slug]) => slug).sort());
let actionsChecked = 0;
for (const [userType, actions] of Object.entries(moduleLogic.mailport.roleActions)) {
  const role = getMailportRole({ userType });
  assert.ok(role, `Profil non reconnu : ${userType}`);
  for (const action of actions) {
    const route = getMailportActionPath(action);
    assert.ok(route, `Action sans destination : ${action}`);
    const url = new URL(route, "https://example.invalid");
    const config = getMailportSection(url.pathname.split("/").at(-1), url.searchParams.get("view") || "");
    assert.ok(config?.roles.includes(role), `${userType} ne peut pas ouvrir ${action}`);
    assert.equal(config.action, action);
    actionsChecked++;
  }
}
for (const invalid of ["missing", "constructor", "__proto__"]) {
  assert.equal(getMailportSection(invalid), null);
  assert.equal(getMailportActionPath(invalid), null);
}
assert.equal(getMailportSection("tracking", "photos"), null);
assert.equal(getMailportSection("driver", "constructor"), null);
assert.equal(getMailportRole(null), null);
assert.equal(getMailportRole({ userType: "inconnu" }), null);
assert.ok(!getMailportSection("delivery").roles.includes("buyer"));
assert.ok(!getMailportSection("driver").roles.includes("owner"));
assert.ok(!getMailportSection("create-address").roles.includes("carrier"));
const reference = "MP / A&B?#é";
const link = new URL(mailportReferenceLink("claims", reference), "https://example.invalid");
assert.equal(link.pathname, "/mailport/claims");
assert.equal(link.searchParams.get("reference"), reference);
assert.equal(mailportReferenceLink("tracking", ""), "/mailport/tracking");
console.log(`Mailport : 12 sections, ${actionsChecked} actions par rôle, variantes, refus et transmission des références validés. Recette navigateur non couverte.`);
