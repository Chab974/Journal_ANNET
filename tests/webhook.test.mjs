import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeNotionSignature,
  extractPageParentIds,
  getNotionEventActionLabel,
  isRelevantNotionEvent,
  isRelevantNotionEventWithResolver,
  toDispatchMetadata,
  verifyNotionSignature,
} from '../scripts/lib/notion/webhook.mjs';

test('verifyNotionSignature accepte une charge utile signée avec le verification_token', () => {
  const rawBody = JSON.stringify({
    entity: { id: 'pub-1', type: 'page' },
    type: 'page.content_updated',
  });
  const verificationToken = 'secret_123';
  const signature = computeNotionSignature(rawBody, verificationToken);

  assert.equal(
    verifyNotionSignature({
      rawBody,
      signature,
      verificationToken,
    }),
    true,
  );
  assert.equal(
    verifyNotionSignature({
      rawBody,
      signature,
      verificationToken: 'secret_456',
    }),
    false,
  );
});

test('isRelevantNotionEvent filtre les événements éditoriaux sur les data sources pilotées', () => {
  assert.equal(
    isRelevantNotionEvent(
      {
        data: { parent: { id: 'ds-publications', type: 'data_source' } },
        entity: { id: 'page-1', type: 'page' },
        type: 'page.content_updated',
      },
      ['ds-publications'],
    ),
    true,
  );

  assert.equal(
    isRelevantNotionEvent(
      {
        data: { parent: { data_source_id: 'ds-publications', id: 'workspace-1', type: 'workspace' } },
        entity: { id: 'page-2', type: 'page' },
        type: 'page.properties_updated',
      },
      ['ds-publications'],
    ),
    true,
  );

  assert.equal(
    isRelevantNotionEvent(
      {
        data: { parent: { id: 'ds-publications', type: 'data_source' } },
        entity: { id: 'page-3', type: 'page' },
        type: 'page.deleted',
      },
      ['ds-publications'],
    ),
    true,
  );

  assert.equal(
    isRelevantNotionEvent(
      {
        data: { parent: { id: 'ds-publications', type: 'data_source' } },
        entity: { id: 'page-4', type: 'page' },
        type: 'page.undeleted',
      },
      ['ds-publications'],
    ),
    true,
  );

  assert.equal(
    isRelevantNotionEvent(
      {
        entity: { id: 'comment-1', type: 'comment' },
        type: 'comment.created',
      },
      ['ds-publications'],
    ),
    false,
  );
});

test('isRelevantNotionEventWithResolver retrouve la data source d’une page quand le payload ne la porte pas', async () => {
  const result = await isRelevantNotionEventWithResolver(
    {
      data: { parent: { id: 'workspace-1', type: 'space' } },
      entity: { id: 'page-2', type: 'page' },
      type: 'page.properties_updated',
    },
    ['ds-publications'],
    async () => ({
      id: 'page-2',
      parent: {
        data_source_id: 'ds-publications',
        type: 'data_source_id',
      },
    }),
  );

  assert.equal(result, true);
});

test('isRelevantNotionEventWithResolver ignore un page.deleted irrésolvable au lieu de lever une erreur', async () => {
  const result = await isRelevantNotionEventWithResolver(
    {
      data: { parent: { id: 'workspace-1', type: 'space' } },
      entity: { id: 'page-deleted', type: 'page' },
      type: 'page.deleted',
    },
    ['ds-publications'],
    async () => {
      throw new Error('page not found');
    },
  );

  assert.equal(result, false);
});

test('getNotionEventActionLabel catégorise les événements pour les logs', () => {
  assert.equal(getNotionEventActionLabel('page.content_updated'), 'modification');
  assert.equal(getNotionEventActionLabel('page.deleted'), 'suppression');
  assert.equal(getNotionEventActionLabel('page.undeleted'), 'restauration');
  assert.equal(getNotionEventActionLabel('page.created'), 'creation');
  assert.equal(getNotionEventActionLabel('comment.created'), 'inconnu');
});

test('toDispatchMetadata inclut le libellé d’action pour les journaux et dispatchs', () => {
  assert.deepEqual(
    toDispatchMetadata({
      entity: { id: 'page-9' },
      id: 'event-9',
      timestamp: '2026-04-05T10:00:00.000Z',
      type: 'page.deleted',
    }),
    {
      entity_id: 'page-9',
      event_action: 'suppression',
      event_id: 'event-9',
      event_timestamp: '2026-04-05T10:00:00.000Z',
      event_type: 'page.deleted',
    },
  );
});

test('extractPageParentIds récupère les identifiants de parent utiles pour le filtrage', () => {
  assert.deepEqual(
    extractPageParentIds({
      parent: {
        data_source_id: 'ds-publications',
        database_id: 'db-legacy',
        id: 'workspace-1',
        type: 'data_source_id',
      },
    }),
    ['workspace-1', 'ds-publications', 'db-legacy', 'ds-publications'],
  );
});
