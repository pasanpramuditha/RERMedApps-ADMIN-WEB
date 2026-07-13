'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  CircleHelp,
  MonitorSmartphone,
  Pencil,
  Search,
  Settings2,
  SlidersHorizontal,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type AppManagementHelpPage = 'admob-ads' | 'android-app-settings' | 'ios-app-settings';

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

const helpContent: Record<AppManagementHelpPage, HelpContent> = {
  'admob-ads': {
    label: 'AdMob Help',
    ariaLabel: 'Open AdMob ads help',
    title: 'AdMob Ads page එක භාවිතා කරන ආකාරය',
    description: 'Platform switch, ad status table, edit/save actions Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'මේ page එක Android සහ iOS apps වල AdMob ads ON/OFF state එක බලන්න සහ update කරන්න භාවිතා කරන තැන. App එකකට ad placements activeද, offද, app එකේ implement කරලා නැද්ද කියලා මෙතැනින් හඳුනාගන්න පුළුවන්.',
    quickTips: [
      'Android Apps / iOS Apps switch එකෙන් table එකේ පෙන්වන platform එක මාරු කරනවා.',
      'ON කියන්නේ ad placement එක active, OFF කියන්නේ disabled, N/I කියන්නේ ඒ app එකේ ඒ placement එක implement කරලා නැහැ.',
      'Edit button එකෙන් selected app එකේ ad toggles/frequency වෙනස් කරලා Save Changes කළාම backend එක update වෙනවා.',
    ],
    buttonClassName: 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-100 hover:bg-emerald-500/[0.18] hover:text-white',
    headerClassName: 'from-emerald-500/[0.16]',
    panelClassName: 'border-emerald-400/15 bg-emerald-500/[0.08]',
    actionLabelClassName: 'text-emerald-200',
    bulletClassName: 'bg-emerald-300/80',
    sections: [
      {
        title: 'Platform Summary',
        eyebrow: 'Android / iOS switch',
        icon: MonitorSmartphone,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Header area එකෙන් platform එක තෝරලා loaded apps සහ enabled placements summary එක ඉක්මනින් බලනවා.',
        points: [
          'Apps Loaded count එක currently selected platform එකට load වූ app count එක පෙන්වනවා.',
          'Enabled Placements count එක ON කරලා තියෙන ad slots ගණන පෙන්වනවා.',
          'Running Ad Summary එක Banner, Interstitial, Native, App Open ads active app count breakdown එක පෙන්වනවා.',
          'iOS view එකේ table එක Banner සහ Interstitial placements පමණක් පෙන්වනවා; Android view එකේ Native, App Open සහ frequency valuesත් පෙන්වනවා.',
        ],
        actions: [
          { label: 'Android Apps / iOS Apps', detail: 'Button එක click කළාම selected platform එක මාරු වෙලා ඒ platform එකේ AdMob settings backend එකෙන් නැවත load වෙනවා.' },
          { label: 'Refresh', detail: 'Refresh icon එක click කළාම current platform data නැවත backend එකෙන් fetch කරනවා. Data manually update වෙලා තියෙනවා නම් table එක refresh කරගන්න මෙය භාවිතා කරන්න.' },
        ],
      },
      {
        title: 'Ad Status Table',
        eyebrow: 'Search and read state',
        icon: Search,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Table එකෙන් app එකෙන් app එකට ad placement state එක compare කරන්න පුළුවන්.',
        points: [
          'Search input එක app name අනුව rows filter කරනවා.',
          'App column එකේ app icon/name සහ API error තිබුණොත් error badge/message පෙන්වනවා.',
          'Frequency column එක Android වල Native interval සහ Reward interval values පෙන්වනවා.',
          'Pagination controls වලින් apps වැඩි නම් page by page බලන්න පුළුවන්.',
        ],
        actions: [
          { label: 'Search', detail: 'App name type කළාම matching rows පමණක් table එකේ පෙන්වනවා. Backend data වෙනස් කිරීමක් සිදු නොවේ.' },
          { label: 'Status Badges', detail: 'ON/OFF/N/I badges read-only summary එකක්. Change කරන්න Edit dialog එක open කළ යුතුයි.' },
        ],
      },
      {
        title: 'Edit Ad Settings',
        eyebrow: 'Toggles and save',
        icon: Pencil,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Each app row එකේ Edit button එකෙන් selected app එකට අදාළ ad placements update කරන dialog එක open වෙනවා.',
        points: [
          'Banner, Interstitial, Native, App Open switches වලින් supported placements ON/OFF කරනවා.',
          'N/I ලෙස පෙන්වන placement එක disabled වෙලා තියෙන්නේ app/backend එකේ ඒ value implement කරලා නැති නිසා.',
          'Android apps වල Native Interval සහ Reward Interval number fields repeat timing control කරනවා.',
          'Save Changes success වුනාම dialog එක close වෙලා table එක නැවත refresh වෙනවා.',
        ],
        actions: [
          { label: 'Edit', detail: 'Selected app එකේ current AdMob values dialog එකකට load කරනවා. මෙය data save නොකරයි; edit form එක open කිරීම පමණයි.' },
          { label: 'Switches', detail: 'Switch ON/OFF කළාම dialog form state එක වෙනස් වෙනවා. Backend update වෙන්නේ Save Changes click කළාම පමණයි.' },
          { label: 'Save Changes', detail: 'Changed AdMob values selected app database/backend එකට save කරන primary action එක. Error ආවොත් toast/message එක බලලා නැවත check කරන්න.' },
        ],
      },
    ],
  },
  'android-app-settings': {
    label: 'Android Help',
    ariaLabel: 'Open Android app settings help',
    title: 'Android App Settings page එක භාවිතා කරන ආකාරය',
    description: 'Android app list, Settings action, edit screen save behavior Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'මේ page එක Android live apps තෝරාගෙන ඒ app database එකේ fnd_settings_tab / app settings values manage කරන්න භාවිතා කරන තැන. Feature flags, AdMob, navigation URLs, premium offers, IAP, security values වගේ settings මෙතැනින් update කරන්න පුළුවන්.',
    quickTips: [
      'List එකේ පෙන්වන්නේ Apps registry එකේ Android support තියෙන live apps පමණයි.',
      'Database badge එකෙන් correct app DB එක mapped වෙලාද කියලා confirm කරන්න.',
      'Settings button එක app-specific edit screen එකට යවනවා; changes backend එකට යන්නේ Save Changes කළාම පමණයි.',
    ],
    buttonClassName: 'border-emerald-400/25 bg-emerald-500/[0.12] text-emerald-100 hover:bg-emerald-500/[0.18] hover:text-white',
    headerClassName: 'from-emerald-500/[0.16]',
    panelClassName: 'border-emerald-400/15 bg-emerald-500/[0.08]',
    actionLabelClassName: 'text-emerald-200',
    bulletClassName: 'bg-emerald-300/80',
    sections: [
      {
        title: 'Android Apps List',
        eyebrow: 'Live app registry',
        icon: Smartphone,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Header badges සහ table එකෙන් Android settings manage කළ හැකි apps summary එක පෙන්වනවා.',
        points: [
          'Live count එක Android platform support තියෙන live apps ගණන පෙන්වනවා.',
          'DB mapped count එක database name set කරලා තියෙන apps ගණන පෙන්වනවා.',
          'Package column එක Android package name එක පෙන්වනවා.',
          'Status badge එක app registry state එක Active/Liveද කියලා identify කරන්න උදව් කරනවා.',
        ],
        actions: [
          { label: 'Review App Row', detail: 'Settings open කරන්න කලින් app icon/name, package, database, status values check කරලා correct app එක බව confirm කරන්න.' },
        ],
      },
      {
        title: 'Find and Open Settings',
        eyebrow: 'Search and navigate',
        icon: Search,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Apps වැඩි නම් search සහ pagination controls භාවිතා කරලා අවශ්‍ය Android app එක ඉක්මනින් හොයාගන්න පුළුවන්.',
        points: [
          'Search input එක app name අනුව rows filter කරනවා.',
          'Pagination controls වලින් long app lists page by page බලන්න පුළුවන්.',
          'Settings button එක click කළාම selected app ID එකෙන් edit route එක open වෙනවා.',
          'List page එකෙන් direct settings values edit නොකරයි; edit screen එකට යාම පමණයි.',
        ],
        actions: [
          { label: 'Search', detail: 'Typed app name එකට matching rows පෙන්වනවා. Backend data update කිරීමක් සිදු නොවේ.' },
          { label: 'Settings', detail: 'Selected Android app එකේ detail settings screen එක open කරන navigation action එක. එතැනදී values edit/save කරන්න පුළුවන්.' },
        ],
      },
      {
        title: 'Android Edit Screen',
        eyebrow: 'Tabs, fields, save',
        icon: SlidersHorizontal,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Settings screen එකේ categories, search, fields, save button වල behavior මෙසේ කියවන්න.',
        points: [
          'All/Application/Security/Admob/Navigation/Premium/IAP/Admin categories වලින් settings groups filter වෙනවා.',
          'Search settings input එක setting name/description අනුව visible fields filter කරනවා.',
          'Integer සහ String fields edit කළාම form state එක පමණක් වෙනස් වෙනවා.',
          'Save Changes click කළාම selected app database එකේ settings values update වෙනවා.',
        ],
        actions: [
          { label: 'Category Tabs', detail: 'Relevant settings group එකට යන්න tabs භාවිතා කරනවා. Tab මාරු කිරීම save action එකක් නොවෙයි.' },
          { label: 'Back to List', detail: 'Android apps list එකට ආපසු යන navigation action එක. Unsaved form changes තිබුණොත් Save Changes කළේ නැතිනම් backend එකට apply නොවේ.' },
          { label: 'Save Changes', detail: 'Current form values backend එකට submit කරන action එක. Success toast එකක් පෙන්වුණොත් update complete.' },
        ],
      },
    ],
  },
  'ios-app-settings': {
    label: 'iOS Help',
    ariaLabel: 'Open iOS app settings help',
    title: 'iOS App Settings page එක භාවිතා කරන ආකාරය',
    description: 'iOS app list, Settings action, iOS edit modules Sinhala වලින් පැහැදිලි කර ඇත.',
    intro: 'මේ page එක iOS-enabled live apps තෝරාගෙන app configuration, AdMob IDs, branding, promo, navigation, version, font size, similar apps වගේ iOS settings manage කරන්න භාවිතා කරන තැන.',
    quickTips: [
      'List එකේ පෙන්වන්නේ iOS/Apple support තියෙන live apps පමණයි.',
      'Bundle ID සහ Database badge එකෙන් correct app එක තෝරාගෙනද කියලා confirm කරන්න.',
      'iOS edit screen එකේ සමහර sections වෙන වෙනම Save buttons භාවිතා කරන නිසා update කරන section එකේ save action එක complete කරන්න.',
    ],
    buttonClassName: 'border-sky-400/25 bg-sky-500/[0.12] text-sky-100 hover:bg-sky-500/[0.18] hover:text-white',
    headerClassName: 'from-sky-500/[0.16]',
    panelClassName: 'border-sky-400/15 bg-sky-500/[0.08]',
    actionLabelClassName: 'text-sky-200',
    bulletClassName: 'bg-sky-300/80',
    sections: [
      {
        title: 'iOS Apps List',
        eyebrow: 'Live app registry',
        icon: BadgeCheck,
        iconClassName: 'border-sky-400/25 bg-sky-500/[0.14] text-sky-100',
        description: 'Header badges සහ table එකෙන් iOS settings manage කළ හැකි apps summary එක පෙන්වනවා.',
        points: [
          'Live count එක iOS/Apple platform support තියෙන live apps ගණන පෙන්වනවා.',
          'DB mapped count එක database name set කරලා තියෙන apps ගණන පෙන්වනවා.',
          'Bundle ID column එක iOS package/bundle identifier එක පෙන්වනවා.',
          'Status badge එක app registry state එක Active/Liveද කියලා identify කරන්න උදව් කරනවා.',
        ],
        actions: [
          { label: 'Review App Row', detail: 'Settings open කරන්න කලින් app icon/name, bundle ID, database, status values check කරලා correct iOS app එක බව confirm කරන්න.' },
        ],
      },
      {
        title: 'Find and Open Settings',
        eyebrow: 'Search and navigate',
        icon: Search,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Apps වැඩි නම් search සහ pagination controls භාවිතා කරලා අවශ්‍ය iOS app එක ඉක්මනින් හොයාගන්න පුළුවන්.',
        points: [
          'Search input එක app name අනුව rows filter කරනවා.',
          'Pagination controls වලින් long app lists page by page බලන්න පුළුවන්.',
          'Settings button එක click කළාම selected app ID එකෙන් iOS edit route එක open වෙනවා.',
          'List page එකෙන් direct settings values edit නොකරයි; edit screen එකට යාම පමණයි.',
        ],
        actions: [
          { label: 'Search', detail: 'Typed app name එකට matching rows පෙන්වනවා. Backend data update කිරීමක් සිදු නොවේ.' },
          { label: 'Settings', detail: 'Selected iOS app එකේ detail settings screen එක open කරන navigation action එක. එතැනදී iOS settings sections edit/save කරන්න පුළුවන්.' },
        ],
      },
      {
        title: 'iOS Edit Modules',
        eyebrow: 'Config sections',
        icon: Settings2,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'iOS edit screen එක modules කිහිපයකට බෙදා තියෙන නිසා update කරන area එක අනුව correct save action එක භාවිතා කරන්න.',
        points: [
          'App Config tab එක General App Configuration සහ App Version values manage කරනවා.',
          'AdMob tab එක iOS AdMob IDs/settings save කරනවා.',
          'Branding tab එක theme colors, company logo, localization, phone/tablet font sizes manage කරනවා.',
          'Promo, Navigation, Similar Apps tabs වලින් promotion rules, navigation rows, related app records manage කරනවා.',
        ],
        actions: [
          { label: 'Top Save Changes', detail: 'Main iOS settings form values backend එකට submit කරන action එක. App Config/Branding localization වගේ form values save කිරීමට භාවිතා කරනවා.' },
          { label: 'Section Save Buttons', detail: 'AdMob, Promo, Navigation, Font Sizes වගේ manager sections වල වෙනම Save buttons තියෙනවා. ඒ section එකේ වෙනස්කම් apply කරන්න ඒ Save button එක click කරන්න.' },
          { label: 'Back to List', detail: 'iOS apps list එකට ආපසු යන navigation action එක. Unsaved changes තිබුණොත් save නොකර යන විට backend එකට apply නොවෙයි.' },
        ],
      },
    ],
  },
};

interface AppManagementHelpDialogProps {
  page: AppManagementHelpPage;
  className?: string;
}

export function AppManagementHelpDialog({ page, className }: AppManagementHelpDialogProps) {
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
