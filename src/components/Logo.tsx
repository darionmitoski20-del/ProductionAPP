import { Flame } from 'lucide-react';
import { useDesignSettingsContext } from '@/contexts/DesignSettingsContext';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo = ({ className = '', showText = true }: LogoProps) => {
  const { settings } = useDesignSettingsContext();
  const logoSrc = settings.logo_url?.trim() || null;
  const appName = settings.app_name?.trim() || 'FastBite';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${
            logoSrc ? 'bg-transparent shadow-none' : 'gradient-hero shadow-lg'
          }`}
        >
          {logoSrc ? (
            <img src={logoSrc} alt="" className="h-full w-full object-contain" />
          ) : (
            <Flame className="w-6 h-6 text-white" />
          )}
        </div>
      </div>
      {showText && (
        <span className="font-display text-2xl font-bold tracking-tight">
          {appName}
        </span>
      )}
    </div>
  );
};
