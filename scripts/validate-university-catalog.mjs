import {
  getSubjectsForFaculties,
  getUniversityCatalogStats,
  universityCatalog
} from "../src/data/universityCatalogCore.js";

const requiredPrograms = [
  "medicine_health",
  "engineering_science",
  "law_social_admin",
  "business_economics",
  "education_humanities",
  "agriculture_environment",
  "arts_design_media"
];

const failures = [];

for (const country of universityCatalog.countries) {
  const programs = new Set();
  const facultyIds = [];

  for (const faculty of country.faculties || []) {
    facultyIds.push(faculty.id);
    for (const programId of faculty.programs || []) {
      programs.add(programId);
    }
  }

  const missingPrograms = requiredPrograms.filter((programId) => !programs.has(programId));
  if (missingPrograms.length) {
    failures.push(`${country.code} missing programs: ${missingPrograms.join(", ")}`);
  }

  const subjects = getSubjectsForFaculties(country.code, facultyIds);
  if (subjects.length < 15) {
    failures.push(`${country.code} has only ${subjects.length} admission subjects`);
  }
}

const stats = getUniversityCatalogStats();
if (stats.countries < 1 || stats.faculties < stats.countries * requiredPrograms.length) {
  failures.push(`Catalog stats incomplete: ${JSON.stringify(stats)}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `OK: University catalog complete for ${stats.countries} countries, ${stats.faculties} faculties/tracks, ${stats.subjects} subjects and ${stats.chapters} chapters.`
);
