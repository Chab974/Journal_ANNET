import { readJsonFile, fromRepo } from './lib/utils.mjs';
import { validateSnapshots } from './lib/snapshot-validation.mjs';

const [publications, agenda, menus, siteSections] = await Promise.all([
  readJsonFile(fromRepo('data', 'publications.json'), []),
  readJsonFile(fromRepo('data', 'agenda.json'), []),
  readJsonFile(fromRepo('data', 'menus.json'), []),
  readJsonFile(fromRepo('data', 'site-sections.json'), {}),
]);

const { errors, warnings } = validateSnapshots({
  agenda,
  menus,
  publications,
  siteSections,
});

for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`error: ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Validation OK: ${publications.length} publications, ${agenda.length} dates, ${menus.length} menus.`,
  );
}
