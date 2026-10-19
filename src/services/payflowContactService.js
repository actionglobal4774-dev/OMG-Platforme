const PAYFLOW_CONTACTS_KEY = "omg_payflow_contacts";

function readAllContacts() {
  try {
    return JSON.parse(localStorage.getItem(PAYFLOW_CONTACTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function getPayflowContactAccountKey(profile = {}) {
  return normalize(profile.email) || normalize(profile.phone) || "default-payflow-account";
}

export function getPayflowContacts(accountKey) {
  const all = readAllContacts();
  return all[accountKey] || [];
}

export function savePayflowContact(accountKey, contact) {
  const all = readAllContacts();
  const contacts = all[accountKey] || [];
  const identity = normalize(contact.email) || normalize(contact.phone) || normalize(contact.payflowId) || normalize(contact.other);
  const existingIndex = contacts.findIndex((item) => {
    const itemIdentity = normalize(item.email) || normalize(item.phone) || normalize(item.payflowId) || normalize(item.other);
    return identity && itemIdentity === identity;
  });
  const nextContact = {
    id: existingIndex >= 0 ? contacts[existingIndex].id : `PFC-${Date.now()}`,
    name: contact.name?.trim() || "Contact Payflow",
    phone: contact.phone?.trim() || "",
    email: contact.email?.trim() || "",
    payflowId: contact.payflowId?.trim() || "",
    other: contact.other?.trim() || "",
    updatedAt: new Date().toISOString()
  };
  const nextContacts = existingIndex >= 0
    ? contacts.map((item, index) => (index === existingIndex ? nextContact : item))
    : [nextContact, ...contacts];

  try {
    localStorage.setItem(PAYFLOW_CONTACTS_KEY, JSON.stringify({
      ...all,
      [accountKey]: nextContacts
    }));
  } catch {
    // La sauvegarde locale des contacts ne doit jamais casser la navigation.
  }

  return {
    contact: nextContact,
    contacts: nextContacts
  };
}
