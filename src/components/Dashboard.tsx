import { useState, useMemo } from 'react';
import { Dog, X, Footprints, Sun, Clock, TrendingUp, AlertTriangle, DollarSign, Calendar, Activity } from 'lucide-react';
import { usePacks } from '../hooks/usePacks';
import { useOperations, formatOperationType, formatDate } from '../hooks/useOperations';
import { useSchedule } from '../hooks/useSchedule';
import type { OperationType, PackWithClient, PaymentStatus, Operation } from '../types';

// Format currency for display
function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Payment status config
const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; bgColor: string; textColor: string }> = {
  pending: { label: 'Pendente', bgColor: 'bg-red-900/50', textColor: 'text-red-400' },
  partial: { label: 'Parcial', bgColor: 'bg-yellow-900/50', textColor: 'text-yellow-400' },
  paid: { label: 'Pago', bgColor: 'bg-green-900/50', textColor: 'text-green-400' },
};

// Operation type labels and icons
const OPERATION_OPTIONS: {
  type: OperationType;
  label: string;
  icon: typeof Footprints;
  description: string;
}[] = [
  { type: 'walk', label: 'Passeio', icon: Footprints, description: '1 crédito' },
  { type: 'full_day', label: 'Diária', icon: Sun, description: '2 créditos' },
  { type: 'partial', label: 'Parcial', icon: Clock, description: '1 crédito' },
];

// Progress bar component
function ProgressBar({
  used,
  total,
}: {
  used: number;
  total: number;
}) {
  const percentage = (used / total) * 100;
  const remaining = total - used;

  // Color based on remaining credits
  const getBarColor = () => {
    if (remaining <= 1) return 'bg-red-500';
    if (remaining <= 3) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">
          {used} / {total} créditos usados
        </span>
        <span
          className={`font-medium ${
            remaining <= 1
              ? 'text-red-400'
              : remaining <= 3
              ? 'text-orange-400'
              : 'text-emerald-400'
          }`}
        >
          {remaining} restante{remaining !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Pet Card component
function PetCard({
  pack,
  onRegister,
}: {
  pack: PackWithClient;
  onRegister: (pack: PackWithClient) => void;
}) {
  const remaining = pack.totalCredits - pack.usedCredits;
  const isLow = remaining <= 3;
  const paymentConfig = PAYMENT_STATUS_CONFIG[pack.paymentStatus];

  return (
    <div
      className={`bg-gray-800 rounded-2xl shadow-sm border-2 p-5 ${
        isLow ? 'border-orange-700' : 'border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isLow ? 'bg-orange-900/50' : 'bg-emerald-900/50'
            }`}
          >
            <Dog
              className={`w-6 h-6 ${isLow ? 'text-orange-400' : 'text-emerald-400'}`}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-100">
              {pack.client.petName}
            </h3>
            <p className="text-sm text-gray-400">{pack.client.ownerName}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            pack.serviceType === 'walk'
              ? 'bg-blue-900/50 text-blue-400'
              : 'bg-purple-900/50 text-purple-400'
          }`}
        >
          {pack.serviceType === 'walk' ? 'Passeio' : 'Pet Sitter'}
        </span>
      </div>

      {/* Package value and payment status */}
      <div className="flex items-center justify-between mb-3 py-2 px-3 bg-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            {formatCurrency(pack.packageValue)}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentConfig.bgColor} ${paymentConfig.textColor}`}>
          {paymentConfig.label}
        </span>
      </div>

      <ProgressBar used={pack.usedCredits} total={pack.totalCredits} />

      <button
        onClick={() => onRegister(pack)}
        disabled={remaining === 0}
        className={`mt-4 w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${
          remaining === 0
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'
        }`}
      >
        {remaining === 0 ? 'Créditos Esgotados' : 'Registrar Ponto'}
      </button>
    </div>
  );
}

// Operation Drawer/Modal
function OperationDrawer({
  pack,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  pack: PackWithClient;
  onClose: () => void;
  onConfirm: (type: OperationType) => void;
  isSubmitting: boolean;
}) {
  const remaining = pack.totalCredits - pack.usedCredits;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-gray-800 rounded-t-3xl p-6 pb-8 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-100">Registrar Ponto</h2>
            <p className="text-sm text-gray-400">
              {pack.client.petName} • {remaining} crédito
              {remaining !== 1 ? 's' : ''} restante{remaining !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          {OPERATION_OPTIONS.map((option) => {
            const Icon = option.icon;
            const canUse = option.type === 'full_day' ? remaining >= 2 : remaining >= 1;

            return (
              <button
                key={option.type}
                onClick={() => onConfirm(option.type)}
                disabled={!canUse || isSubmitting}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  canUse
                    ? 'border-gray-600 hover:border-emerald-500 hover:bg-emerald-900/30'
                    : 'border-gray-700 bg-gray-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    canUse ? 'bg-emerald-900/50' : 'bg-gray-600'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      canUse ? 'text-emerald-400' : 'text-gray-500'
                    }`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-100">{option.label}</p>
                  <p className="text-sm text-gray-400">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {isSubmitting && (
          <div className="absolute inset-0 bg-gray-800/80 rounded-t-3xl flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-gray-800 rounded-2xl border-2 border-gray-700 p-5 animate-pulse"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-700" />
            <div className="flex-1">
              <div className="h-6 w-32 bg-gray-700 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-700 rounded" />
            </div>
          </div>
          <div className="h-3 bg-gray-700 rounded-full mb-4" />
          <div className="h-12 bg-gray-700 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <Dog className="w-10 h-10 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-100 mb-2">
        Nenhum ciclo ativo
      </h3>
      <p className="text-gray-400">
        Cadastre clientes e crie ciclos para começar
      </p>
    </div>
  );
}

// Stats Card
function StatsCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'emerald' | 'orange' | 'blue';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-900/50 text-emerald-400',
    orange: 'bg-orange-900/50 text-orange-400',
    blue: 'bg-blue-900/50 text-blue-400',
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

// Recent Activity Component
function RecentActivity() {
  const { operations, loading } = useOperations(undefined, undefined, 5);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <p className="text-center text-gray-400 py-4 text-sm">
        Nenhuma atividade recente
      </p>
    );
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'walk':
        return <Footprints className="w-4 h-4 text-emerald-400" />;
      case 'full_day':
        return <Sun className="w-4 h-4 text-orange-400" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-blue-400" />;
      default:
        return <Footprints className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-2">
      {operations.map((op) => (
        <div
          key={op.id}
          className="flex items-center gap-3 p-3 bg-gray-700 rounded-xl"
        >
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shadow-sm">
            {getOperationIcon(op.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-100 text-sm">{formatOperationType(op.type)}</p>
            <p className="text-xs text-gray-400 truncate">{formatDate(op.date)}</p>
          </div>
          <span className="text-xs font-medium text-gray-400">-{op.weight}</span>
        </div>
      ))}
    </div>
  );
}

// Main Dashboard component
export function Dashboard() {
  const { packs, loading, error, registerOperation } = usePacks();
  const { operations, loading: opsLoading } = useOperations(undefined, undefined, 500);
  const { todayServices, loading: scheduleLoading } = useSchedule();
  const [selectedPack, setSelectedPack] = useState<PackWithClient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (type: OperationType) => {
    if (!selectedPack) return;

    setIsSubmitting(true);
    try {
      await registerOperation(selectedPack.id, selectedPack.clientId, type);
      setSelectedPack(null);
    } catch (err) {
      console.error('Error:', err);
      alert(err instanceof Error ? err.message : 'Erro ao registrar operação');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats
  const lowCreditPacks = packs.filter((p) => p.totalCredits - p.usedCredits <= 3);
  const totalCreditsRemaining = packs.reduce((acc, p) => acc + (p.totalCredits - p.usedCredits), 0);

  // Calculate monthly and lifetime stats
  const { monthlyManejos, lifetimeManejos } = useMemo(() => {
    if (opsLoading) return { monthlyManejos: 0, lifetimeManejos: 0 };
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyOps = operations.filter((op) => {
      const opDate = op.date?.toDate?.();
      return opDate && opDate >= startOfMonth;
    });
    
    return {
      monthlyManejos: monthlyOps.reduce((acc, op) => acc + op.weight, 0),
      lifetimeManejos: operations.reduce((acc, op) => acc + op.weight, 0),
    };
  }, [operations, opsLoading]);

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-400">
          {packs.length} ciclo{packs.length !== 1 ? 's' : ''} ativo
          {packs.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Stats */}
        {!loading && packs.length > 0 && (
          <>
            {/* Today's schedule summary */}
            {!scheduleLoading && todayServices.length > 0 && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-blue-300">Hoje na Agenda</p>
                    <p className="text-sm text-blue-400">
                      {todayServices.length} serviço{todayServices.length !== 1 ? 's' : ''} agendado{todayServices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatsCard
                icon={<Dog className="w-5 h-5" />}
                label="Ciclos Ativos"
                value={packs.length}
                color="emerald"
              />
              <StatsCard
                icon={<AlertTriangle className="w-5 h-5" />}
                label="Acabando"
                value={lowCreditPacks.length}
                color="orange"
              />
            </div>

            {/* Manejos counters */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Contadores de Manejos
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{monthlyManejos}</p>
                  <p className="text-xs text-gray-400">Este Mês</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{totalCreditsRemaining}</p>
                  <p className="text-xs text-gray-400">Créditos Restantes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{lifetimeManejos}</p>
                  <p className="text-xs text-gray-400">Total Lifetime</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Active Packs */}
        <section>
          <h2 className="text-lg font-bold text-gray-100 mb-3">Ciclos Ativos</h2>
          {loading ? (
            <LoadingSkeleton />
          ) : packs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {packs.map((pack) => (
                <PetCard
                  key={pack.id}
                  pack={pack}
                  onRegister={setSelectedPack}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        {!loading && packs.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-100 mb-3">Atividade Recente</h2>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
              <RecentActivity />
            </div>
          </section>
        )}
      </main>

      {/* Operation Drawer */}
      {selectedPack && (
        <OperationDrawer
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
          onConfirm={handleRegister}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
