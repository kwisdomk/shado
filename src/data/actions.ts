import type { ActionCode } from '../lib/schema';

import type { OfficialSourceId } from './source-registry';

export type ActionDefinition = {
  code: ActionCode;
  label: string;
  description: string;
  swahiliLabel: string | null;
  sourceRegistryId: OfficialSourceId | null;
  reviewedAt: string;
};

const actionsCatalogue = {
  DO_NOT_CLICK: {
    code: 'DO_NOT_CLICK',
    label: 'Do not open the link',
    description: 'Leave unexpected links unopened and verify the message another way.',
    swahiliLabel: null,
    sourceRegistryId: null,
    reviewedAt: '2026-07-19',
  },
  DO_NOT_REPLY: {
    code: 'DO_NOT_REPLY',
    label: 'Do not reply',
    description: 'Do not continue the conversation or confirm that your number is active.',
    swahiliLabel: null,
    sourceRegistryId: null,
    reviewedAt: '2026-07-19',
  },
  DO_NOT_SEND_MONEY: {
    code: 'DO_NOT_SEND_MONEY',
    label: 'Do not send money',
    description: 'Do not make a manual repayment, fee, or transfer requested in the message.',
    swahiliLabel: null,
    sourceRegistryId: null,
    reviewedAt: '2026-07-19',
  },
  DO_NOT_SHARE_CREDENTIALS: {
    code: 'DO_NOT_SHARE_CREDENTIALS',
    label: 'Do not share security credentials',
    description: 'Keep PINs, passwords, passcodes, OTPs, and verification codes private.',
    swahiliLabel: null,
    sourceRegistryId: null,
    reviewedAt: '2026-07-19',
  },
  VERIFY_IN_OFFICIAL_APP: {
    code: 'VERIFY_IN_OFFICIAL_APP',
    label: 'Verify in the official app',
    description: 'Open the official M-PESA app yourself and verify the transaction there.',
    swahiliLabel: null,
    sourceRegistryId: 'safaricom-mpesa-reversal',
    reviewedAt: '2026-07-19',
  },
  CONTACT_OFFICIAL_CHANNEL_INDEPENDENTLY: {
    code: 'CONTACT_OFFICIAL_CHANNEL_INDEPENDENTLY',
    label: 'Contact the organisation independently',
    description: 'Use an official channel you find independently, not contact details supplied by the sender.',
    swahiliLabel: null,
    sourceRegistryId: 'safaricom-fraud-awareness',
    reviewedAt: '2026-07-19',
  },
  PRESERVE_MESSAGE: {
    code: 'PRESERVE_MESSAGE',
    label: 'Preserve the message',
    description: 'Keep the original message and related transaction records for reporting.',
    swahiliLabel: null,
    sourceRegistryId: null,
    reviewedAt: '2026-07-19',
  },
  BLOCK_SENDER_IF_APPROPRIATE: {
    code: 'BLOCK_SENDER_IF_APPROPRIATE',
    label: 'Block the sender if appropriate',
    description: 'After preserving evidence, block the sender if the contact is not legitimate.',
    swahiliLabel: null,
    sourceRegistryId: null,
    reviewedAt: '2026-07-19',
  },
  REPORT_TO_RELEVANT_AUTHORITY: {
    code: 'REPORT_TO_RELEVANT_AUTHORITY',
    label: 'Report through the relevant official channel',
    description: 'Report suspected fraud to the organisation or authority involved using a channel you verify independently.',
    swahiliLabel: null,
    sourceRegistryId: null,
    reviewedAt: '2026-07-19',
  },
} satisfies Record<ActionCode, ActionDefinition>;

for (const action of Object.values(actionsCatalogue)) {
  Object.freeze(action);
}

export const ACTIONS_CATALOGUE = Object.freeze(actionsCatalogue);
