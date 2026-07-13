'use client';

import type { LucideIcon } from 'lucide-react';
import {
  AppWindow,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  FileClock,
  KeyRound,
  LayoutDashboard,
  Link2,
  Pencil,
  Save,
  Search,
  Settings,
  UserCog,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ManagementHelpPage = 'apps' | 'user-control' | 'common-links' | 'activity-log' | 'settings';

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

const helpContent: Record<ManagementHelpPage, HelpContent> = {
  apps: {
    label: 'Apps Help',
    ariaLabel: 'Open apps help',
    title: 'Apps page එක භාවිතා කරන ආකාරය',
    description: 'App registry, platform availability, store links, edit workflow Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'මේ page එකෙන් admin panel එකේ තියෙන app profiles manage කරනවා. Android/iOS availability, package details, DB name, store URLs, status වගේ app-level information එකම තැනක බලන්න පුළුවන්.',
    quickTips: [
      'Add App button එකෙන් new app profile form එක open වෙනවා.',
      'Availability badges වලින් Android/iOS app එක live, pending, hidden වගේ state එක බලන්න පුළුවන්.',
      '3-dot menu එකේ Edit සහ Copy DB name actions තියෙනවා; Apps table එකේ direct delete action එකක් නැහැ.',
    ],
    buttonClassName: 'border-blue-400/25 bg-blue-500/[0.12] text-blue-100 hover:bg-blue-500/[0.18] hover:text-white',
    headerClassName: 'from-blue-500/[0.16]',
    panelClassName: 'border-blue-400/15 bg-blue-500/[0.08]',
    actionLabelClassName: 'text-blue-200',
    bulletClassName: 'bg-blue-300/80',
    sections: [
      {
        title: 'App Registry Summary',
        eyebrow: 'Header counts',
        icon: AppWindow,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Header එකේ app registry overview එක පෙන්වනවා. Total apps, Android active count, iOS active count මෙතැනින් ඉක්මනින් බලන්න පුළුවන්.',
        points: [
          'Total app(s) කියන්නේ registry එකට load වුන app family count එක.',
          'Android Active apps count එක Android row තියෙන, hidden/skip නොවෙන apps ගණන.',
          'iOS Active apps count එක iOS row තියෙන, hidden/skip නොවෙන apps ගණන.',
          'Counts update වෙන්නේ backend data reload වුනාම.',
        ],
        actions: [
          { label: 'Add App', detail: 'New app profile එකක් create කරන form එකට යනවා. App name, package, DB name, platform/store details, status, theme/icon details වගේ fields එතැන පුරවන්න පුළුවන්.' },
        ],
      },
      {
        title: 'Apps Table',
        eyebrow: 'Search and columns',
        icon: Search,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Table එකෙන් each app එකේ identity, platform availability, store URL, current status බලන්න පුළුවන්.',
        points: [
          'Search box එක app name, package name, DB name, remark, platform label වලින් rows filter කරනවා.',
          'App Name column එකේ icon, theme color dot, package name, DB name පෙන්වනවා.',
          'Availability column එක Android/iOS badge ලෙස current platform state එක පෙන්වනවා.',
          'URL column එකේ Google Play / Apple Store link තිබුණොත් open කරන්න පුළුවන්.',
        ],
        actions: [
          { label: 'Open Store Link', detail: 'Google Play හෝ Apple Store text link එක click කළාම saved store URL එක new tab එකක open වෙනවා.' },
          { label: 'Pagination', detail: 'Rows වැඩි නම් Previous / Next buttons වලින් page මාරු කරන්න පුළුවන්.' },
        ],
      },
      {
        title: 'Row Actions',
        eyebrow: 'Edit and copy',
        icon: Pencil,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Row එකේ 3-dot menu එකෙන් selected app එකට අදාළ maintenance actions open වෙනවා.',
        points: [
          'Edit action එක app form එකට යවලා profile/store/status/appearance/metadata values update කරන්න දෙයි.',
          'Copy DB name action එක DB name එක clipboard එකට copy කරනවා.',
          'DB name නැති app එකක Copy DB name disabled වෙනවා.',
          'මෙම table එකේ Delete action එකක් නැහැ. App එක hide/remove කරන්න අවශ්‍ය නම් edit form එකේ status/platform state හරහා handle කරන pattern එක භාවිතා කරන්න.',
        ],
        actions: [
          { label: 'Edit', detail: 'App details update කරලා Save Changes කළාම registry data backend එකට save වෙනවා.' },
          { label: 'Copy DB name', detail: 'Copied DB name එක API calls, reports, troubleshooting වලට paste කරගන්න පුළුවන්.' },
        ],
      },
    ],
  },
  'user-control': {
    label: 'User Control Help',
    ariaLabel: 'Open user control help',
    title: 'User Control page එක භාවිතා කරන ආකාරය',
    description: 'Dashboard users, status, permissions, edit actions Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'මේ page එක admin dashboard users manage කරන තැන. Users list එකෙන් account details, active/disabled status, last login, navigation permissions බලලා update කරන්න පුළුවන්.',
    quickTips: [
      'Add User button එකෙන් new dashboard user account එකක් create කරනවා.',
      'Actions menu එකේ Edit User, Permissions, Disable/Enable options තියෙනවා.',
      'මෙහි direct Delete User action එකක් නැහැ; access නවත්වන්න Disable භාවිතා කරනවා.',
    ],
    buttonClassName: 'border-violet-400/25 bg-violet-500/[0.12] text-violet-100 hover:bg-violet-500/[0.18] hover:text-white',
    headerClassName: 'from-violet-500/[0.16]',
    panelClassName: 'border-violet-400/15 bg-violet-500/[0.08]',
    actionLabelClassName: 'text-violet-200',
    bulletClassName: 'bg-violet-300/80',
    sections: [
      {
        title: 'Users Summary',
        eyebrow: 'Access overview',
        icon: Users,
        iconClassName: 'border-violet-400/25 bg-violet-500/[0.14] text-violet-100',
        description: 'Header badges වලින් dashboard access state එක summary එකක් ලෙස පෙන්වනවා.',
        points: [
          'Total users කියන්නේ loaded dashboard user count එක.',
          'Active count එක dashboard login/use කළ හැකි users ගණන.',
          'Disabled count එක access නවත්වපු users ගණන.',
          'Permissions managed badge එක navigation permissions user-level ලෙස maintain කරන බව පෙන්වනවා.',
        ],
        actions: [
          { label: 'Add User', detail: 'First name, last name, email, password දාලා new user account එකක් create කරන dialog එක open වෙනවා.' },
        ],
      },
      {
        title: 'Users Table',
        eyebrow: 'Find and inspect',
        icon: Search,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Table එකෙන් user profile details සහ account state එක බලන්න පුළුවන්.',
        points: [
          'Search input එක name හෝ email අනුව users filter කරනවා.',
          'Name/email/mobile/avatar වගේ profile details row එකේ පෙන්වනවා.',
          'Created date සහ last login fields user activity understand කරන්න උදව් වෙනවා.',
          'Status column එක Active හෝ Disabled state එක badge එකක් ලෙස පෙන්වනවා.',
        ],
        actions: [
          { label: 'Pagination', detail: 'Users වැඩි නම් bottom pagination controls වලින් next/previous pages බලන්න පුළුවන්.' },
        ],
      },
      {
        title: 'User Actions',
        eyebrow: 'Edit, permissions, status',
        icon: UserCog,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Row එකේ 3-dot Actions menu එකෙන් selected user එක maintain කරන actions තියෙනවා.',
        points: [
          'Edit User dialog එකෙන් first name, last name, mobile, email, new password update කරන්න පුළුවන්.',
          'Permissions dialog එකෙන් sidebar/page navigation visibility user එකකට වෙනම on/off කරන්න පුළුවන්.',
          'Disable User කළාම user account එක disabled state එකට යනවා; dashboard access නවතිනවා.',
          'Enable User කළාම disabled user නැවත active කරන්න පුළුවන්.',
        ],
        actions: [
          { label: 'Edit User', detail: 'Profile details update කරලා Save Changes කළාම selected user record එක update වෙනවා.' },
          { label: 'Permissions', detail: 'Navigation Permissions dialog එකේ selected menu/page access save කළාම ඒ userට sidebar/page visibility වෙනස් වෙනවා.' },
          { label: 'Disable / Enable', detail: 'Disable access නවත්වන non-destructive action එකක්. Delete එකක් නෙවෙයි. Enable කළොත් account එක නැවත භාවිතා කළ හැක.' },
        ],
      },
    ],
  },
  'common-links': {
    label: 'Common Links Help',
    ariaLabel: 'Open common links help',
    title: 'Common Links page එක භාවිතා කරන ආකාරය',
    description: 'Saved shortcuts, open/edit/delete actions Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'මේ page එක important admin URLs, dashboards, documents, consoles වගේ links එකම searchable list එකක තියාගන්න භාවිතා කරනවා.',
    quickTips: [
      'Add Link button එකෙන් name සහ URL දාලා reusable shortcut එකක් create කරනවා.',
      'Link column එකේ URL click කළාම ඒ page එක new tab එකක open වෙනවා.',
      'Delete icon එකෙන් saved shortcut එක list/backend එකෙන් remove වෙනවා.',
    ],
    buttonClassName: 'border-sky-400/25 bg-sky-500/[0.12] text-sky-100 hover:bg-sky-500/[0.18] hover:text-white',
    headerClassName: 'from-sky-500/[0.16]',
    panelClassName: 'border-sky-400/15 bg-sky-500/[0.08]',
    actionLabelClassName: 'text-sky-200',
    bulletClassName: 'bg-sky-300/80',
    sections: [
      {
        title: 'Quick Access List',
        eyebrow: 'Saved shortcuts',
        icon: Link2,
        iconClassName: 'border-sky-400/25 bg-sky-500/[0.14] text-sky-100',
        description: 'Saved link count සහ table එකෙන් admin team එක frequently open කරන URLs manage කරනවා.',
        points: [
          'Saved link(s) badge එක current loaded shortcuts count එක පෙන්වනවා.',
          'Name column එක link එකට readable title එකක් පෙන්වනවා.',
          'Link column එක URL එක truncate කරලා icon එක සමඟ පෙන්වනවා.',
          'Loading වෙද්දී skeleton rows පෙන්වලා data load වුනාම actual links පෙන්වනවා.',
        ],
        actions: [
          { label: 'Add Link', detail: 'Name සහ Link (URL) fields පුරවලා shortcut එක save කරනවා. Save වුනාම list එක refresh වෙනවා.' },
        ],
      },
      {
        title: 'Search and Open',
        eyebrow: 'Find links fast',
        icon: ExternalLink,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Links වැඩි වුනාම search box එකෙන් අවශ්‍ය shortcut එක ඉක්මනින් හොයන්න පුළුවන්.',
        points: [
          'Search input එක name හෝ URL value අනුව table rows filter කරනවා.',
          'Name header එක sorting support කරනවා.',
          'URL badge එක click කළාම saved link එක external/new tab ලෙස open වෙනවා.',
          'Pagination controls වලින් long lists page by page බලන්න පුළුවන්.',
        ],
        actions: [
          { label: 'Open Link', detail: 'URL එක browser new tab එකක open වෙනවා. Admin system data වෙනස් නොවෙයි.' },
        ],
      },
      {
        title: 'Link Actions',
        eyebrow: 'Edit and delete',
        icon: Pencil,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Each row එකේ pencil සහ trash icons වලින් shortcut එක update හෝ remove කරන්න පුළුවන්.',
        points: [
          'Edit Link dialog එකෙන් shortcut name හෝ URL update කරනවා.',
          'Save Changes කළාම backend update වෙලා table එක refresh වෙනවා.',
          'Delete icon එක click කළාම link එක backend එකෙන් delete කරන action එක run වෙනවා.',
          'Delete success වුනාම row එක current list එකෙන් ඉවත් වෙනවා. අවශ්‍ය නම් නැවත Add Link මඟින් create කරන්න වෙයි.',
        ],
        actions: [
          { label: 'Edit Link', detail: 'Existing shortcut details correct/update කරන dialog එක open වෙනවා.' },
          { label: 'Delete Link', detail: 'Saved shortcut record එක remove කරනවා. මේක link shortcut එකට පමණක් අදාලයි; external website එකට කිසිම change එකක් වෙන්නේ නැහැ.' },
        ],
      },
    ],
  },
  'activity-log': {
    label: 'Activity Log Help',
    ariaLabel: 'Open activity log help',
    title: 'Activity Log page එක භාවිතා කරන ආකාරය',
    description: 'Audit trail, operations, search/sort behavior Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'මේ page එක dashboard එකේ සිදු වූ important changes audit trail එකක් ලෙස පෙන්වන read-only page එකක්. කවුද, මොකක්ද, කවදාද වෙනස් කළේ කියලා track කරන්න භාවිතා කරනවා.',
    quickTips: [
      'Recent logs badge එක loaded activity record count එක පෙන්වනවා.',
      'Insert/update/delete counts operation type අනුව breakdown එක පෙන්වනවා.',
      'මේ page එක read-only නිසා edit/delete buttons නැහැ.',
    ],
    buttonClassName: 'border-amber-400/25 bg-amber-500/[0.12] text-amber-100 hover:bg-amber-500/[0.18] hover:text-white',
    headerClassName: 'from-amber-500/[0.16]',
    panelClassName: 'border-amber-400/15 bg-amber-500/[0.08]',
    actionLabelClassName: 'text-amber-200',
    bulletClassName: 'bg-amber-300/80',
    sections: [
      {
        title: 'Audit Summary',
        eyebrow: 'Operation counts',
        icon: FileClock,
        iconClassName: 'border-amber-400/25 bg-amber-500/[0.14] text-amber-100',
        description: 'Header badges වලින් recent activity volume සහ operation types summary එකක් පෙන්වනවා.',
        points: [
          'Recent logs කියන්නේ table එකට loaded records count එක.',
          'Inserts count එක new records create වූ actions පෙන්වනවා.',
          'Updates count එක existing records edit/save වූ actions පෙන්වනවා.',
          'Deletes count එක delete/remove actions count එක පෙන්වනවා.',
        ],
        actions: [
          { label: 'MySQL backed', detail: 'Logs MySQL-backed activity source එකෙන් load වෙන බව indicate කරන badge එක.' },
        ],
      },
      {
        title: 'Activity Table',
        eyebrow: 'Who changed what',
        icon: ClipboardList,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Table columns වලින් exact activity detail බලන්න පුළුවන්.',
        points: [
          'Timestamp column එක change එක සිදු වූ date/time පෙන්වනවා; header click කරලා sort කරන්න පුළුවන්.',
          'User column එක user email සහ UID තිබුණොත් UID පෙන්වනවා.',
          'Operation badge එක insert, update, delete, action වගේ type එක පෙන්වනවා.',
          'Action සහ Entity columns වලින් සිදු කළ වැඩේ සහ target record/entity එක හඳුනාගන්න පුළුවන්.',
        ],
        actions: [
          { label: 'Sort Timestamp/Action', detail: 'Column header එක click කළාම ascending/descending order එකට records sort වෙනවා.' },
        ],
      },
      {
        title: 'Search and Review',
        eyebrow: 'Read-only investigation',
        icon: Search,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Specific incident එකක් හොයන්න search box එක සහ pagination controls භාවිතා කරනවා.',
        points: [
          'Search input එක user, action, entity, operation වගේ values වලින් filter කරනවා.',
          'Pagination controls වලින් logs වැඩි නම් next/previous pages බලන්න පුළුවන්.',
          'Activity Log page එකෙන් records modify කරන්න බැහැ; මෙහි purpose එක review/audit කිරීම.',
          'Delete operation එකක් log එකේ පෙන්වුණත්, මෙතැනින් ඒ deleted data restore කිරීමක් සිදු නොවේ.',
        ],
        actions: [
          { label: 'Review Only', detail: 'මෙහි buttons destructive නැහැ. Change history එක බලලා issue එක trace කරන්න භාවිතා කරන page එකක්.' },
        ],
      },
    ],
  },
  settings: {
    label: 'Settings Help',
    ariaLabel: 'Open settings help',
    title: 'Global Settings page එක භාවිතා කරන ආකාරය',
    description: 'Branding, startup, developer, navigation, dashboard, integrations settings Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'මේ page එක admin dashboard එකට බලපාන global configuration save කරන තැන. මෙහි කරන changes බොහෝ modules වල behavior, visibility, integrations වලට බලපාන්න පුළුවන්.',
    quickTips: [
      'Left/mobile section buttons වලින් Branding, Startup, Developer, Navigation, Dashboard, Integrations මාරු වෙනවා.',
      'Save Settings button එක click කරන තුරු changes backend එකට apply වෙන්නේ නැහැ.',
      'Integrations section එකේ credentials/API settings තියෙන නිසා values update කරන විට විශේෂයෙන් සැලකිලිමත් වෙන්න.',
    ],
    buttonClassName: 'border-blue-400/25 bg-blue-500/[0.12] text-blue-100 hover:bg-blue-500/[0.18] hover:text-white',
    headerClassName: 'from-blue-500/[0.16]',
    panelClassName: 'border-blue-400/15 bg-blue-500/[0.08]',
    actionLabelClassName: 'text-blue-200',
    bulletClassName: 'bg-blue-300/80',
    sections: [
      {
        title: 'Settings Sections',
        eyebrow: 'Configuration tabs',
        icon: Settings,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Settings form එක sections කිහිපයකට බෙදා තියෙනවා. අවශ්‍ය area එක select කරලා related fields update කරනවා.',
        points: [
          'Branding section එක company/admin branding details manage කරනවා.',
          'Startup section එක login පසු default page එක තෝරනවා.',
          'Developer section එක debug output සහ demo-data switches control කරනවා.',
          'Navigation සහ Dashboard sections වලින් sidebar/menu visibility සහ dashboard cards/layout configuration manage කරනවා.',
        ],
        actions: [
          { label: 'Section Buttons', detail: 'Left sidebar හෝ mobile section buttons click කළාම active form section එක මාරු වෙනවා. Data save වෙන්නේ Save Settings click කළාම පමණයි.' },
        ],
      },
      {
        title: 'Operational Controls',
        eyebrow: 'Visibility and behavior',
        icon: LayoutDashboard,
        iconClassName: 'border-violet-400/25 bg-violet-500/[0.14] text-violet-100',
        description: 'Dashboard users දකින first screen, debug info, demo data, navigation/dashboard layout වගේ behavior-level settings මෙහි තියෙනවා.',
        points: [
          'Default Page field එක users login වුනාම මුලින්ම යන page එක තෝරනවා.',
          'Show Debug Information switch එක calculation traces/API responses පෙන්වීම control කරනවා.',
          'Demo Mode switches dashboard cards/charts වල demo data on/off කරනවා.',
          'Navigation/Dashboard customization values wrong format නම් save validation errors පෙන්වන්න පුළුවන්.',
        ],
        actions: [
          { label: 'Switches', detail: 'ON/OFF toggle කළාම local form state එක වෙනස් වෙනවා. Save Settings කළාම global setting එක update වෙනවා.' },
        ],
      },
      {
        title: 'Integrations',
        eyebrow: 'Shared services',
        icon: KeyRound,
        iconClassName: 'border-amber-400/25 bg-amber-500/[0.14] text-amber-100',
        description: 'External services සහ uploads වලට අවශ්‍ය shared credentials/configuration මෙහි maintain කරනවා.',
        points: [
          'PHP backend auth token, upload paths/URLs, finance attachment paths මෙහි set කරනවා.',
          'Tax Gmail/Drive integrations remove කරලා තියෙන නිසා Tax Configuration එක credentials collect කරන්නේ නැහැ.',
          'AdMob සහ App Store Connect credentials reports/data sync workflows සඳහා භාවිතා වෙනවා.',
          'Firebase Configuration එක authentication සඳහා භාවිතා වෙනවා; Google Play Service Account workflow remove කරලා තියෙනවා.',
        ],
        actions: [
          { label: 'Credentials', detail: 'Sensitive values update කරන විට correct environment/account එකේ values දාන බව confirm කරගන්න. Wrong token/secret එකක් report sync හෝ upload workflow fail කරන්න පුළුවන්.' },
        ],
      },
      {
        title: 'Save Behavior',
        eyebrow: 'Apply globally',
        icon: Save,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Bottom sticky save area එක settings apply කරන final action එක.',
        points: [
          'Ready to apply settings? area එක current form changes save කිරීමට පෙන්වන fixed action area එක.',
          'Save Settings click කළාම validation pass වුන values backend/global settings store එකට save වෙනවා.',
          'Success toast එකක් පෙන්වුණොත් settings save වී ඇත.',
          'Validation/API error එකක් ආවොත් relevant field/message බලලා correct කර නැවත save කරන්න.',
        ],
        actions: [
          { label: 'Save Settings', detail: 'Global settings update කරන primary action එක. Save වුනාම admin dashboard modules කිහිපයක behavior වෙනස් විය හැක.' },
        ],
      },
    ],
  },
};

interface ManagementHelpDialogProps {
  page: ManagementHelpPage;
  className?: string;
}

export function ManagementHelpDialog({ page, className }: ManagementHelpDialogProps) {
  const content = helpContent[page];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-10 w-10 rounded-xl px-0', content.buttonClassName, className)}
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
