import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDesignSettings, useUpdateDesignSettings } from '@/hooks/useDesignSettings';
import { uploadAppAsset, validateImage } from '@/lib/uploadAppAsset';
import { deleteAppAssetIfOurs } from '@/lib/deleteAppAssetIfOurs';
import type { AppDesignSettings, HeroBackgroundType, ButtonRadiusOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ImageIcon, Palette, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const FONT_OPTIONS = ['DM Sans', 'Inter', 'Poppins', 'Montserrat', 'Roboto'] as const;
const BUTTON_RADIUS_OPTIONS: ButtonRadiusOption[] = [
  'rounded-md',
  'rounded-lg',
  'rounded-xl',
  'rounded-2xl',
  'rounded-full',
];

const DEFAULT_SETTINGS: AppDesignSettings = {
  id: '',
  app_name: 'FastBite',
  logo_url: null,
  hero_background_type: 'image',
  hero_gradient_from: '#1a1a2e',
  hero_gradient_to: '#16213e',
  hero_solid_color: '#1a1a2e',
  hero_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920&q=80',
  hero_title: 'РЕСТОРАН МЕНИ',
  hero_subtitle: 'Порачај го твоето јадење од нашето мени',
  primary_color: '#16a34a',
  secondary_color: '#f97316',
  font_family: 'DM Sans',
  button_radius: 'rounded-xl',
  max_product_quantity: 5,
  pickup_location_name: 'My Restaurant',
  pickup_location_address: '142 Market Street, Floor 1',
  pickup_timing_text: 'ASAP Pickup',
  pickup_phone: '+389 70 000 000',
  social_facebook_url: null,
  social_instagram_url: null,
  updated_at: '',
};

const HERO_TITLE_MAX = 100;
const HERO_SUBTITLE_MAX = 200;

const DESIGN_DEMO_BLOCKED = 'Demo account: design changes are disabled.';

export default function AdminDesign() {
  const navigate = useNavigate();
  const { user, loading, isAdmin, isDemo } = useAuth();
  const { data: settings, isLoading } = useDesignSettings();
  const updateSettings = useUpdateDesignSettings();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<AppDesignSettings>(DEFAULT_SETTINGS);
  const [logoUploading, setLogoUploading] = useState(false);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [removeLogoOpen, setRemoveLogoOpen] = useState(false);
  const [removeHeroImageOpen, setRemoveHeroImageOpen] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [heroImageRemoving, setHeroImageRemoving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) navigate('/auth');
  }, [loading, user, isAdmin, navigate]);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);


  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemo) {
      toast.error(DESIGN_DEMO_BLOCKED);
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImage(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    const oldLogoUrl = form.logo_url;
    setLogoUploading(true);
    try {
      const url = await uploadAppAsset(file, 'logo');
      if (oldLogoUrl) {
        try {
          await deleteAppAssetIfOurs(oldLogoUrl);
        } catch {
          toast.warning('Old logo could not be removed from storage.');
        }
      }
      await updateSettings.mutateAsync({ logo_url: url });
      setForm((prev) => ({ ...prev, logo_url: url }));
      toast.success('Logo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (isDemo) {
      toast.error(DESIGN_DEMO_BLOCKED);
      setRemoveLogoOpen(false);
      return;
    }
    const url = form.logo_url;
    setLogoRemoving(true);
    try {
      await deleteAppAssetIfOurs(url);
    } catch {
      // Not ours or network error – still clear DB
    }
    try {
      await updateSettings.mutateAsync({ logo_url: null });
      setForm((prev) => ({ ...prev, logo_url: null }));
      setRemoveLogoOpen(false);
      toast.success('Logo removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLogoRemoving(false);
    }
  };

  const handleRemoveHeroImage = async () => {
    if (isDemo) {
      toast.error(DESIGN_DEMO_BLOCKED);
      setRemoveHeroImageOpen(false);
      return;
    }
    const url = form.hero_image_url;
    setHeroImageRemoving(true);
    try {
      await deleteAppAssetIfOurs(url);
    } catch {
      // Not ours or network error – still clear DB
    }
    try {
      await updateSettings.mutateAsync({
        hero_image_url: null,
        hero_background_type: 'gradient',
      });
      setForm((prev) => ({
        ...prev,
        hero_image_url: null,
        hero_background_type: 'gradient',
      }));
      setRemoveHeroImageOpen(false);
      toast.success('Hero image removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setHeroImageRemoving(false);
    }
  };

  const handleHeroImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemo) {
      toast.error(DESIGN_DEMO_BLOCKED);
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImage(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    const oldHeroUrl = form.hero_image_url;
    setHeroImageUploading(true);
    try {
      const url = await uploadAppAsset(file, 'hero');
      if (oldHeroUrl) {
        try {
          await deleteAppAssetIfOurs(oldHeroUrl);
        } catch {
          toast.warning('Previous hero image could not be removed from storage.');
        }
      }
      await updateSettings.mutateAsync({ hero_image_url: url, hero_background_type: 'image' });
      setForm((prev) => ({ ...prev, hero_image_url: url, hero_background_type: 'image' }));
      toast.success('Hero image updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setHeroImageUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (isDemo) {
      toast.error(DESIGN_DEMO_BLOCKED);
      return;
    }
    const title = form.hero_title.trim();
    const subtitle = form.hero_subtitle.trim();
    if (title.length > HERO_TITLE_MAX) {
      toast.error(`Hero title must be ${HERO_TITLE_MAX} characters or fewer`);
      return;
    }
    if (subtitle.length > HERO_SUBTITLE_MAX) {
      toast.error(`Hero subtitle must be ${HERO_SUBTITLE_MAX} characters or fewer`);
      return;
    }
    try {
      await updateSettings.mutateAsync({
        app_name: form.app_name.trim() || 'FastBite',
        hero_background_type: form.hero_image_url ? 'image' : 'gradient',
        hero_gradient_from: form.hero_gradient_from,
        hero_gradient_to: form.hero_gradient_to,
        hero_solid_color: form.hero_solid_color,
        hero_image_url: form.hero_image_url,
        hero_title: title || 'РЕСТОРАН МЕНИ',
        hero_subtitle: subtitle || 'Порачај го твоето јадење од нашето мени',
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        font_family: form.font_family,
        button_radius: form.button_radius,
        max_product_quantity: form.max_product_quantity,
        pickup_location_name: form.pickup_location_name || 'My Restaurant',
        pickup_location_address: form.pickup_location_address || '142 Market Street, Floor 1',
        pickup_timing_text: form.pickup_timing_text || 'ASAP Pickup',
        pickup_phone: form.pickup_phone || '+389 70 000 000',
        social_facebook_url: form.social_facebook_url?.trim() || null,
        social_instagram_url: form.social_instagram_url?.trim() || null,
      });
      toast.success('Design settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Design Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize logo, hero section, colors, and typography. Changes apply to the public menu.
        </p>
        {isDemo && (
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-3 py-2">
            Demo account: you can view design settings, but saving changes is disabled.
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Branding */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Branding
            </h2>
            <div className="mb-4 max-w-md space-y-2">
              <Label htmlFor="app_name">App name</Label>
              <Input
                id="app_name"
                value={form.app_name}
                onChange={(e) => setForm((p) => ({ ...p, app_name: e.target.value }))}
                placeholder="FastOrdersapplication"
                maxLength={50}
                disabled={isDemo}
              />
              <p className="text-xs text-muted-foreground">
                This name is shown next to the logo in the header.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-16 w-40 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">No logo</span>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading || isDemo}
              >
                {logoUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Choose image
              </Button>
              {form.logo_url && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setRemoveLogoOpen(true)}
                  disabled={logoUploading || isDemo}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove logo
                </Button>
              )}
            </div>
          </div>

          {/* Footer — social links (menu page) */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-2">Footer &amp; social</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Links appear at the bottom of the public menu. Working hours come from{' '}
              <span className="font-medium text-foreground">Business hours</span> in the admin sidebar.
            </p>
            <div className="grid gap-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="social_facebook_url">Facebook URL</Label>
                <Input
                  id="social_facebook_url"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.facebook.com/your-page"
                  value={form.social_facebook_url ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, social_facebook_url: e.target.value || null }))
                  }
                  disabled={isDemo}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="social_instagram_url">Instagram URL</Label>
                <Input
                  id="social_instagram_url"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.instagram.com/your_profile"
                  value={form.social_instagram_url ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, social_instagram_url: e.target.value || null }))
                  }
                  disabled={isDemo}
                />
              </div>
            </div>
          </div>

          {/* Hero background */}
          <div ref={heroSectionRef} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Hero banner
            </h2>
            <div className="space-y-5">
              {/* Background image */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Background image</Label>
                <div className="flex flex-wrap items-center gap-3">
                  {form.hero_image_url ? (
                    <div
                      className="h-20 w-40 rounded-lg border border-border bg-muted bg-cover bg-center"
                      style={{ backgroundImage: `url(${form.hero_image_url})` }}
                    />
                  ) : (
                    <div className="h-20 w-40 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      ref={heroImageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleHeroImageChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => heroImageInputRef.current?.click()}
                      disabled={heroImageUploading || isDemo}
                    >
                      {heroImageUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                      {form.hero_image_url ? 'Change image' : 'Upload image'}
                    </Button>
                    {form.hero_image_url && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setRemoveHeroImageOpen(true)}
                        disabled={heroImageUploading || isDemo}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.hero_image_url
                    ? 'Image is used as the banner background. A dark overlay is applied for text readability.'
                    : 'No image set — gradient colors below will be used as the background.'}
                </p>
              </div>

              {/* Gradient colors */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gradient colors</Label>
                <p className="text-xs text-muted-foreground">
                  Used as the banner background when no image is set.
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">From</Label>
                    <input
                      type="color"
                      value={form.hero_gradient_from}
                      onChange={(e) => setForm((p) => ({ ...p, hero_gradient_from: e.target.value }))}
                      className="h-9 w-14 rounded border border-border cursor-pointer"
                      disabled={isDemo}
                    />
                    <Input
                      value={form.hero_gradient_from}
                      onChange={(e) => setForm((p) => ({ ...p, hero_gradient_from: e.target.value }))}
                      className="w-24 font-mono text-base"
                      disabled={isDemo}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">To</Label>
                    <input
                      type="color"
                      value={form.hero_gradient_to}
                      onChange={(e) => setForm((p) => ({ ...p, hero_gradient_to: e.target.value }))}
                      className="h-9 w-14 rounded border border-border cursor-pointer"
                      disabled={isDemo}
                    />
                    <Input
                      value={form.hero_gradient_to}
                      onChange={(e) => setForm((p) => ({ ...p, hero_gradient_to: e.target.value }))}
                      className="w-24 font-mono text-base"
                      disabled={isDemo}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-border">
                <div>
                  <Label htmlFor="hero_title">Hero Title</Label>
                  <Input
                    id="hero_title"
                    value={form.hero_title}
                    onChange={(e) => setForm((p) => ({ ...p, hero_title: e.target.value }))}
                    placeholder="РЕСТОРАН МЕНИ"
                    maxLength={HERO_TITLE_MAX}
                    className="mt-1"
                    disabled={isDemo}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.hero_title.length}/{HERO_TITLE_MAX}</p>
                </div>
                <div>
                  <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
                  <textarea
                    id="hero_subtitle"
                    value={form.hero_subtitle}
                    onChange={(e) => setForm((p) => ({ ...p, hero_subtitle: e.target.value }))}
                    placeholder="Порачај го твоето јадење од нашето мени"
                    maxLength={HERO_SUBTITLE_MAX}
                    rows={2}
                    className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isDemo}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.hero_subtitle.length}/{HERO_SUBTITLE_MAX}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Brand colors */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Brand colors</h2>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Primary</Label>
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
                  className="h-9 w-14 rounded border border-border cursor-pointer"
                  disabled={isDemo}
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
                  className="w-24 font-mono text-base"
                  disabled={isDemo}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Secondary</Label>
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) => setForm((p) => ({ ...p, secondary_color: e.target.value }))}
                  className="h-9 w-14 rounded border border-border cursor-pointer"
                  disabled={isDemo}
                />
                <Input
                  value={form.secondary_color}
                  onChange={(e) => setForm((p) => ({ ...p, secondary_color: e.target.value }))}
                  className="w-24 font-mono text-base"
                  disabled={isDemo}
                />
              </div>
            </div>
          </div>

          {/* Max product quantity */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Ordering</h2>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="max_product_quantity">Max quantity per product</Label>
              <Input
                id="max_product_quantity"
                type="number"
                min={1}
                max={99}
                value={form.max_product_quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setForm((p) => ({ ...p, max_product_quantity: Math.max(1, Math.min(99, v)) }));
                  else if (e.target.value === '') setForm((p) => ({ ...p, max_product_quantity: 5 }));
                }}
                className="w-20"
                disabled={isDemo}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of the same product a customer can add per item (1–99). Shown in the product modal and cart.
              </p>
            </div>
          </div>

          {/* Font & Button radius */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Typography & buttons</h2>
            <div className="grid gap-4 sm:grid-cols-2 max-w-md">
              <div>
                <Label className="text-xs">Font family</Label>
                <Select
                  value={form.font_family}
                  onValueChange={(v) => setForm((p) => ({ ...p, font_family: v }))}
                  disabled={isDemo}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Button radius</Label>
                <Select
                  value={form.button_radius}
                  onValueChange={(v) => setForm((p) => ({ ...p, button_radius: v as ButtonRadiusOption }))}
                  disabled={isDemo}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_RADIUS_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-foreground">Order Details</h2>
                <p className="text-xs text-muted-foreground">
                  Text shown in the order tracking pickup section.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
              <div className="space-y-1.5">
                <Label htmlFor="pickup_timing_text">ASAP pickup text</Label>
                <Input
                  id="pickup_timing_text"
                  value={form.pickup_timing_text ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pickup_timing_text: e.target.value }))
                  }
                  placeholder="ASAP Pickup"
                  className="max-w-md"
                  disabled={isDemo}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pickup_location_name">Restaurant name</Label>
                <Input
                  id="pickup_location_name"
                  value={form.pickup_location_name ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pickup_location_name: e.target.value }))
                  }
                  placeholder="My Restaurant"
                  className="max-w-md"
                  disabled={isDemo}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pickup_location_address">Restaurant address</Label>
                <Input
                  id="pickup_location_address"
                  value={form.pickup_location_address ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pickup_location_address: e.target.value }))
                  }
                  placeholder="142 Market Street, Floor 1"
                  className="max-w-md"
                  disabled={isDemo}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pickup_phone">Restaurant phone</Label>
                <Input
                  id="pickup_phone"
                  value={form.pickup_phone ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, pickup_phone: e.target.value }))
                  }
                  placeholder="+389 70 000 000"
                  className="max-w-md"
                  disabled={isDemo}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateSettings.isPending || isDemo}>
            {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save settings
          </Button>
        </>
      )}

      <AlertDialog open={removeLogoOpen} onOpenChange={setRemoveLogoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove logo?</AlertDialogTitle>
            <AlertDialogDescription>
              The logo image will be removed and the default icon will be shown on the public site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logoRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveLogo}
              disabled={logoRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {logoRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeHeroImageOpen} onOpenChange={setRemoveHeroImageOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove hero image?</AlertDialogTitle>
            <AlertDialogDescription>
              The hero background image will be removed and the hero will switch back to gradient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={heroImageRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveHeroImage}
              disabled={heroImageRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {heroImageRemoving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
