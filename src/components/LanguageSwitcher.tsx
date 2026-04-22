import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import mkFlagUrl from '@flags-3x2/MK.svg?url';
import gbFlagUrl from '@flags-3x2/GB.svg?url';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Variant = 'header' | 'admin';

type LangCode = 'mk' | 'en';

const SHORT_LABEL: Record<LangCode, 'MK' | 'EN'> = { mk: 'MK', en: 'EN' };

const LANG_OPTIONS: readonly {
  code: LangCode;
  flagSrc: string;
}[] = [
  { code: 'mk', flagSrc: mkFlagUrl },
  { code: 'en', flagSrc: gbFlagUrl },
];

function normalizeLang(lng: string | undefined): LangCode {
  const base = (lng ?? 'mk').split('-')[0]?.toLowerCase();
  return base === 'en' ? 'en' : 'mk';
}

/**
 * Circular flag: raster SVG via <img> + object-cover so the flag always fills
 * the circle edge-to-edge (same behavior as modern avatar flags).
 */
function FlagCircle({
  src,
  size = 'md',
  tone = 'default',
}: {
  src: string;
  size?: 'xs' | 'sm' | 'md';
  tone?: 'default' | 'onDark';
}) {
  const dim =
    size === 'xs'
      ? 'h-[18px] w-[18px]'
      : size === 'sm'
        ? 'h-5 w-5'
        : 'h-5 w-5 sm:h-[22px] sm:w-[22px]';
  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-full bg-zinc-100 aspect-square dark:bg-zinc-800',
        dim,
        tone === 'onDark'
          ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.14)]'
          : 'shadow-[0_0_0_1px_rgba(24,24,27,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]'
      )}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        width={64}
        height={43}
        draggable={false}
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full min-h-full min-w-full origin-center select-none object-cover object-center scale-[1.08]"
      />
    </span>
  );
}

export function LanguageSwitcher({ variant = 'header' }: { variant?: Variant }) {
  const { i18n, t } = useTranslation();
  const current = normalizeLang(i18n.language);
  const active = LANG_OPTIONS.find((o) => o.code === current) ?? LANG_OPTIONS[0];
  const flagTone = variant === 'admin' ? 'onDark' : 'default';

  const triggerClass =
    variant === 'admin'
      ? cn(
          'h-7 gap-1 rounded-lg border border-zinc-600/90 bg-zinc-800/95 px-1.5 text-xs font-medium text-zinc-100',
          'shadow-sm shadow-black/20 hover:bg-zinc-800 hover:border-zinc-500/80',
          'sm:gap-1.5 sm:px-2'
        )
      : cn(
          'h-8 gap-1 rounded-lg border border-zinc-200/90 bg-white px-1.5 text-[13px] font-medium text-zinc-800',
          'shadow-sm shadow-zinc-950/5 hover:border-zinc-300/90 hover:bg-zinc-50/90',
          'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/80',
          'sm:gap-1.5 sm:px-2'
        );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            triggerClass,
            'shrink-0 tabular-nums touch-manipulation max-sm:justify-center max-sm:min-w-8',
            'focus-visible:ring-2 focus-visible:ring-zinc-400/25 focus-visible:ring-offset-2',
            variant === 'header' && 'focus-visible:ring-offset-background',
            variant === 'admin' && 'focus-visible:ring-zinc-500/30 focus-visible:ring-offset-zinc-900'
          )}
          aria-label={t('language.label')}
          aria-haspopup="listbox"
        >
          <FlagCircle src={active.flagSrc} size={variant === 'admin' ? 'sm' : 'md'} tone={flagTone} />
          <span className="hidden min-w-[1.375rem] text-left tracking-tight sm:inline">
            {SHORT_LABEL[active.code]}
          </span>
          <ChevronDown
            className="hidden h-3 w-3 shrink-0 text-zinc-400 opacity-80 sm:block dark:text-zinc-500"
            aria-hidden
            strokeWidth={2}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className={cn(
          '!min-w-0 w-max overflow-hidden rounded-lg border border-zinc-200/95 bg-white p-0.5',
          'shadow-[0_8px_30px_-8px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)]',
          'dark:border-zinc-800 dark:bg-zinc-950',
          'dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)]'
        )}
        aria-label={t('language.menuTitle')}
      >
        <ul className="flex flex-col gap-px" role="listbox" aria-label={t('language.menuTitle')}>
          {LANG_OPTIONS.map((opt) => {
            const isSelected = opt.code === current;
            return (
              <li key={opt.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-1.5 whitespace-nowrap rounded-md py-1 pl-1 pr-2',
                    'text-left text-[13px] font-medium tabular-nums tracking-tight transition-colors',
                    'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                    'dark:text-zinc-400 dark:hover:bg-zinc-800/90 dark:hover:text-zinc-100',
                    'focus:outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-800/90',
                    isSelected &&
                      'bg-zinc-50 text-zinc-900 dark:bg-zinc-900/70 dark:text-zinc-50'
                  )}
                  onClick={() => void i18n.changeLanguage(opt.code)}
                >
                  <FlagCircle src={opt.flagSrc} size="xs" tone="default" />
                  <span className="leading-none">{SHORT_LABEL[opt.code]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
