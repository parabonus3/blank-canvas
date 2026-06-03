import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { LANGUAGES, SUPPORTED_PREFIXES, langFromI18n, buildLangPath } from '@/lib/i18nRoutes';

const flagFor: Record<string, string> = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
  'es-ES': '🇪🇸',
  'fr-FR': '🇫🇷',
  'ja-JP': '🇯🇵',
  'de-DE': '🇩🇪',
  'ar-SA': '🇸🇦',
  'ko-KR': '🇰🇷',
  'zh-CN': '🇨🇳',
  'it-IT': '🇮🇹',
  'ru-RU': '🇷🇺',
  'id-ID': '🇮🇩',
};

const nameFor: Record<string, string> = {
  'pt-BR': 'Português',
  'en-US': 'English',
  'es-ES': 'Español',
  'fr-FR': 'Français',
  'ja-JP': '日本語',
  'de-DE': 'Deutsch',
  'ar-SA': 'العربية',
  'ko-KR': '한국어',
  'zh-CN': '中文',
  'it-IT': 'Italiano',
  'ru-RU': 'Русский',
  'id-ID': 'Bahasa Indonesia',
};

// Public paths that exist as language-prefixed routes (see App.tsx).
const PUBLIC_PATHS = new Set(['', 'auth', 'pricing', 'reset-password', 'room-preview']);

interface LanguageSwitcherProps {
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function LanguageSwitcher({ variant = 'ghost', className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLang = langFromI18n(i18n.language);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);

    // Strip current language prefix from URL if present.
    const segments = location.pathname.split('/').filter(Boolean);
    const firstSegment = segments[0] ?? '';
    const hasLangPrefix = SUPPORTED_PREFIXES.has(firstSegment);
    const rest = hasLangPrefix ? segments.slice(1) : segments;
    const restPath = '/' + rest.join('/');

    // Only navigate when we're on a public, indexable route.
    const rootPublicSegment = rest[0] ?? '';
    const isPublicRoute = PUBLIC_PATHS.has(rootPublicSegment);
    if (!isPublicRoute) return;

    const target = LANGUAGES.find((l) => l.code === code);
    if (!target) return;

    const newPath = buildLangPath(target.prefix, restPath === '/' ? '/' : restPath);
    if (newPath !== location.pathname) {
      navigate(newPath + location.search + location.hash);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="icon" className={cn("shrink-0", className)}>
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={cn(
              "cursor-pointer",
              currentLang.code === lang.code && "bg-muted"
            )}
          >
            <span className="mr-2">{flagFor[lang.code]}</span>
            {nameFor[lang.code]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
