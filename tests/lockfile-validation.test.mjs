import assert from 'node:assert/strict';
import test from 'node:test';

import { assertLockfileIsValid, collectLockfileValidationIssues } from '../scripts/lib/lockfile-validation.mjs';

test('collectLockfileValidationIssues accepte un lockfile npm sécurisé', () => {
  const issues = collectLockfileValidationIssues({
    lockfileVersion: 3,
    packages: {
      '': { name: 'journal-annet', version: '1.0.0' },
      'node_modules/example': {
        version: '1.2.3',
        resolved: 'https://registry.npmjs.org/example/-/example-1.2.3.tgz',
        integrity: 'sha512-example',
      },
    },
  });

  assert.deepEqual(issues, []);
});

test('collectLockfileValidationIssues rejette un hôte, un protocole ou une intégrité invalides', () => {
  const issues = collectLockfileValidationIssues({
    lockfileVersion: 3,
    packages: {
      '': { name: 'journal-annet', version: '1.0.0' },
      'node_modules/insecure-host': {
        version: '1.0.0',
        resolved: 'https://evil.example.org/insecure-host-1.0.0.tgz',
        integrity: 'sha512-ok',
      },
      'node_modules/http-package': {
        version: '1.0.0',
        resolved: 'http://registry.npmjs.org/http-package/-/http-package-1.0.0.tgz',
        integrity: 'sha512-ok',
      },
      'node_modules/missing-integrity': {
        version: '1.0.0',
        resolved: 'https://registry.npmjs.org/missing-integrity/-/missing-integrity-1.0.0.tgz',
      },
    },
  });

  assert.equal(issues.length, 3);
  assert.match(issues[0], /hôte npm non autorisé/);
  assert.match(issues[1], /protocole interdit/);
  assert.match(issues[2], /integrity/);
});

test('assertLockfileIsValid échoue avec un message exploitable', () => {
  assert.throws(
    () => assertLockfileIsValid({
      lockfileVersion: 3,
      packages: {
        '': { name: 'journal-annet', version: '1.0.0' },
        'node_modules/example': {
          version: '1.0.0',
          resolved: 'https://packages.example.com/example-1.0.0.tgz',
        },
      },
    }),
    (error) => {
      assert.match(error.message, /Lockfile invalide/);
      assert.ok(Array.isArray(error.issues));
      assert.equal(error.issues.length, 2);
      return true;
    },
  );
});
