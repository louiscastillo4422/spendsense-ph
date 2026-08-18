// ---------------------------------------------------------------------------
// Realistic but ENTIRELY FICTIONAL sample data. No real account numbers.
// Anchored around the prototype "today" of 2026-08-03 (Asia/Manila).
// ---------------------------------------------------------------------------

import type { AppState } from '../types'

// Manila-local ISO helper (+08:00, no DST).
const t = (s: string) => new Date(`${s}+08:00`).toISOString()

export function makeSeedState(): AppState {
  return {
    version: 1,
    accounts: {
      bpi: { id: 'bpi', name: 'BPI', startingBalance: 8500, reconciledAt: t('2026-07-25T20:00') },
      gcash: { id: 'gcash', name: 'GCash', startingBalance: 3200, reconciledAt: t('2026-07-25T20:00') },
    },
    transactions: [
      {
        id: 'tx-salary',
        account: 'bpi',
        direction: 'in',
        amount: 32000,
        category: 'salary',
        timestamp: t('2026-07-30T09:02'),
        counterparty: 'ACME PAYROLL',
        reference: 'PR26073001',
        confidence: 0.97,
        rawMessage:
          'BPI: Your payroll credit of PHP 32,000.00 has been posted to your account ending 4821 on Jul 30, 2026 9:02AM. Ref PR26073001. Available balance PHP 40,500.00.',
        balanceReported: 40500,
        source: 'seed',
      },
      {
        id: 'tx-jollibee',
        account: 'gcash',
        direction: 'out',
        amount: 480,
        category: 'food',
        timestamp: t('2026-08-01T12:30'),
        counterparty: 'Jollibee',
        reference: 'GC80112AA',
        confidence: 0.93,
        rawMessage:
          'GCash: You paid PHP 480.00 to Jollibee on Aug 01, 2026 12:30PM. Ref No. GC80112AA. New balance PHP 4,720.00.',
        balanceReported: 4720,
        source: 'seed',
      },
      {
        id: 'tx-debit',
        account: 'bpi',
        direction: 'out',
        amount: 1250,
        category: 'food',
        timestamp: t('2026-08-02T19:10'),
        counterparty: 'S&R Grocery',
        reference: 'DC26080219',
        confidence: 0.9,
        rawMessage:
          'BPI: Your card ending 4821 was used for PHP 1,250.00 at S&R Grocery on Aug 02, 2026 7:10PM. Ref DC26080219.',
        source: 'seed',
      },
      {
        id: 'tx-transfer-out',
        account: 'bpi',
        direction: 'out',
        amount: 2000,
        category: 'transfer',
        timestamp: t('2026-08-02T08:00'),
        counterparty: 'GCash (own)',
        reference: 'INSTA20260802',
        confidence: 0.88,
        isTransfer: true,
        transferGroupId: 'tg-1',
        rawMessage:
          'BPI: You sent PHP 2,000.00 via InstaPay to GCash account ending 7788 on Aug 02, 2026 8:00AM. Ref INSTA20260802.',
        source: 'seed',
      },
      {
        id: 'tx-transfer-in',
        account: 'gcash',
        direction: 'in',
        amount: 2000,
        category: 'transfer',
        timestamp: t('2026-08-02T08:01'),
        counterparty: 'BPI (own)',
        reference: 'INSTA20260802',
        confidence: 0.88,
        isTransfer: true,
        transferGroupId: 'tg-1',
        rawMessage:
          'GCash: You received PHP 2,000.00 via InstaPay from BPI on Aug 02, 2026 8:01AM. Ref INSTA20260802. New balance PHP 6,720.00.',
        balanceReported: 6720,
        source: 'seed',
      },
      {
        id: 'tx-transfer-fee',
        account: 'bpi',
        direction: 'fee',
        amount: 25,
        category: 'fee',
        timestamp: t('2026-08-02T08:00'),
        counterparty: 'InstaPay fee',
        confidence: 0.9,
        rawMessage: 'BPI: A service fee of PHP 25.00 was charged for your InstaPay transfer on Aug 02, 2026.',
        source: 'seed',
      },
      {
        id: 'tx-spotify',
        account: 'gcash',
        direction: 'out',
        amount: 149,
        category: 'subscriptions',
        timestamp: t('2026-07-31T06:00'),
        counterparty: 'Spotify',
        reference: 'SUB073101',
        confidence: 0.95,
        rawMessage:
          'GCash: Your subscription payment of PHP 149.00 to Spotify was successful on Jul 31, 2026 6:00AM. Ref SUB073101.',
        source: 'seed',
      },
      {
        id: 'tx-refund',
        account: 'gcash',
        direction: 'in',
        amount: 500,
        category: 'other',
        timestamp: t('2026-08-02T16:20'),
        counterparty: 'Shopee Refund',
        reference: 'RF080201',
        confidence: 0.82,
        rawMessage:
          'GCash: You received PHP 500.00 refund from Shopee on Aug 02, 2026 4:20PM. Ref RF080201.',
        source: 'seed',
      },
      {
        id: 'tx-unknown',
        account: 'bpi',
        direction: 'out',
        amount: 300,
        category: 'other',
        timestamp: t('2026-08-02T15:20'),
        confidence: 0.34,
        needsReview: true,
        rawMessage:
          'BPI ALERT: Txn PHP 300.00 processed 08/02 3:20PM acct ***. Msg truncated... reply if not you.',
        source: 'seed',
      },
    ],
    bills: [
      { id: 'bill-rent', name: 'Rent', amount: 6500, dueDay: 5, account: 'bpi', category: 'bills' },
      { id: 'bill-water', name: 'Maynilad (water)', amount: 420, dueDay: 10, category: 'bills' },
      { id: 'bill-meralco', name: 'Meralco (electric)', amount: 1850, dueDay: 12, category: 'bills' },
      { id: 'bill-globe', name: 'Globe postpaid', amount: 1299, dueDay: 20, category: 'bills' },
    ],
    goals: [
      {
        id: 'goal-emergency',
        name: 'Emergency fund',
        emoji: '🛟',
        target: 30000,
        saved: 12000,
        priority: 'high',
        frequency: 'monthly',
        contributionType: 'fixed',
        contributionValue: 2000,
        isEmergency: true,
      },
      {
        id: 'goal-japan',
        name: 'Japan trip',
        emoji: '🗾',
        target: 80000,
        saved: 18000,
        targetDate: t('2027-03-01T00:00'),
        priority: 'medium',
        frequency: 'monthly',
        contributionType: 'fixed',
        contributionValue: 5000,
      },
      {
        id: 'goal-phone',
        name: 'New phone',
        emoji: '📱',
        target: 55000,
        saved: 9000,
        targetDate: t('2026-12-01T00:00'),
        priority: 'low',
        frequency: 'monthly',
        contributionType: 'fixed',
        contributionValue: 3000,
      },
      {
        id: 'goal-cards',
        name: 'Card-collecting budget',
        emoji: '🃏',
        target: 6000,
        saved: 1500,
        priority: 'low',
        frequency: 'monthly',
        contributionType: 'percent',
        contributionValue: 5,
      },
    ],
    settings: {
      onboarded: false,
      theme: 'system',
      income: { amount: 32000, nextDate: t('2026-08-15T09:00'), frequency: 'semimonthly' },
      emergencyBuffer: 5000,
      minProtectedBalance: 3000,
      safetyBuffer: 1000,
      transferWindowMinutes: 15,
      transferAmountTolerance: 50,
      rollover: 'carry',
      moneyInRules: [
        { id: 'rule-salary', label: 'Save 30% of salary deposits', appliesTo: 'salary', percent: 30, minAmount: 0, enabled: true },
        { id: 'rule-other', label: 'Save 10% of other money-in above ₱2,000', appliesTo: 'other', percent: 10, minAmount: 2000, enabled: true },
      ],
      categoryLimits: [
        { category: 'food', limit: 6000, period: 'monthly' },
        { category: 'shopping', limit: 4000, period: 'monthly' },
        { category: 'transport', limit: 2500, period: 'monthly' },
        { category: 'subscriptions', limit: 1000, period: 'monthly' },
      ],
      faceIdLock: false,
      notificationPrivacy: 'full',
      maskAccountNumbers: true,
    },
    parseRules: [
      { id: 'pr-jollibee', label: 'Jollibee → Food', account: 'any', match: 'jollibee', category: 'food', enabled: true },
      { id: 'pr-spotify', label: 'Spotify → Subscriptions', account: 'any', match: 'spotify', category: 'subscriptions', enabled: true },
      { id: 'pr-payroll', label: 'Payroll → Salary', account: 'bpi', match: 'payroll', category: 'salary', enabled: true },
    ],
    automation: {
      bpiConnected: false,
      gcashConnected: false,
    },
  }
}

// Synthetic messages for the Test SMS Lab. All fictional; no real numbers.
// The "real format" samples mirror the actual SMS templates BPI and GCash
// send today (amount style, date style, ref style) with made-up values.
export const SAMPLE_MESSAGES: { label: string; text: string }[] = [
  {
    label: 'BPI to GCash transfer (real format)',
    text: 'BPI: You have transferred PHP 5000 to GCash/G-Xchange on Aug 15 2026; 10:14:47 PM (GMT +8).',
  },
  {
    label: 'BPI deducted + fee (real format)',
    text: 'BPI: Your BPI account was deducted P5,000.00 plus a P12.00 fee on August 15, 2026 10:14:50 PM for DRAGONPAY CORP. Not your transaction? Change your BPI online password and please call our BPI Contact Center to report.',
  },
  {
    label: 'GCash paid a store (real format)',
    text: 'You have paid P1,384.50 GCash to DIN TAI FUN on 08-14-26 08:24:38 PM. Your new balance is P13,977.90. Ref. No. 9000012345678',
  },
  {
    label: 'GCash received money (real format)',
    text: 'You received P4,289.00 from JUAN D. w/ MSG - . New balance is P8,666.90 08-15-26 12:41 AM. Ref no. 9043900011122',
  },
  {
    label: 'GCash online payment (real format)',
    text: 'Your payment of P358.00 to Lazada PH has been successfully processed on 08-15-26 11:37:43 AM. Ref. No. 990440000',
  },
  {
    label: 'BPI salary credited',
    text: 'BPI: Your payroll credit of PHP 32,000.00 has been posted to your account ending 4821 on Aug 15, 2026 9:00 AM. Ref PR26081501. Available balance PHP 41,000.00.',
  },
  {
    label: 'BPI debit card purchase',
    text: 'BPI: Your card ending 4821 was used for PHP 899.00 at Uniqlo SM Aura on Aug 03, 2026 5:40 PM. Ref DC26080317.',
  },
  {
    label: 'Ambiguous / low confidence',
    text: 'ALERT: PHP 250 txn 08/03 acct ***. Reply if not you.',
  },
]
