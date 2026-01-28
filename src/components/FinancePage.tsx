import { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Sun,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { usePacks } from '../hooks/usePacks';
import { useOperations } from '../hooks/useOperations';
import { Skeleton } from './ui/FormElements';
import type { PackWithClient, Operation, PaymentStatus } from '../types';

// Format currency
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

// Get month name in Portuguese
function getMonthName(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
}

// Stats Card Component
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: 'emerald' | 'blue' | 'orange' | 'red' | 'purple';
}

function StatsCard({ icon, label, value, subValue, color }: StatsCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-900/50 text-emerald-400',
    blue: 'bg-blue-900/50 text-blue-400',
    orange: 'bg-orange-900/50 text-orange-400',
    red: 'bg-red-900/50 text-red-400',
    purple: 'bg-purple-900/50 text-purple-400',
  };

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

// Payment Status Badge
function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config: Record<PaymentStatus, { label: string; bgColor: string; textColor: string }> = {
    pending: { label: 'Pendente', bgColor: 'bg-red-900/50', textColor: 'text-red-400' },
    partial: { label: 'Parcial', bgColor: 'bg-yellow-900/50', textColor: 'text-yellow-400' },
    paid: { label: 'Pago', bgColor: 'bg-emerald-900/50', textColor: 'text-emerald-400' },
  };
  const { label, bgColor, textColor } = config[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
}

// Pack Row Component
function PackRow({ pack }: { pack: PackWithClient }) {
  const progress = (pack.usedCredits / pack.totalCredits) * 100;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-gray-100 truncate">
            {pack.client.petName}
          </span>
          <PaymentStatusBadge status={pack.paymentStatus} />
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{pack.usedCredits}/{pack.totalCredits} créditos</span>
          <span>{formatCurrency(pack.packageValue)}</span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Monthly Operation Stats
interface MonthlyStats {
  totalOperations: number;
  totalManejos: number;
  walkCount: number;
  fullDayCount: number;
  partialCount: number;
}

function calculateMonthlyStats(operations: Operation[], month: Date): MonthlyStats {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

  const monthOps = operations.filter((op) => {
    const opDate = op.date.toDate();
    return opDate >= startOfMonth && opDate <= endOfMonth;
  });

  return {
    totalOperations: monthOps.length,
    totalManejos: monthOps.reduce((acc, op) => acc + op.weight, 0),
    walkCount: monthOps.filter((op) => op.type === 'walk').length,
    fullDayCount: monthOps.filter((op) => op.type === 'full_day').length,
    partialCount: monthOps.filter((op) => op.type === 'partial').length,
  };
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
            <Skeleton className="w-10 h-10 rounded-xl mb-3" />
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Finance Page
export function FinancePage() {
  const { packs, loading: packsLoading } = usePacks();
  const { operations, loading: opsLoading } = useOperations(undefined, undefined, 500);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const loading = packsLoading || opsLoading;

  // Calculate financial stats
  const stats = useMemo(() => {
    if (loading) return null;

    // Total revenue from paid packs
    const paidPacks = packs.filter((p) => p.paymentStatus === 'paid');
    const totalRevenue = paidPacks.reduce((acc, p) => acc + p.packageValue, 0);

    // Pending revenue
    const pendingPacks = packs.filter((p) => p.paymentStatus === 'pending');
    const pendingRevenue = pendingPacks.reduce((acc, p) => acc + p.packageValue, 0);

    // Partial revenue
    const partialPacks = packs.filter((p) => p.paymentStatus === 'partial');
    const partialRevenue = partialPacks.reduce((acc, p) => acc + p.packageValue, 0);

    // Active packs value (forecast)
    const activePacks = packs.filter((p) => p.isActive);
    const forecastRevenue = activePacks.reduce((acc, p) => acc + p.packageValue, 0);

    // Monthly operation stats
    const monthlyStats = calculateMonthlyStats(operations, selectedMonth);

    // Lifetime stats
    const lifetimeManejos = operations.reduce((acc, op) => acc + op.weight, 0);
    const lifetimeOperations = operations.length;

    return {
      totalRevenue,
      pendingRevenue,
      partialRevenue,
      forecastRevenue,
      activePacks: activePacks.length,
      paidPacks: paidPacks.length,
      pendingPacks: pendingPacks.length,
      monthlyStats,
      lifetimeManejos,
      lifetimeOperations,
    };
  }, [packs, operations, loading, selectedMonth]);

  // Navigate months
  const prevMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Pack lists by payment status
  const pendingPacks = packs.filter((p) => p.paymentStatus === 'pending' && p.isActive);
  const partialPacks = packs.filter((p) => p.paymentStatus === 'partial' && p.isActive);

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-100">Financeiro</h1>
        <p className="text-sm text-gray-400">Visão geral de faturamento</p>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {loading ? (
          <LoadingSkeleton />
        ) : stats ? (
          <>
            {/* Revenue Overview */}
            <section>
              <h2 className="text-lg font-bold text-gray-100 mb-3">Faturamento</h2>
              <div className="grid grid-cols-2 gap-3">
                <StatsCard
                  icon={<DollarSign className="w-5 h-5" />}
                  label="Recebido (Pagos)"
                  value={formatCurrency(stats.totalRevenue)}
                  subValue={`${stats.paidPacks} ciclos`}
                  color="emerald"
                />
                <StatsCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="Previsão (Ativos)"
                  value={formatCurrency(stats.forecastRevenue)}
                  subValue={`${stats.activePacks} ciclos ativos`}
                  color="blue"
                />
                <StatsCard
                  icon={<AlertCircle className="w-5 h-5" />}
                  label="Pendente"
                  value={formatCurrency(stats.pendingRevenue)}
                  subValue={`${stats.pendingPacks} ciclos`}
                  color="red"
                />
                <StatsCard
                  icon={<TrendingDown className="w-5 h-5" />}
                  label="Parcial"
                  value={formatCurrency(stats.partialRevenue)}
                  color="orange"
                />
              </div>
            </section>

            {/* Monthly Stats */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-100">
                  Manejos do Mês
                </h2>
                <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-2 py-1">
                  <button onClick={prevMonth} className="p-1 hover:bg-gray-700 rounded-lg">
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <span className="text-sm font-medium text-gray-300 capitalize min-w-[100px] text-center">
                    {getMonthName(selectedMonth)} {selectedMonth.getFullYear()}
                  </span>
                  <button onClick={nextMonth} className="p-1 hover:bg-gray-700 rounded-lg">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <p className="text-3xl font-bold text-emerald-400">
                      {stats.monthlyStats.totalManejos}
                    </p>
                    <p className="text-xs text-gray-400">Manejos Total</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-blue-400">
                      {stats.monthlyStats.totalOperations}
                    </p>
                    <p className="text-xs text-gray-400">Operações</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-purple-400">
                      {stats.lifetimeManejos}
                    </p>
                    <p className="text-xs text-gray-400">Lifetime Total</p>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <p className="text-sm font-medium text-gray-300 mb-3">
                    Detalhamento do Mês
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-emerald-900/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Footprints className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-gray-300">Passeios</span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {stats.monthlyStats.walkCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-900/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-gray-300">Diárias</span>
                      </div>
                      <span className="font-bold text-orange-400">
                        {stats.monthlyStats.fullDayCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-900/40 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-300">Parciais</span>
                      </div>
                      <span className="font-bold text-blue-400">
                        {stats.monthlyStats.partialCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Pending Payments */}
            {pendingPacks.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-100 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Pagamentos Pendentes ({pendingPacks.length})
                </h2>
                <div className="space-y-3">
                  {pendingPacks.map((pack) => (
                    <PackRow key={pack.id} pack={pack} />
                  ))}
                </div>
              </section>
            )}

            {/* Partial Payments */}
            {partialPacks.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-100 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-400" />
                  Pagamentos Parciais ({partialPacks.length})
                </h2>
                <div className="space-y-3">
                  {partialPacks.map((pack) => (
                    <PackRow key={pack.id} pack={pack} />
                  ))}
                </div>
              </section>
            )}

            {/* All Active Packs */}
            <section>
              <h2 className="text-lg font-bold text-gray-100 mb-3">
                Todos os Ciclos Ativos ({packs.length})
              </h2>
              {packs.length === 0 ? (
                <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 text-center">
                  <p className="text-gray-400">Nenhum ciclo ativo no momento</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {packs.map((pack) => (
                    <PackRow key={pack.id} pack={pack} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
