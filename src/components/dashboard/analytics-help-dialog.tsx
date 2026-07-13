'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AreaChart,
  CalendarDays,
  CircleHelp,
  Database,
  ExternalLink,
  Filter,
  LayoutDashboard,
  RefreshCw,
  Settings2,
  Smartphone,
  TableProperties,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type AnalyticsHelpPage = 'home' | 'subscriptions' | 'report-overview' | 'app-install-analyzer';

type HelpAction = {
  label: string;
  detail: string;
};

type HelpSection = {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  iconClassName: string;
  description: string;
  points: string[];
  actions: HelpAction[];
};

type HelpContent = {
  label: string;
  ariaLabel: string;
  title: string;
  description: string;
  intro: string;
  quickTips: string[];
  buttonClassName: string;
  headerClassName: string;
  panelClassName: string;
  actionLabelClassName: string;
  bulletClassName: string;
  sections: HelpSection[];
};

const helpContent: Record<AnalyticsHelpPage, HelpContent> = {
  home: {
    label: 'Home Help',
    ariaLabel: 'Open home help',
    title: 'Home page එක භාවිතා කරන ආකාරය',
    description: 'Date range, dashboard cards, configure controls Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'Home page එකෙන් installs, active users, purchases, refunds, app revenue, AdMob, acquisition, revenue flow වගේ operational metrics එකම dashboard එකක බලනවා. Selected date range එක සහ Configure settings අනුව පෙන්වන cards වෙනස් වෙනවා.',
    quickTips: [
      'Date picker එකෙන් today, custom range වගේ reporting window එක තෝරනවා.',
      'Configure button එකෙන් cards show/hide, refresh interval, debug info visibility manage කරනවා.',
      'App Installs, Active Users, Purchase Events, Refund Amount, App Revenue cards click කළාම detail dialog එක open වෙනවා.',
    ],
    buttonClassName: 'border-blue-400/25 bg-blue-500/[0.12] text-blue-100 hover:bg-blue-500/[0.18] hover:text-white',
    headerClassName: 'from-blue-500/[0.16]',
    panelClassName: 'border-blue-400/15 bg-blue-500/[0.08]',
    actionLabelClassName: 'text-blue-200',
    bulletClassName: 'bg-blue-300/80',
    sections: [
      {
        title: 'Date and Scope',
        eyebrow: 'Current window',
        icon: CalendarDays,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Header controls වලින් dashboard එකේ data period එක සහ live refresh state එක හඳුනාගන්න පුළුවන්.',
        points: [
          'Live badge එක පෙන්වන්නේ selected range එක අද දිනයට match වෙද්දී.',
          'Time range මාරු කළාම visible cards/charts ඒ period එකට නැවත load වෙනවා.',
          'Refresh interval set කරලා තිබුණොත් header එකේ seconds/update state පෙන්වනවා.',
          'Net Revenue card එක visible නම් header area එකේ top-level net figure එක ලෙස පෙන්වනවා.',
        ],
        actions: [
          { label: 'Time Range', detail: 'Date range තෝරන action එක. Range වෙනස් කළාම dashboard metrics නැවත calculate/load වෙනවා.' },
          { label: 'Auto Refresh', detail: 'Configure dialog එකෙන් refresh interval set කරලා තිබුණොත් dashboard data interval එකකට වරක් refresh වෙනවා.' },
        ],
      },
      {
        title: 'Dashboard Cards',
        eyebrow: 'Metrics and details',
        icon: LayoutDashboard,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Cards වලින් selected range එකේ Android/iOS split සහ total operational state බලනවා.',
        points: [
          'App Installs card එක total installs, Android installs, iOS installs breakdown පෙන්වනවා.',
          'Active Users card එක current active subscribers/users breakdown පෙන්වනවා.',
          'Purchase Events, Refund Amount, App Revenue cards revenue/purchase activity summarize කරනවා.',
          'Active Funnel, AdMob Status, Revenue Breakdown, Referral Source, Ad Expenses, Revenue Flow, Purchase Events Log sections deeper context පෙන්වනවා.',
        ],
        actions: [
          { label: 'Clickable Stat Cards', detail: 'Card එක click කළාම related detail dialog එක open වෙනවා. එය read-only detail view එකක්; backend data වෙනස් නොකරයි.' },
          { label: 'Charts', detail: 'Charts hover/legend වලින් monthly revenue, referral, ad cost, revenue flow patterns visually compare කරන්න පුළුවන්.' },
        ],
      },
      {
        title: 'Configure View',
        eyebrow: 'Customize dashboard',
        icon: Settings2,
        iconClassName: 'border-violet-400/25 bg-violet-500/[0.14] text-violet-100',
        description: 'Configure dialog එක Home dashboard එකේ visible modules සහ refresh/debug behavior control කරන තැන.',
        points: [
          'Each card/module switch එකෙන් Home page එකේ ඒ section එක show/hide කරනවා.',
          'Refresh interval field එක set කළොත් periodic auto update enable වෙනවා.',
          'Debug info visibility on කළොත් troubleshooting details පෙන්වන්න පුළුවන්.',
          'Save කළාම settings backend/global config එකට persist වෙනවා.',
        ],
        actions: [
          { label: 'Configure', detail: 'DashboardConfigDialog එක open කරන action එක. Module visibility සහ refresh settings update කරන්න භාවිතා කරනවා.' },
          { label: 'Save Config', detail: 'Dialog එකේ save action එක complete වුනාම selected Home view preferences නැවත load වෙද්දීත් apply වෙනවා.' },
        ],
      },
    ],
  },
  subscriptions: {
    label: 'Subscription Help',
    ariaLabel: 'Open subscription help',
    title: 'Subscription page එක භාවිතා කරන ආකාරය',
    description: 'Recurring revenue, filters, status cards, row actions Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'Subscription page එක Android සහ iOS subscription records එකම unified feed එකක බලන්න භාවිතා කරන තැන. Renewal state, trials, expired/cancelled/failed/refunds, user geography, amount, activity වගේ details මෙතැනින් inspect කරන්න පුළුවන්.',
    quickTips: [
      'Date range වෙනස් කළාම subscription dashboard data selected period එකට reload වෙනවා.',
      'Status cards click කරලා Yearly, Monthly, Trials, Expired, Cancelled, Failed, Refunds filter කරන්න පුළුවන්.',
      'Android email rows වල Send Promotion සහ Send Push Notification shortcuts පෙන්වනවා.',
    ],
    buttonClassName: 'border-indigo-400/25 bg-indigo-500/[0.12] text-indigo-100 hover:bg-indigo-500/[0.18] hover:text-white',
    headerClassName: 'from-indigo-500/[0.16]',
    panelClassName: 'border-indigo-400/15 bg-indigo-500/[0.08]',
    actionLabelClassName: 'text-indigo-200',
    bulletClassName: 'bg-indigo-300/80',
    sections: [
      {
        title: 'Revenue Summary',
        eyebrow: 'MRR and period',
        icon: Wallet,
        iconClassName: 'border-indigo-400/25 bg-indigo-500/[0.14] text-indigo-100',
        description: 'Header එකෙන් selected period එකේ recurring revenue සහ load state බලනවා.',
        points: [
          'Recurring Revenue card එක selected date range එකට calculated MRR/LKR summary එක පෙන්වනවා.',
          'Loading spinner එක backend data fetch වෙමින් තියෙන state එක indicate කරනවා.',
          'Date picker එකෙන් report period එක මාරු කරනවා.',
          'Error alert එකක් පෙන්වුණොත් subscription backend load failed බව කියනවා.',
        ],
        actions: [
          { label: 'Time Range', detail: 'Subscription records සහ summary selected date range එකට reload කරන action එක.' },
        ],
      },
      {
        title: 'Filters',
        eyebrow: 'Ecosystem and status',
        icon: Filter,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Top filters සහ status cards වලින් large subscription feed එක narrow කරගන්න පුළුවන්.',
        points: [
          'Ecosystem dropdown එක Unified Feed, Apple Platform, Android Platform අතර rows filter කරනවා.',
          'Search input එක email, SKU, purchase key, status, product වගේ values වලින් rows filter කරනවා.',
          'Summary status cards click කළාම ඒ status tag එක include/exclude වෙනවා.',
          'Selected filters empty නම් all status rows පෙන්වන්න පුළුවන්.',
        ],
        actions: [
          { label: 'Ecosystem', detail: 'Platform source අනුව table rows filter කරන action එක. Backend update නොකරයි.' },
          { label: 'Search', detail: 'Typed text එකට matching subscription records පමණක් table එකේ පෙන්වන local filter එක.' },
          { label: 'Status Cards', detail: 'Yearly/Monthly/Trials/etc cards click කරලා active status filter set වෙනවා.' },
        ],
      },
      {
        title: 'Subscription Table',
        eyebrow: 'Rows and shortcuts',
        icon: TableProperties,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Table එකෙන් user, app, geography, subscription type, amount, occurrence/activity, status/action values inspect කරනවා.',
        points: [
          'App column එක app icon/platform හඳුනාගන්න භාවිතා කරනවා.',
          'User & Geography column එක user email, country/geo, language badge පෙන්වනවා.',
          'Amount column එක original currency සහ LKR amount තිබුණොත් පෙන්වනවා.',
          'Android email records වල promotion/push shortcuts user email සහ app hint සමඟ target page එකට යවනවා.',
        ],
        actions: [
          { label: 'Send Promotion', detail: 'Selected Android subscription user එක Android App Promotion page එකට prefilled context එකක් සමඟ open කරන navigation action එක.' },
          { label: 'Send Push Notification', detail: 'Selected Android user/app context එක Push Notifications page එකට යවලා message compose workflow එකට යන්න භාවිතා කරන shortcut එක.' },
        ],
      },
    ],
  },
  'report-overview': {
    label: 'Report Help',
    ariaLabel: 'Open report overview help',
    title: 'Report Overview page එක භාවිතා කරන ආකාරය',
    description: 'SQL report coverage, year filter, cron status, month cards Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'Report Overview page එක MySQL report tables වල monthly coverage monitor කරන්න භාවිතා කරන read-only screen එකක්. Android/iOS report uploads completeද, table missingද, monthly coverage percent කීයද කියලා මෙතැනින් බලන්න පුළුවන්.',
    quickTips: [
      'Year dropdown එකෙන් බලන්න ඕන financial/report year එක තෝරනවා.',
      'Coverage badges වලින් uploaded/missing reports සහ completed months summary එක බලන්න.',
      'Month card එකේ report row link icon එක click කළාම related upload/report page එකට යනවා.',
    ],
    buttonClassName: 'border-blue-400/25 bg-blue-500/[0.12] text-blue-100 hover:bg-blue-500/[0.18] hover:text-white',
    headerClassName: 'from-blue-500/[0.16]',
    panelClassName: 'border-blue-400/15 bg-blue-500/[0.08]',
    actionLabelClassName: 'text-blue-200',
    bulletClassName: 'bg-blue-300/80',
    sections: [
      {
        title: 'Coverage Summary',
        eyebrow: 'Uploaded vs missing',
        icon: Database,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Header badges වලින් selected year එකේ report coverage high-level state එක පෙන්වනවා.',
        points: [
          'Coverage percent එක uploaded reports / total expected reports ලෙස calculate වෙනවා.',
          'Reports uploaded badge එක uploaded count සහ total expected count පෙන්වනවා.',
          'Reports missing badge එක තව missing expected reports ගණන පෙන්වනවා.',
          'Months completed badge එක 100% coverage ඇති months ගණන පෙන්වනවා.',
        ],
        actions: [
          { label: 'Year Select', detail: 'Selected year එක වෙනස් කළාම ඒ year එකට report coverage backend එකෙන් load වෙනවා.' },
          { label: 'Refresh', detail: 'Current selected year එකේ report status සහ cron job history නැවත fetch කරන action එක.' },
        ],
      },
      {
        title: 'Cron and Table Health',
        eyebrow: 'Backend status',
        icon: RefreshCw,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Cron info සහ missing table alert එක report sync pipeline health understand කරන්න උපකාරී වෙනවා.',
        points: [
          'Info icon එක click කළාම cron job last run, status, saved rows, duration details popover එකේ පෙන්වනවා.',
          'Some SQL tables are missing alert එක expected source table නැතිනම් පෙන්වනවා.',
          'Cron status success/failed/never badge ලෙස last known run state පෙන්වනවා.',
          'History table missing නම් cron run tracking setup issue එකක් තිබිය හැක.',
        ],
        actions: [
          { label: 'Cron Info', detail: 'Header එකේ info icon එක report sync scripts last run evidence බලන්න භාවිතා කරන read-only popover එක.' },
        ],
      },
      {
        title: 'Month Cards',
        eyebrow: 'Per-month reports',
        icon: ExternalLink,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Each month card එක Android/Apple sections ලෙස expected reports breakdown පෙන්වනවා.',
        points: [
          'Green/check state කියන්නේ report uploaded සහ table exists දෙකම OK.',
          'Amber/dashed state කියන්නේ table exists නමුත් selected month report data missing/incomplete.',
          'Red/warning state කියන්නේ required SQL table missing වීමක් විය හැක.',
          'Report row link icon එක related report upload/view page එක selected year/month params සමඟ open කරනවා.',
        ],
        actions: [
          { label: 'Open Report Link', detail: 'Specific report source page එකට navigate කරන action එක. Data save/delete නොකරයි; report upload/view workflow එකට යාම පමණයි.' },
        ],
      },
    ],
  },
  'app-install-analyzer': {
    label: 'Install Help',
    ariaLabel: 'Open app install analyzer help',
    title: 'App Install Analyzer page එක භාවිතා කරන ආකාරය',
    description: 'Platform/app/language/date filters, Analyze action, charts Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'App Install Analyzer එකෙන් Android/iOS app installs selected period, platform, app selection, language අනුව analyze කරනවා. Trend chart එකෙන් installs time series එක බලලා acquisition changes compare කරන්න පුළුවන්.',
    quickTips: [
      'Platform select එක Android, iOS, Both අතර analysis source මාරු කරනවා.',
      'Apps selector හි කිසිම app එකක් තෝරා නැත්නම් selected platform එකේ all live apps analyze වෙනවා.',
      'Analyze click කළාම filters අනුව install rows backend එකෙන් load කර chart එක update වෙනවා.',
    ],
    buttonClassName: 'border-cyan-400/25 bg-cyan-500/[0.12] text-cyan-100 hover:bg-cyan-500/[0.18] hover:text-white',
    headerClassName: 'from-cyan-500/[0.16]',
    panelClassName: 'border-cyan-400/15 bg-cyan-500/[0.08]',
    actionLabelClassName: 'text-cyan-200',
    bulletClassName: 'bg-cyan-300/80',
    sections: [
      {
        title: 'Scope Summary',
        eyebrow: 'Header badges',
        icon: Smartphone,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Header summary cards වලින් current platform, live app count, selected range කියවන්න පුළුවන්.',
        points: [
          'Platform card එක currently selected Android/iOS/Both source එක පෙන්වනවා.',
          'Live Apps card එක selected platform එකට available live app count එක පෙන්වනවා.',
          'Range card එක selected date range label එක පෙන්වනවා.',
          'Apps registry load failure එකක් ආවොත් filter area එකේ warning message පෙන්වනවා.',
        ],
        actions: [
          { label: 'Platform Select', detail: 'Platform මාරු කළාම selected apps reset වෙලා chart data clear වෙනවා. Analyze නැවත run කළ යුතුයි.' },
        ],
      },
      {
        title: 'Filters and Analyze',
        eyebrow: 'Build query',
        icon: Filter,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Filter row එකෙන් backend install query එකට යන platform/app/language/date criteria set කරනවා.',
        points: [
          'App selector එකෙන් one or many apps තෝරාගන්න පුළුවන්.',
          'All Apps ලෙස තිබුණොත් selected platform එකේ all live apps use කරනවා.',
          'Language dropdown එක all languages හෝ specific language code එකක් තෝරනවා.',
          'Date picker එක chart period එක set කරනවා.',
        ],
        actions: [
          { label: 'Analyze', detail: 'Current filters අනුව backend install analysis call එක run කර chart/table state update කරන primary action එක.' },
          { label: 'Language Filter', detail: 'Selected app installs specific user language එකකට narrow කරන්න භාවිතා කරන filter එක.' },
        ],
      },
      {
        title: 'Charts',
        eyebrow: 'Trend and distribution',
        icon: AreaChart,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Analyze result එක chart area එකේ visual summary එකක් ලෙස පෙන්වනවා.',
        points: [
          'Install Trend chart එක date අනුව installs පෙන්වනවා.',
          'Both platform selected නම් Android සහ iOS separate series/legend ලෙස පෙන්වනවා.',
          'Total, Daily Avg, Peak cards chart data summary numbers පෙන්වනවා.',
          'Language Distribution chart එක apps/language mix deeper breakdown එකක් ලෙස පහළින් පෙන්වනවා.',
        ],
        actions: [
          { label: 'Chart Tooltip', detail: 'Chart point hover කළාම date සහ install count details බලන්න පුළුවන්.' },
          { label: 'Empty State', detail: 'Analyze කල පසු rows නැත්නම් No install data found message එක පෙන්වනවා; filters/range වෙනස් කර නැවත Analyze කරන්න.' },
        ],
      },
    ],
  },
};

interface AnalyticsHelpDialogProps {
  page: AnalyticsHelpPage;
  className?: string;
}

export function AnalyticsHelpDialog({ page, className }: AnalyticsHelpDialogProps) {
  const content = helpContent[page];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-10 w-10 shrink-0 rounded-xl p-0', content.buttonClassName, className)}
          aria-label={content.ariaLabel}
          title={content.label}
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden border-white/10 bg-card p-0 text-foreground shadow-2xl">
        <DialogHeader className={cn('border-b border-white/10 bg-gradient-to-br to-transparent px-6 py-5', content.headerClassName)}>
          <div className="flex items-start gap-3">
            <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl border', content.buttonClassName)}>
              <CircleHelp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{content.label}</p>
              <DialogTitle className="mt-1 text-lg font-black tracking-tight">{content.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5 text-muted-foreground">
                {content.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-5 md:p-6">
          <div className={cn('rounded-2xl border p-4', content.panelClassName)}>
            <p className="text-sm font-semibold leading-6 text-foreground/85">{content.intro}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {content.quickTips.map((tip) => (
                <div key={tip} className="rounded-xl border border-white/10 bg-background/45 px-3 py-2 text-xs font-bold leading-5 text-muted-foreground">
                  {tip}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {content.sections.map((section) => {
              const HelpSectionIcon = section.icon;
              return (
                <section key={section.title} className="rounded-2xl border border-white/10 bg-background/45 p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl border', section.iconClassName)}>
                      <HelpSectionIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{section.eyebrow}</p>
                      <h3 className="mt-1 text-sm font-black">{section.title}</h3>
                      <p className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">{section.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {section.points.map((point) => (
                      <div key={point} className="flex gap-2 text-xs font-semibold leading-5 text-muted-foreground">
                        <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', content.bulletClassName)} />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                    {section.actions.map((action) => (
                      <div key={`${section.title}-${action.label}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <p className={cn('text-[10px] font-black uppercase tracking-[0.14em]', content.actionLabelClassName)}>{action.label}</p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">{action.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
