export const OFFICIAL_SOURCE_TYPES = Object.freeze([
  'fraud_awareness',
  'public_notice',
  'official_channel',
  'advisory',
] as const);

export type OfficialSourceType = (typeof OFFICIAL_SOURCE_TYPES)[number];

export type OfficialSource = {
  id: string;
  organization: string;
  name: string;
  url: string;
  type: OfficialSourceType;
  retrievedAt: string;
  reviewedAt: string;
  notes: string;
};

const sourceRegistry = {
  'safaricom-fraud-awareness': {
    id: 'safaricom-fraud-awareness',
    organization: 'Safaricom',
    name: 'Fraud Awareness',
    url: 'https://www.safaricom.co.ke/fraud-awareness',
    type: 'fraud_awareness',
    retrievedAt: '2026-07-19',
    reviewedAt: '2026-07-19',
    notes: 'Safaricom fraud guidance directs customers to report fraud by SMS to 333.',
  },
  'safaricom-fake-reversal': {
    id: 'safaricom-fake-reversal',
    organization: 'Safaricom',
    name: 'Fake Reversal Instructions',
    url: 'https://www.safaricom.co.ke/fraud-awareness/m-pesa-fraud/fake-reversal-instructions',
    type: 'fraud_awareness',
    retrievedAt: '2026-07-19',
    reviewedAt: '2026-07-19',
    notes: 'Safaricom warns customers not to follow manual fake-reversal instructions.',
  },
  'safaricom-mpesa-reversal': {
    id: 'safaricom-mpesa-reversal',
    organization: 'Safaricom',
    name: 'M-PESA Reversal',
    url: 'https://www.safaricom.co.ke/main-mpesa/m-pesa-for-you/getting-started/m-pesa-reversal',
    type: 'official_channel',
    retrievedAt: '2026-07-19',
    reviewedAt: '2026-07-19',
    notes: 'Official reversal routes include forwarding the M-PESA message to 456, the M-PESA app, Zuri, or Safaricom support.',
  },
  'kra-impersonation': {
    id: 'kra-impersonation',
    organization: 'Kenya Revenue Authority',
    name: 'Fraudulent Persons Masquerading as KRA Staff',
    url: 'https://www.kra.go.ke/news-center/public-notices/1603-fraudulent-person-s-masquerading-as-kra-staff',
    type: 'public_notice',
    retrievedAt: '2026-07-19',
    reviewedAt: '2026-07-19',
    notes: 'KRA advises the public to independently verify anyone claiming to be KRA staff.',
  },
  'kra-mservices': {
    id: 'kra-mservices',
    organization: 'Kenya Revenue Authority',
    name: 'KRA M-Service',
    url: 'https://www.kra.go.ke/m-services',
    type: 'official_channel',
    retrievedAt: '2026-07-19',
    reviewedAt: '2026-07-19',
    notes: 'KRA staff verification is available through the KRA website, KRA M-Service app, and USSD *572#.',
  },
} satisfies Record<string, OfficialSource>;

for (const source of Object.values(sourceRegistry)) {
  Object.freeze(source);
}

export const SOURCE_REGISTRY = Object.freeze(sourceRegistry);

export type OfficialSourceId = keyof typeof SOURCE_REGISTRY;
