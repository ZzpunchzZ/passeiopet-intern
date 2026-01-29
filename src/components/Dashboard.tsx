import { useState, useMemo } from 'react';
import { Dog, X, Footprints, Sun, Clock, AlertTriangle, DollarSign, Calendar, Activity, Wrench } from 'lucide-react';
import { usePacks } from '../hooks/usePacks';
import { useOperations, formatOperationType, formatDate } from '../hooks/useOperations';
import { useSchedule } from '../hooks/useSchedule';
import { migrateScheduledServicesToDuration, previewMigration } from '../lib/migrations';
import type { OperationType, PackWithClient, PaymentStatus } from '../types';

// Format currency for display
function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Payment status config
const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; bgColor: string; textColor: string }> = {
  pending: { label: 'Pendente', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  partial: { label: 'Parcial', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  paid: { label: 'Pago', bgColor: 'bg-green-100', textColor: 'text-green-700' },
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
        <span className="text-gray-600">
          {used} / {total} créditos usados
        </span>
        <span
          className={`font-medium ${
            remaining <= 1
              ? 'text-red-600'
              : remaining <= 3
              ? 'text-orange-600'
              : 'text-emerald-600'
          }`}
        >
          {remaining} restante{remaining !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
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
      className={`bg-white rounded-2xl shadow-sm border-2 p-5 ${
        isLow ? 'border-orange-200' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isLow ? 'bg-orange-100' : 'bg-emerald-100'
            }`}
          >
            <Dog
              className={`w-6 h-6 ${isLow ? 'text-orange-600' : 'text-emerald-600'}`}
            />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {pack.client.petName}
            </h3>
            <p className="text-sm text-gray-500">{pack.client.ownerName}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            pack.serviceType === 'walk'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}
        >
          {pack.serviceType === 'walk' ? 'Passeio' : 'Pet Sitter'}
        </span>
      </div>

      {/* Package value and payment status */}
      <div className="flex items-center justify-between mb-3 py-2 px-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
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
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98]'
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-8 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Registrar Ponto</h2>
            <p className="text-sm text-gray-500">
              {pack.client.petName} • {remaining} crédito
              {remaining !== 1 ? 's' : ''} restante{remaining !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
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
                    ? 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    canUse ? 'bg-emerald-100' : 'bg-gray-200'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      canUse ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 rounded-t-3xl flex items-center justify-center">
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
          className="bg-white rounded-2xl border-2 border-gray-100 p-5 animate-pulse"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="h-3 bg-gray-200 rounded-full mb-4" />
          <div className="h-12 bg-gray-200 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Dog className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Nenhum ciclo ativo
      </h3>
      <p className="text-gray-500">
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
    emerald: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
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
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4 text-sm">
        Nenhuma atividade recente
      </p>
    );
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'walk':
        return <Footprints className="w-4 h-4 text-emerald-600" />;
      case 'full_day':
        return <Sun className="w-4 h-4 text-orange-500" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Footprints className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-2">
      {operations.map((op) => (
        <div
          key={op.id}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
        >
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
            {getOperationIcon(op.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 text-sm">{formatOperationType(op.type)}</p>
            <p className="text-xs text-gray-500 truncate">{formatDate(op.date)}</p>
          </div>
          <span className="text-xs font-medium text-gray-500">-{op.weight}</span>
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
  
  // Migration state
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'previewing' | 'migrating' | 'done'>('idle');
  const [migrationResult, setMigrationResult] = useState<{
    total?: number;
    updated?: number;
    skipped?: number;
    errors?: string[];
    toUpdate?: Array<{ id: string; currentSlot: string; newSlot: string; duration: number }>;
  } | null>(null);

  const handlePreviewMigration = async () => {
    setMigrationStatus('previewing');
    try {
      const result = await previewMigration();
      setMigrationResult(result);
      setMigrationStatus('idle');
    } catch (err) {
      console.error('Preview error:', err);
      setMigrationStatus('idle');
    }
  };

  const handleRunMigration = async () => {
    if (!confirm('Tem certeza que deseja migrar os dados? Esta ação não pode ser desfeita.')) return;
    
    setMigrationStatus('migrating');
    try {
      const result = await migrateScheduledServicesToDuration();
      setMigrationResult(result);
      setMigrationStatus('done');
    } catch (err) {
      console.error('Migration error:', err);
      setMigrationStatus('idle');
    }
  };

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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {packs.length} ciclo{packs.length !== 1 ? 's' : ''} ativo
          {packs.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Stats */}
        {!loading && packs.length > 0 && (
          <>
            {/* Today's schedule summary */}
            {!scheduleLoading && todayServices.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-blue-900">Hoje na Agenda</p>
                    <p className="text-sm text-blue-700">
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
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Contadores de Manejos
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{monthlyManejos}</p>
                  <p className="text-xs text-gray-500">Este Mês</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{totalCreditsRemaining}</p>
                  <p className="text-xs text-gray-500">Créditos Restantes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{lifetimeManejos}</p>
                  <p className="text-xs text-gray-500">Total Lifetime</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Migration Tool - temporary */}
        <section className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Migração de Dados (Slots de 30min)
          </h3>
          
          <p className="text-xs text-yellow-700 mb-3">
            Esta ferramenta atualiza os agendamentos antigos (slots de 1h) para o novo modelo (slots de 30min + duração).
          </p>
          
          <div className="flex gap-2 mb-3">
            <button
              onClick={handlePreviewMigration}
              disabled={migrationStatus !== 'idle'}
              className="px-3 py-2 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-lg hover:bg-yellow-200 disabled:opacity-50"
            >
              {migrationStatus === 'previewing' ? 'Analisando...' : 'Ver Preview'}
            </button>
            <button
              onClick={handleRunMigration}
              disabled={migrationStatus !== 'idle'}
              className="px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {migrationStatus === 'migrating' ? 'Migrando...' : 'Executar Migração'}
            </button>
          </div>

          {migrationResult && (
            <div className="bg-white rounded-lg p-3 text-xs">
              {migrationResult.toUpdate && (
                <>
                  <p className="font-medium text-gray-700">
                    {migrationResult.toUpdate.length} registros para atualizar
                  </p>
                  {migrationResult.toUpdate.slice(0, 5).map((item) => (
                    <p key={item.id} className="text-gray-500">
                      {item.currentSlot} → {item.newSlot} ({item.duration}min)
                    </p>
                  ))}
                  {migrationResult.toUpdate.length > 5 && (
                    <p className="text-gray-400">...e mais {migrationResult.toUpdate.length - 5}</p>
                  )}
                </>
              )}
              {migrationResult.updated !== undefined && (
                <div className="text-green-700">
                  <p>✅ Total: {migrationResult.total}</p>
                  <p>✅ Atualizados: {migrationResult.updated}</p>
                  <p>⏭️ Ignorados: {migrationResult.skipped}</p>
                  {migrationResult.errors && migrationResult.errors.length > 0 && (
                    <p className="text-red-600">❌ Erros: {migrationResult.errors.length}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Active Packs */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Ciclos Ativos</h2>
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
            <h2 className="text-lg font-bold text-gray-900 mb-3">Atividade Recente</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
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
