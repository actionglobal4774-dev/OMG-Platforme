import assert from "node:assert/strict";
import { moduleLogic } from "../src/data/moduleLogic.js";
import { moduleActionSections, getModuleActionDestination, getSectionTask, navigationLogicId } from "../src/data/moduleNavigation.js";
const ids = process.argv.slice(2);
for (const id of ids.length ? ids : Object.keys(moduleActionSections)) {
  const logic = moduleLogic[navigationLogicId(id)];
  assert.ok(logic && moduleActionSections[id]);
  let total = 0;
  for (const [role, actions] of Object.entries(logic.roleActions)) {
    for (const action of actions) {
      const destination = getModuleActionDestination(id, action);
      assert.ok(destination, `${id}: destination absente pour ${action}`);
      const url = new URL(destination, "https://example.invalid");
      assert.equal(getSectionTask(id, url.pathname.split("/").at(-1), url.searchParams.get("task"), role), action);
      assert.equal(getSectionTask(id, "section-inexistante", action, role), "");
      total++;
    }
  }
  assert.equal(getModuleActionDestination(id, "constructor"), null);
  assert.equal(getSectionTask(id, "search", "__proto__", "inconnu"), "");
  console.log(`${id}: ${total} actions vers des sections existantes, rôle et variante contrôlés.`);
}
