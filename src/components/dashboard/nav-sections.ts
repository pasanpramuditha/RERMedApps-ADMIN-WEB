import {
  Apple,
  LayoutDashboard,
  ShoppingCart,
  MessageSquare,
  Star,
  ShieldAlert,
  Bug,
  Send,
  PictureInPicture,
  Database,
  DatabaseBackup,
  Clock,
  Wallet,
  Landmark,
  Users,
  FileUp,
  AppWindow,
  Construction,
  TrendingUp,
  TrendingDown,
  Settings,
  Sheet,
  BarChart3,
  UsersRound,
  FileCog,
  Component,
  Download,
  Newspaper,
  HandCoins,
  UserCheck,
  UserSearch,
  History,
  Banknote,
  Link2,
  AreaChart,
  Home,
  CreditCard,
  Megaphone,
  Activity,
  ReceiptText,
  createLucideIcon,
} from 'lucide-react';

const AndroidLogo = createLucideIcon('AndroidLogo', [
  ['path', { d: 'M7 10h10v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-7Z', key: 'body' }],
  ['path', { d: 'M8 10a4 4 0 0 1 8 0', key: 'head' }],
  ['path', { d: 'M9 4 7.5 2.5', key: 'left-antenna' }],
  ['path', { d: 'M15 4 16.5 2.5', key: 'right-antenna' }],
  ['path', { d: 'M5 11v5', key: 'left-arm' }],
  ['path', { d: 'M19 11v5', key: 'right-arm' }],
  ['path', { d: 'M10 8h.01', key: 'left-eye' }],
  ['path', { d: 'M14 8h.01', key: 'right-eye' }],
]);

export function getNavVisibilityKey(item: { label: string; visibilityKey?: string }) {
  return item.visibilityKey || item.label;
}

export const navSections = [
  {
    title: "Analytics",
    icon: BarChart3,
    items: [
      { href: '/home', icon: Home, label: 'Home' },
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/subscriptions', icon: CreditCard, label: 'Subscription' },
      { href: '/report-overview', icon: Sheet, label: 'Report Overview' },
      { href: '/app-install-analyzer', icon: AreaChart, label: 'App Install Analyzer' },
      { href: '/app-trend-telemetry', icon: Activity, label: 'Trend Analysis' },
    ]
  },
  {
    title: "Android App Analysis",
    icon: Component,
    items: [
      { href: '/top-users', icon: UserCheck, label: 'Platinum Users' },
      { href: '/registered-user', icon: UserSearch, label: 'Registered Users' },
      { href: '/search-user', icon: UserSearch, label: 'Search User' },
      { href: '/purchased-users', icon: ShoppingCart, label: 'App Purchases' },
      { href: '/android-app-promotion', icon: Megaphone, label: 'Android App Promotion' },
    ]
  },
  {
    title: "App Management",
    icon: Component,
    items: [
      { href: '/admob-ads', icon: PictureInPicture, label: 'AdMob Ads' },
      { href: '/android-app-settings', icon: AndroidLogo, label: 'Android App Settings' },
      { href: '/ios-app-settings', icon: Apple, label: 'iOS App Settings' },
      { href: '/in-app-ads', icon: PictureInPicture, label: 'In-App Ads' },
    ]
  },
  {
    title: "User Engagement",
    icon: UsersRound,
    items: [
      { href: '/user-feedbacks', icon: MessageSquare, label: 'User Feedbacks' },
      { href: '/push-notifications', icon: Send, label: 'Push Notifications' },
    ]
  },
  {
    title: "Financials",
    icon: Wallet,
    items: [
      { href: '/finance-hub', icon: LayoutDashboard, label: 'Finance Hub' },
      { href: '/other-income', icon: TrendingUp, label: 'Other Income' },
      { href: '/received-payments', icon: HandCoins, label: 'Received Payments' },
      { href: '/other-expenses', icon: TrendingDown, label: 'Expense Tracker' },
      { href: '/employee-payments', icon: HandCoins, label: 'Business Payouts' },
      { href: '/wealth-tracker', icon: Landmark, label: 'Wealth Tracker' },
      { href: '/tax-returns', icon: ReceiptText, label: 'Tax Returns', visibilityKey: 'Tax Workspace' },
      { href: '/bank-statements', icon: Banknote, label: 'Bank Statements' },
      { href: '/pfc-account-statement', icon: Banknote, label: 'PFC Account Statement' },
      { href: '/savings-account-statement', icon: Banknote, label: 'MM Account Statement' },
    ]
  },
  {
    title: "Report Uploads",
    icon: FileUp,
    items: [
      { href: '/google-play-reports', icon: Sheet, label: 'Android Sales Report' },
      { href: '/installation-reports', icon: Download, label: 'Android Install Reports' },
      { href: '/android-subscription-reports', icon: Newspaper, label: 'Android Subscription Reports' },
      { href: '/apple-sales-reports', icon: FileUp, label: 'Apple Sales Reports' },
      { href: '/apple-install-reports', icon: Download, label: 'Apple Install Reports' },
      { href: '/apple-subscription-reports', icon: Newspaper, label: 'Apple Subscription Reports' },
    ]
  },
  {
    title: "Management",
    icon: FileCog,
    items: [
      { href: '/apps', icon: AppWindow, label: 'Apps' },
      { href: '/user-control', icon: Users, label: 'User Control' },
      { href: '/common-links', icon: Link2, label: 'Common Links' },
      { href: '/activity-log', icon: History, label: 'Activity Log' },
      { href: '/settings', icon: Settings, label: 'Settings' },
    ]
  },
  {
    title: "Coming Soon",
    icon: Construction,
    isAccordion: true,
    items: [
      { href: '/user-reviews', icon: Star, label: 'User Reviews' },
      { href: '/fraud-activity', icon: ShieldAlert, label: 'Fraud Activity' },
      { href: '/crash-analysis', icon: Bug, label: 'Crash Analysis' },
      { href: '/user-database', icon: Database, label: 'User Database' },
      { href: '/backups', icon: DatabaseBackup, label: 'Backups' },
      { href: '/reminders', icon: Clock, label: 'Reminders' },
    ]
  }
];
