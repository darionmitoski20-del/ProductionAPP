import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  useSalesReport,
  getDateRangeForPreset,
  type SalesReportDetailRow,
  type SalesReportSummary,
} from '@/hooks/useSalesReport';
import { StatCard } from '@/components/admin';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Loader2,
  FileDown,
  ShoppingBag,
  Package,
  DollarSign,
  Award,
  FolderOpen,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { exportReportToPdf } from '@/lib/exportReportToPdf';
import { useDesignSettingsContext } from '@/contexts/DesignSettingsContext';

type Preset = 'daily' | 'weekly' | 'monthly' | 'custom';

export default function AdminReports() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { settings: designSettings } = useDesignSettingsContext();
  const [preset, setPreset] = useState<Preset>('weekly');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) navigate('/auth');
  }, [loading, user, isAdmin, navigate]);

  const handleGenerate = useCallback(() => {
    if (preset === 'custom') {
      if (!customFrom || !customTo) return;
      setDateFrom(new Date(customFrom).toISOString());
      setDateTo(new Date(customTo + 'T23:59:59.999').toISOString());
    } else {
      const range = getDateRangeForPreset(preset);
      setDateFrom(range.dateFrom);
      setDateTo(range.dateTo);
    }
    setHasGenerated(true);
  }, [preset, customFrom, customTo]);

  const enabled = hasGenerated && !!dateFrom && !!dateTo;
  const { data: report, isLoading } = useSalesReport(dateFrom, dateTo, enabled);

  const [exporting, setExporting] = useState(false);
  const handleExportPdf = useCallback(async () => {
    if (!report || !dateFrom || !dateTo) return;
    setExporting(true);
    try {
      const periodLabel =
        preset === 'custom' && customFrom && customTo
          ? `${customFrom} — ${customTo}`
          : `${format(parseISO(dateFrom), 'dd MMM yyyy')} — ${format(parseISO(dateTo), 'dd MMM yyyy')}`;
      await exportReportToPdf({
        period: periodLabel,
        summary: report.summary,
        details: report.details,
        appName: designSettings?.app_name || designSettings?.hero_title || undefined,
      });
    } finally {
      setExporting(false);
    }
  }, [report, dateFrom, dateTo, preset, customFrom, customTo, designSettings?.app_name, designSettings?.hero_title]);

  if (loading || !user || !isAdmin) return null;

  const periodLabel =
    dateFrom && dateTo
      ? `${format(parseISO(dateFrom), 'dd MMM yyyy')} — ${format(parseISO(dateTo), 'dd MMM yyyy')}`
      : '';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate sales reports and export to PDF
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm mb-6">
        <h2 className="font-semibold text-foreground mb-4">Report period</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-wrap gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <Button
                key={p}
                variant={preset === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreset(p)}
              >
                {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : 'Monthly'}
              </Button>
            ))}
            <Button
              variant={preset === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset('custom')}
            >
              Custom range
            </Button>
          </div>
          {preset === 'custom' && (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-[140px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-[140px]"
                />
              </div>
            </div>
          )}
          <Button onClick={handleGenerate} disabled={preset === 'custom' && (!customFrom || !customTo)}>
            Generate Report
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={!report?.details?.length || exporting}
          >
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            {exporting ? 'Exporting...' : 'Export to PDF'}
          </Button>
        </div>
      </div>

      {!hasGenerated && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Select a period and click Generate Report.</p>
        </div>
      )}

      {hasGenerated && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 mb-6">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-[100px] rounded-xl" />
              ))
            ) : report ? (
              <>
                <StatCard
                  title="Total Orders"
                  value={report.summary.total_orders}
                  icon={ShoppingBag}
                />
                <StatCard
                  title="Total Items Sold"
                  value={report.summary.total_items_sold}
                  icon={Package}
                />
                <StatCard
                  title="Total Revenue"
                  value={formatPrice(report.summary.total_revenue)}
                  icon={DollarSign}
                />
                <StatCard
                  title="Best Selling Product"
                  value={report.summary.best_selling_product}
                  icon={Award}
                />
                <StatCard
                  title="Best Selling Category"
                  value={report.summary.best_selling_category}
                  icon={FolderOpen}
                />
              </>
            ) : null}
          </div>

          {/* Data table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-foreground">Sales by product</h2>
              {periodLabel && (
                <p className="mt-0.5 text-xs text-muted-foreground">{periodLabel}</p>
              )}
            </div>
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : !report?.details?.length ? (
                <p className="p-5 text-sm text-muted-foreground">
                  No sales in the selected period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.details.map((row) => (
                      <TableRow key={row.product_id}>
                        <TableCell className="font-medium">{row.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.category_name}
                        </TableCell>
                        <TableCell className="text-right">{row.quantity_sold}</TableCell>
                        <TableCell className="text-right">
                          {formatPrice(row.total_revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
