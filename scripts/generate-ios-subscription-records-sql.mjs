import fs from 'node:fs';
import path from 'node:path';

const [inputPath, outputPathArg] = process.argv.slice(2);

if (!inputPath || !outputPathArg) {
  console.error('Usage: node scripts/generate-ios-subscription-records-sql.mjs <input.txt> <output.sql>');
  process.exit(1);
}

const outputPath = path.resolve(outputPathArg);
const reportDateMatches = [...path.basename(inputPath).matchAll(/_(\d{8})(?=_|\.|$)/g)];
const reportDateMatch = reportDateMatches.at(-1);
const reportDate = reportDateMatch
  ? `${reportDateMatch[1].slice(0, 4)}-${reportDateMatch[1].slice(4, 6)}-${reportDateMatch[1].slice(6, 8)}`
  : new Date().toISOString().slice(0, 10);

const text = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = lines.shift().split('\t');

const idx = Object.fromEntries(headers.map((header, index) => [header, index]));
const get = (row, key) => row[idx[key]]?.trim() || '';
const num = (value) => {
  const parsed = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const sqlString = (value) => {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
};

const jsonString = (value) => sqlString(JSON.stringify(value));

const durationOf = (duration) => {
  const normalized = duration.toLowerCase();
  if (normalized.includes('month')) return 'monthly';
  if (normalized.includes('year')) return 'yearly';
  return 'unknown';
};

const activeColumns = [
  'Active Standard Price Subscriptions',
  'Active Pay Up Front Introductory Offer Subscriptions',
  'Active Pay As You Go Introductory Offer Subscriptions',
  'Pay Up Front Promotional Offer Subscriptions',
  'Pay As You Go Promotional Offer Subscriptions',
  'Pay Up Front Offer Code Subscriptions',
  'Pay As You Go Offer Code Subscriptions',
  'Pay Up Front Win-back Offers',
  'Pay As You Go Win-back Offers',
];

const trialColumns = [
  'Active Free Trial Introductory Offer Subscriptions',
  'Free Trial Promotional Offer Subscriptions',
  'Free Trial Offer Code Subscriptions',
  'Free Trial Win-back Offers',
];

const aggregateMap = new Map();

const addAggregate = (base, count, status, sourceColumn, rawRow) => {
  if (!count) return;

  const key = [
    reportDate,
    base.appAppleId,
    base.productId,
    base.duration,
    status,
    base.country || '',
    sourceColumn,
  ].join('|');

  const existing = aggregateMap.get(key);
  if (existing) {
    existing.subscriptionCount += count;
    return;
  }

  aggregateMap.set(key, {
    ...base,
    status,
    sourceColumn,
    subscriptionCount: count,
    rawPayload: {
      source: 'apple_subscriber_report',
      reportDate,
      sourceColumn,
      country: base.country,
      customerPrice: base.customerPrice,
      customerCurrency: base.customerCurrency,
      developerProceeds: base.developerProceeds,
      proceedsCurrency: base.proceedsCurrency,
      rawRow,
    },
  });
};

for (const line of lines) {
  const row = line.split('\t');
  const rawRow = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));
  const base = {
    appAppleId: get(row, 'App Apple ID'),
    appName: get(row, 'App Name'),
    productId: get(row, 'Subscription Apple ID'),
    subscriptionName: get(row, 'Subscription Name'),
    subscriptionGroupId: get(row, 'Subscription Group ID'),
    duration: durationOf(get(row, 'Standard Subscription Duration')),
    country: get(row, 'Country'),
    customerPrice: get(row, 'Customer Price'),
    customerCurrency: get(row, 'Customer Currency'),
    developerProceeds: get(row, 'Developer Proceeds'),
    proceedsCurrency: get(row, 'Proceeds Currency'),
  };

  if (!base.appAppleId || !base.productId) continue;

  for (const column of activeColumns) {
    addAggregate(base, num(get(row, column)), 'active', column, rawRow);
  }

  for (const column of trialColumns) {
    addAggregate(base, num(get(row, column)), 'trial', column, rawRow);
  }

  addAggregate(base, num(get(row, 'Billing Retry')), 'billing_retry', 'Billing Retry', rawRow);
  addAggregate(base, num(get(row, 'Grace Period')), 'grace_period', 'Grace Period', rawRow);
}

const rows = [...aggregateMap.values()];
const statements = [];

statements.push('-- Generated from Apple Subscriber Report');
statements.push(`-- Source: ${path.basename(inputPath)}`);
statements.push(`-- Report date: ${reportDate}`);
statements.push(`-- Aggregate rows: ${rows.length}`);
statements.push('');
statements.push('START TRANSACTION;');
statements.push('');

for (const row of rows) {
  statements.push(
    `INSERT INTO ios_subscription_records (` +
      `record_type, source, report_date, source_column, app_apple_id, app_name, bundle_id, ` +
      `product_id, subscription_name, subscription_group_id, duration, status, subscription_count, country, ` +
      `original_transaction_id, latest_transaction_id, expires_at, auto_renew_status, environment, ` +
      `last_notification_type, last_subtype, raw_payload` +
    `) VALUES (` +
      [
        sqlString('aggregate_snapshot'),
        sqlString('subscriber_report'),
        sqlString(reportDate),
        sqlString(row.sourceColumn),
        sqlString(row.appAppleId),
        sqlString(row.appName),
        'NULL',
        sqlString(row.productId),
        sqlString(row.subscriptionName),
        sqlString(row.subscriptionGroupId),
        sqlString(row.duration),
        sqlString(row.status),
        String(row.subscriptionCount),
        sqlString(row.country),
        'NULL',
        'NULL',
        'NULL',
        'NULL',
        sqlString('Production'),
        sqlString('REPORT_IMPORT'),
        sqlString(row.sourceColumn),
        jsonString(row.rawPayload),
      ].join(', ') +
    `) ON DUPLICATE KEY UPDATE ` +
      `app_name = VALUES(app_name), ` +
      `subscription_name = VALUES(subscription_name), ` +
      `subscription_group_id = VALUES(subscription_group_id), ` +
      `subscription_count = VALUES(subscription_count), ` +
      `last_notification_type = VALUES(last_notification_type), ` +
      `last_subtype = VALUES(last_subtype), ` +
      `raw_payload = VALUES(raw_payload);`
  );
}

statements.push('');
statements.push('COMMIT;');
statements.push('');

fs.writeFileSync(outputPath, `${statements.join('\n')}\n`);
console.log(`Wrote ${rows.length} aggregate rows to ${outputPath}`);
