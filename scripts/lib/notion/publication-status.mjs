import { findProperty, propertyToPlainText } from './property-helpers.mjs';
import { slugify } from '../utils.mjs';

export const defaultStatusCandidates = ['Statut', 'Status'];

const publishedStatusSlugs = new Set([
  'publie',
  'published',
  'public',
  'publication-immediate',
  'immediate',
]);

const immediatePublicationStatusSlugs = new Set([
  'publication-immediate',
  'immediate',
]);

export function readPublicationStatus(page, candidates = defaultStatusCandidates) {
  if (!page) {
    return '';
  }

  return propertyToPlainText(findProperty(page, candidates)).trim();
}

export function isPublishedStatusValue(value) {
  if (!value) {
    return true;
  }

  return publishedStatusSlugs.has(slugify(value));
}

export function isImmediatePublicationStatusValue(value) {
  if (!value) {
    return false;
  }

  return immediatePublicationStatusSlugs.has(slugify(value));
}

export function isImmediatePublicationPage(page, candidates = defaultStatusCandidates) {
  return isImmediatePublicationStatusValue(readPublicationStatus(page, candidates));
}
