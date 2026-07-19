import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  ACTIONS_CATALOGUE,
  type ActionDefinition,
} from '../../data/actions';
import {
  OFFICIAL_SOURCE_TYPES,
  SOURCE_REGISTRY,
  type OfficialSource,
} from '../../data/source-registry';
import { ActionCodeSchema } from '../schema';

const REQUIRED_SOURCE_IDS = [
  'safaricom-fraud-awareness',
  'safaricom-fake-reversal',
  'safaricom-mpesa-reversal',
  'kra-impersonation',
  'kra-mservices',
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

describe('official source registry', () => {
  it('contains the five required reviewed official sources', () => {
    expect(Object.keys(SOURCE_REGISTRY)).toEqual(REQUIRED_SOURCE_IDS);
    expect(Object.isFrozen(SOURCE_REGISTRY)).toBe(true);
    expect(
      Object.values(SOURCE_REGISTRY).every((source) => Object.isFrozen(source)),
    ).toBe(true);
  });

  it('keeps source types frozen and complete', () => {
    expect(OFFICIAL_SOURCE_TYPES).toEqual([
      'fraud_awareness',
      'public_notice',
      'official_channel',
      'advisory',
    ]);
    expect(Object.isFrozen(OFFICIAL_SOURCE_TYPES)).toBe(true);
  });

  it('has valid official URLs, dates, and non-empty required fields', () => {
    for (const source of Object.values(SOURCE_REGISTRY)) {
      expect(source.id).not.toHaveLength(0);
      expect(source.organization).not.toHaveLength(0);
      expect(source.name).not.toHaveLength(0);
      expect(source.notes).not.toHaveLength(0);
      expect(source.url).toMatch(/^https:\/\/(?:www\.)?(?:safaricom\.co\.ke|kra\.go\.ke)\//u);
      expect(source.retrievedAt).toMatch(ISO_DATE);
      expect(source.reviewedAt).toMatch(ISO_DATE);
      expect(Number.isNaN(Date.parse(source.retrievedAt))).toBe(false);
      expect(Number.isNaN(Date.parse(source.reviewedAt))).toBe(false);
      expect(OFFICIAL_SOURCE_TYPES).toContain(source.type);
    }
  });

  it('keeps fraud reporting, M-PESA reversal, and KRA verification distinct', () => {
    expect(SOURCE_REGISTRY['safaricom-fraud-awareness'].notes).toContain('333');
    expect(SOURCE_REGISTRY['safaricom-mpesa-reversal'].notes).toContain('456');
    expect(SOURCE_REGISTRY['kra-mservices'].notes).toContain('*572#');
  });

  it('infers the approved OfficialSource type', () => {
    expectTypeOf(SOURCE_REGISTRY['kra-mservices']).toMatchTypeOf<OfficialSource>();
  });
});

describe('action catalogue', () => {
  it('contains exactly all nine frozen action codes', () => {
    expect(Object.keys(ACTIONS_CATALOGUE)).toEqual(ActionCodeSchema.options);
    expect(Object.isFrozen(ACTIONS_CATALOGUE)).toBe(true);
    expect(
      Object.values(ACTIONS_CATALOGUE).every((action) => Object.isFrozen(action)),
    ).toBe(true);
  });

  it('has reviewed, complete English content with no generated Swahili labels', () => {
    for (const [code, action] of Object.entries(ACTIONS_CATALOGUE)) {
      expect(ActionCodeSchema.safeParse(code).success).toBe(true);
      expect(action.code).toBe(code);
      expect(action.label).not.toHaveLength(0);
      expect(action.description).not.toHaveLength(0);
      expect(action.swahiliLabel).toBeNull();
      expect(action.reviewedAt).toMatch(ISO_DATE);
    }
  });

  it('links official-channel actions only to registry entries', () => {
    for (const action of Object.values(ACTIONS_CATALOGUE)) {
      if (action.sourceRegistryId !== null) {
        expect(SOURCE_REGISTRY).toHaveProperty(action.sourceRegistryId);
      }
    }

    expect(
      ACTIONS_CATALOGUE.CONTACT_OFFICIAL_CHANNEL_INDEPENDENTLY
        .sourceRegistryId,
    ).toBe('safaricom-fraud-awareness');
    expect(ACTIONS_CATALOGUE.VERIFY_IN_OFFICIAL_APP.description).toContain(
      'M-PESA app',
    );
  });

  it('does not invent phone numbers or execute actions', () => {
    for (const action of Object.values(ACTIONS_CATALOGUE)) {
      expect(action.description).not.toMatch(/(?:\+254|0)\d{9}/u);
      expect(action).not.toHaveProperty('execute');
      expect(action).not.toHaveProperty('href');
    }
  });

  it('infers definitions through the frozen action-code record', () => {
    expectTypeOf(ACTIONS_CATALOGUE.DO_NOT_CLICK).toMatchTypeOf<ActionDefinition>();
  });
});
