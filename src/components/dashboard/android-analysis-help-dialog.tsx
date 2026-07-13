'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  CalendarClock,
  CircleHelp,
  Crown,
  Megaphone,
  Pencil,
  RefreshCw,
  Search,
  Send,
  TableProperties,
  UserRoundSearch,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type AndroidAnalysisHelpPage = 'platinum-users' | 'registered-users' | 'search-user' | 'android-app-promotion';

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

const helpContent: Record<AndroidAnalysisHelpPage, HelpContent> = {
  'platinum-users': {
    label: 'Platinum Help',
    ariaLabel: 'Open platinum users help',
    title: 'Platinum Users page එක භාවිතා කරන ආකාරය',
    description: 'Ranked buyers, search, purchase/app summary Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'මේ page එක Android app buyers ලා purchase count අනුව rank කරලා බලන්න භාවිතා කරන read-only analysis screen එකක්. වැඩිම apps මිලදී ගත්ත users, total purchases, unique apps සහ package breakdown මෙතැනින් හඳුනාගන්න පුළුවන්.',
    quickTips: [
      'Users/Purchases/Apps cards වලින් loaded buyer summary එක ඉක්මනින් බලන්න.',
      'Current Leader strip එක මේ list එකේ වැඩිම apps මිලදී ගත් user පෙන්වනවා.',
      'Ranked Buyers table එකේ email search, sorting, pagination භාවිතා කරලා users inspect කරන්න.',
    ],
    buttonClassName: 'border-amber-400/25 bg-amber-500/[0.12] text-amber-100 hover:bg-amber-500/[0.18] hover:text-white',
    headerClassName: 'from-amber-500/[0.16]',
    panelClassName: 'border-amber-400/15 bg-amber-500/[0.08]',
    actionLabelClassName: 'text-amber-200',
    bulletClassName: 'bg-amber-300/80',
    sections: [
      {
        title: 'Leader Summary',
        eyebrow: 'Purchase ranking',
        icon: Crown,
        iconClassName: 'border-amber-400/25 bg-amber-500/[0.14] text-amber-100',
        description: 'Header එකේ summary cards සහ Current Leader area එක purchase leaderboard එකේ high-level state පෙන්වනවා.',
        points: [
          'Users count එක ranked buyers list එකට loaded users ගණන.',
          'Purchases count එක සියලු ranked users ලගේ app purchase count එකතුව.',
          'Apps count එක users ලා මිලදීගෙන ඇති unique app/package count එක.',
          'Current Leader කියන්නේ current sort/rank අනුව top buyer email එක.',
        ],
        actions: [
          { label: 'Review Leader', detail: 'Current Leader area එකෙන් highest purchase user එක ඉක්මනින් identify කරන්න. මෙය read-only summary එකක්.' },
        ],
      },
      {
        title: 'Ranked Buyers Table',
        eyebrow: 'Search and inspect',
        icon: TableProperties,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Table එකෙන් each buyer ගේ email, purchase count, packages/apps breakdown බලනවා.',
        points: [
          'Filter by email input එක typed email text අනුව table rows filter කරනවා.',
          'Rows default ලෙස apps purchased count අනුව descending sort වෙනවා.',
          'Pagination controls වලින් buyers වැඩි නම් next/previous pages බලන්න පුළුවන්.',
          'No users found message එක search criteria match නොවූ විට පෙන්වනවා.',
        ],
        actions: [
          { label: 'Email Search', detail: 'Email value type කළාම matching buyer rows පමණක් පෙන්වන local table filter එක. Backend data update නොකරයි.' },
          { label: 'Sort Headers', detail: 'Sortable column headers click කරලා ascending/descending order මාරු කරන්න පුළුවන්.' },
        ],
      },
      {
        title: 'When To Use',
        eyebrow: 'Business context',
        icon: BadgeDollarSign,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'High-value users identify කරලා retention, promotion, support workflows වලට context ගන්න මේ page එක භාවිතා කරන්න.',
        points: [
          'Top buyers ලා future offers හෝ cross-promotion target segments ලෙස සලකා බැලිය හැක.',
          'Purchased app mix එකෙන් user interest pattern එක හඳුනාගන්න පුළුවන්.',
          'Support issue එකක් ඇත්නම් buyer priority/context ලබාගන්න මෙම rank use කරන්න පුළුවන්.',
        ],
        actions: [
          { label: 'Read Only', detail: 'මෙම page එක data modify නොකරයි. Buyer list inspect/search/sort කිරීම පමණයි.' },
        ],
      },
    ],
  },
  'registered-users': {
    label: 'Registered Help',
    ariaLabel: 'Open registered users help',
    title: 'Registered Users page එක භාවිතා කරන ආකාරය',
    description: 'Period tabs, auto-refresh, table columns, edit action Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'Registered Users page එක Android apps වල newly registered users සහ returning activity inspect කරන්න භාවිතා කරන screen එකක්. Period tabs අනුව records load කරලා language/device/version/premium state බලන්න පුළුවන්.',
    quickTips: [
      'Period tabs වලින් Today, Yesterday, Last 7 Days, This Month වගේ ranges මාරු කරනවා.',
      'Auto-refresh interval තෝරලා Start කළොත් active period එක interval එකකට වරක් reload වෙනවා.',
      'Table row එකේ pencil icon එකෙන් selected user record edit dialog එක open වෙනවා.',
    ],
    buttonClassName: 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-100 hover:bg-emerald-500/[0.18] hover:text-white',
    headerClassName: 'from-emerald-500/[0.16]',
    panelClassName: 'border-emerald-400/15 bg-emerald-500/[0.08]',
    actionLabelClassName: 'text-emerald-200',
    bulletClassName: 'bg-emerald-300/80',
    sections: [
      {
        title: 'Period Overview',
        eyebrow: 'Tabs and counts',
        icon: CalendarClock,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Tabs සහ metric cards වලින් selected period එකේ registration volume සහ return activity පෙන්වනවා.',
        points: [
          'Returning Users count එක register වෙලා පැය 24කට පසුව app නැවත open කළ users ගණන.',
          'Total Registered count එක active selected period එකේ loaded records ගණන.',
          'Active Period card එක selected tab label සහ current loaded/count value පෙන්වනවා.',
          'Tab badge එක loaded row count හෝ preloaded count value පෙන්වනවා.',
        ],
        actions: [
          { label: 'Period Tabs', detail: 'Tab එකක් click කළාම ඒ period එකට registered users load වෙනවා. කලින් load කළ tab එක නැවත click කළොත් cached rows පෙන්වයි.' },
        ],
      },
      {
        title: 'Refresh Controls',
        eyebrow: 'Manual timing',
        icon: RefreshCw,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Header action area එක auto-refresh behavior control කරනවා.',
        points: [
          'Auto-refresh dropdown එකෙන් 30 seconds, 1 minute වගේ interval එකක් තෝරනවා.',
          'Start click කළාම active tab data selected interval එකට reload වෙනවා.',
          'Stop click කළාම auto-refresh timer නවතිනවා.',
          'Interval එකක් නොතෝරා Start කළොත් warning toast එකක් පෙන්වනවා.',
        ],
        actions: [
          { label: 'Auto-refresh', detail: 'Selected period එක live monitor කරන්න interval එකක් තෝරා Start භාවිතා කරන්න.' },
          { label: 'Start / Stop', detail: 'Start timer enable කරනවා; Stop timer disable කරනවා. Backend data delete/update කිරීමක් සිදු නොවේ.' },
        ],
      },
      {
        title: 'User Records Table',
        eyebrow: 'Inspect and edit',
        icon: Users,
        iconClassName: 'border-violet-400/25 bg-violet-500/[0.14] text-violet-100',
        description: 'Table columns වලින් app, email, language, registered date, last online, device, version, premium state බලනවා.',
        points: [
          'Language සහ date columns sortable headers ලෙස භාවිතා කරන්න පුළුවන්.',
          'Premium badge එක purchase premium state පෙන්වනවා.',
          'Force Premium badge එක registration premium flag එක පෙන්වනවා.',
          'Last Online cell එකේ green marker එක returning user state indicate කරනවා.',
        ],
        actions: [
          { label: 'Edit User', detail: 'Pencil icon එක selected user record edit dialog එක open කරනවා. Save කළාම table refresh callback එක run වෙනවා.' },
          { label: 'Pagination', detail: 'Rows වැඩි නම් bottom pagination controls භාවිතා කරන්න.' },
        ],
      },
    ],
  },
  'search-user': {
    label: 'Search Help',
    ariaLabel: 'Open search user help',
    title: 'Search User page එක භාවිතා කරන ආකාරය',
    description: 'Email search, 360 profile summary, editable records Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'Search User page එක එක user email එකක් search කරලා ඒ user ගේ app penetration, device profile, purchases, active offers, feedback, registered records එකම තැනක බලන්න භාවිතා කරන investigation screen එකක්.',
    quickTips: [
      'Email input එකට exact user email එක දාලා Search click කරන්න.',
      'User profile summary panel එකෙන් paid/free, offers, feedback, apps, location, device status බලන්න.',
      'Search result records table එකේ user records edit කරන්න pencil action එක භාවිතා කරන්න.',
    ],
    buttonClassName: 'border-cyan-400/25 bg-cyan-500/[0.12] text-cyan-100 hover:bg-cyan-500/[0.18] hover:text-white',
    headerClassName: 'from-cyan-500/[0.16]',
    panelClassName: 'border-cyan-400/15 bg-cyan-500/[0.08]',
    actionLabelClassName: 'text-cyan-200',
    bulletClassName: 'bg-cyan-300/80',
    sections: [
      {
        title: 'Email Lookup',
        eyebrow: 'Search input',
        icon: Search,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Header search form එක one-user investigation එක ආරම්භ කරන primary control එක.',
        points: [
          'Email field එක required නිසා empty value එකක් search නොකරයි.',
          'Search click කළාම backend analysis call එක run වෙනවා.',
          'Searching state එක button text එකේ පෙන්වනවා.',
          'Error alert එක API/backend failure එකක් හෝ invalid result එකක් ආවොත් පෙන්වනවා.',
        ],
        actions: [
          { label: 'Search', detail: 'Typed email එකට matching registered user records සහ analysis summary backend එකෙන් load කරන action එක.' },
        ],
      },
      {
        title: '360 User Summary',
        eyebrow: 'Profile intelligence',
        icon: UserRoundSearch,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Search success වුනාම user profile summary panel එක user state එක compact tiles/cards වලින් පෙන්වනවා.',
        points: [
          'Apps summary එක user found apps count සහ app names පෙන්වනවා.',
          'Location සහ Device details user records වලින් aggregate කරලා පෙන්වනවා.',
          'Monetization tile එක paid/free state සහ purchase records summary පෙන්වනවා.',
          'Active Offers සහ Feedbacks tiles user engagement/context හඳුනාගන්න උදව් කරනවා.',
        ],
        actions: [
          { label: 'Feedback Link', detail: 'Feedbacks තියෙන user එකක tile click කළාම user-feedbacks page එක email filter සමඟ open වෙනවා.' },
        ],
      },
      {
        title: 'Editable Records',
        eyebrow: 'Table rows',
        icon: Pencil,
        iconClassName: 'border-violet-400/25 bg-violet-500/[0.14] text-violet-100',
        description: 'Search result table එක Registered Users table pattern එකම භාවිතා කරලා records inspect/edit කරන්න දෙයි.',
        points: [
          'Table එක app, email, language, registered date, last online, device, version පෙන්වනවා.',
          'Pencil action එක selected record edit dialog එක open කරනවා.',
          'Save කළාම current email search නැවත run වෙලා records refresh වෙනවා.',
          'No records නම් table empty state එක පෙන්වයි.',
        ],
        actions: [
          { label: 'Edit User', detail: 'Selected app/user record එකේ editable fields update කරන්න භාවිතා කරන action එක.' },
        ],
      },
    ],
  },
  'android-app-promotion': {
    label: 'Promotion Help',
    ariaLabel: 'Open Android app promotion help',
    title: 'Android App Promotion page එක භාවිතා කරන ආකාරය',
    description: 'Campaigns, templates, recent buyers, create promotion workflow Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'Android App Promotion page එක recent Android buyers හොයාගෙන cross-promotion campaigns create/manage කරන්න භාවිතා කරන screen එකක්. Campaign status, templates, user profile, purchased apps, promotion placement වගේ workflow මෙතැනින් handle කරනවා.',
    quickTips: [
      'Create Promotion button එකෙන් campaign wizard එක open වෙනවා; ඒ wizard එකේ වෙනම Sinhala help එකත් තියෙනවා.',
      'Templates button එකෙන් saved promotion templates preview/copy කරන්න පුළුවන්.',
      'Recent Android Purchases list එකෙන් user එක click කළාම promotion opportunities profile dialog එක open වෙනවා.',
    ],
    buttonClassName: 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-100 hover:bg-emerald-500/[0.18] hover:text-white',
    headerClassName: 'from-emerald-500/[0.16]',
    panelClassName: 'border-emerald-400/15 bg-emerald-500/[0.08]',
    actionLabelClassName: 'text-emerald-200',
    bulletClassName: 'bg-emerald-300/80',
    sections: [
      {
        title: 'Campaign Management',
        eyebrow: 'Live promotions',
        icon: Megaphone,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Active Campaigns panel එක live/past promotion campaigns monitor සහ status update කරන්න භාවිතා කරනවා.',
        points: [
          'Campaign list එක campaign id, status, reward, targeting, placement context පෙන්වනවා.',
          'Refresh button එක campaigns backend එකෙන් නැවත load කරනවා.',
          'Edit status dialog එක campaign status update කිරීමට භාවිතා කරනවා.',
          'Campaign error alert එක load/update failure එකක් ආවොත් පෙන්වනවා.',
        ],
        actions: [
          { label: 'Refresh Campaigns', detail: 'Active campaigns panel එකේ latest campaign data නැවත fetch කරන action එක.' },
          { label: 'Edit Status', detail: 'Selected campaign status වෙනස් කර save කරන action එක. Live campaign behavior වලට බලපාන්න පුළුවන්.' },
        ],
      },
      {
        title: 'Recent Buyers',
        eyebrow: 'Find targets',
        icon: Users,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Recent Android Purchases area එක promotion target candidates identify කරන්න භාවිතා කරනවා.',
        points: [
          'Today/Yesterday/Last 7 Days tabs purchase period මාරු කරනවා.',
          'Search input එක email, app, SKU අනුව buyers filter කරනවා.',
          'User row click කළාම user promotion profile dialog එක open වෙනවා.',
          'Create Promotion row action එක selected user email locked state එකෙන් wizard open කරනවා.',
        ],
        actions: [
          { label: 'Period Tabs', detail: 'Recent buyers load කරන period එක මාරු කරන action එක.' },
          { label: 'Search Buyers', detail: 'Loaded buyers list එක email/app/SKU text අනුව locally filter කරන action එක.' },
          { label: 'Create Promotion', detail: 'New campaign wizard open කරන action එක. Header button එක blank wizard; row button එක selected user email prefilled wizard.' },
        ],
      },
      {
        title: 'Templates and Sending',
        eyebrow: 'Message setup',
        icon: Send,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Templates, reward values, notification templates, placement setup campaign creation flow එකට අදාළ resources වේ.',
        points: [
          'Templates dialog එක fnd_global_promotion_template_tab templates preview/copy කරගන්න දෙයි.',
          'Create Promotion wizard එක user, target app, reward, period, notification copy, placement settings collect කරනවා.',
          'Wizard help icon එක click කළාම create flow එකේ step-by-step Sinhala help පෙන්වනවා.',
          'Campaign save කළාම live campaign record backend එකට create වෙනවා.',
        ],
        actions: [
          { label: 'Templates', detail: 'Available promotion templates inspect, preview, copy HTML කරන්න භාවිතා කරන action එක.' },
          { label: 'Wizard Help', detail: 'Create Promotion dialog ඇතුළේ help icon එකෙන් campaign creation steps වෙනම Sinhala වලින් කියවන්න පුළුවන්.' },
        ],
      },
    ],
  },
};

interface AndroidAnalysisHelpDialogProps {
  page: AndroidAnalysisHelpPage;
  className?: string;
}

export function AndroidAnalysisHelpDialog({ page, className }: AndroidAnalysisHelpDialogProps) {
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
