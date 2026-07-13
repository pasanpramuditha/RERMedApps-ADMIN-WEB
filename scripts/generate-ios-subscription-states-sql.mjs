import fs from 'node:fs';
import path from 'node:path';

const [inputPath, outputPathArg] = process.argv.slice(2);

if (!inputPath || !outputPathArg) {
  console.error('Usage: node scripts/generate-ios-subscription-states-sql.mjs <input.txt> <output.sql>');
  process.exit(1);
}

const outputPath = path.resolve(outputPathArg);
const reportDateMatches = [...path.basename(inputPath).matchAll(/_(\d{8})(?=_|\.|$)/g)];
const reportDateMatch = reportDateMatches.at(-1);
const snapshotDate = reportDateMatch
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

const rowsToInsert = [];

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

const addExpandedRows = (base, count, status, sourceColumn, reportRowNumber) => {
  for (let i = 1; i <= count; i += 1) {
    const syntheticId = [
      'BACKFILL',
      snapshotDate.replace(/-/g, ''),
      `R${reportRowNumber}`,
      base.appAppleId,
      base.productId,
      status,
      sourceColumn.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      i,
    ].join('_');

    rowsToInsert.push({
      ...base,
      originalTransactionId: syntheticId,
      status,
      sourceColumn,
    });
  }
};

for (const [lineIndex, line] of lines.entries()) {
  const row = line.split('\t');
  const reportRowNumber = lineIndex + 2;
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
    addExpandedRows(base, num(get(row, column)), 'active', column, reportRowNumber);
  }

  for (const column of trialColumns) {
    addExpandedRows(base, num(get(row, column)), 'trial', column, reportRowNumber);
  }

  addExpandedRows(base, num(get(row, 'Billing Retry')), 'billing_retry', 'Billing Retry', reportRowNumber);
  addExpandedRows(base, num(get(row, 'Grace Period')), 'grace_period', 'Grace Period', reportRowNumber);
}

const statements = [];
statements.push('-- Generated from Apple Subscription report');
statements.push(`-- Source: ${path.basename(inputPath)}`);
statements.push(`-- Snapshot date: ${snapshotDate}`);
statements.push(`-- Expanded rows: ${rowsToInsert.length}`);
statements.push('');
statements.push('START TRANSACTION;');
statements.push('');

for (const row of rowsToInsert) {
  const rawPayload = {
    source: 'apple_subscription_report_backfill',
    snapshotDate,
    sourceColumn: row.sourceColumn,
    country: row.country,
    customerPrice: row.customerPrice,
    customerCurrency: row.customerCurrency,
    developerProceeds: row.developerProceeds,
    proceedsCurrency: row.proceedsCurrency,
  };

  statements.push(
    `INSERT INTO ios_subscription_states (` +
      `app_apple_id, app_name, bundle_id, product_id, subscription_name, subscription_group_id, ` +
      `original_transaction_id, latest_transaction_id, duration, status, expires_at, auto_renew_status, ` +
      `environment, last_notification_type, last_subtype, raw_payload` +
    `) VALUES (` +
      [
        sqlString(row.appAppleId),
        sqlString(row.appName),
        'NULL',
        sqlString(row.productId),
        sqlString(row.subscriptionName),
        sqlString(row.subscriptionGroupId),
        sqlString(row.originalTransactionId),
        'NULL',
        sqlString(row.duration),
        sqlString(row.status),
        'NULL',
        'NULL',
        sqlString('Production'),
        sqlString('REPORT_BACKFILL'),
        sqlString(row.sourceColumn),
        jsonString(rawPayload),
      ].join(', ') +
    `) ON DUPLICATE KEY UPDATE ` +
      `app_name = VALUES(app_name), ` +
      `subscription_name = VALUES(subscription_name), ` +
      `subscription_group_id = VALUES(subscription_group_id), ` +
      `duration = VALUES(duration), ` +
      `status = VALUES(status), ` +
      `last_notification_type = VALUES(last_notification_type), ` +
      `last_subtype = VALUES(last_subtype), ` +
      `raw_payload = VALUES(raw_payload);`
  );
}

statements.push('');
statements.push('COMMIT;');
statements.push('');

fs.writeFileSync(outputPath, `${statements.join('\n')}\n`);
console.log(`Wrote ${rowsToInsert.length} rows to ${outputPath}`);
