import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Edit,
  Archive,
  RotateCcw,
  Plus,
  Package,
  Calendar,
  DollarSign,
  XCircle,
  Trash2,
  MoreVertical,
  X,
  Check,
  Copy,
  CheckCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useClientPacks } from '../hooks/useClientPacks';
import { useOperations, formatOperationType, formatShortDate } from '../hooks/useOperations';
import { useSchedule } from '../hooks/useSchedule';
import { Drawer } from './ui/Modal';
import { Input, Select, Button, Badge, Card, EmptyState, Skeleton } from './ui/FormElements';
import { PetAvatar } from './ui/PetAvatar';
import type { Client, Pack, PaymentStatus, ServiceType, OperationType, ScheduledServiceWithClient, ServiceDuration, SitterPlan } from '../types';
import { SITTER_PLAN_OPTIONS, WALK_DURATION_OPTIONS } from '../types';

interface ClientDetailProps {
  client: Client;
  onBack: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

// Helper to format currency
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

// Helper to format date
function formatDateDisplay(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return 'Até o momento';
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date);
}

// Pack Form Component
interface PackFormProps {
  clientId: string;
  onSubmit: (data: {
    serviceType: ServiceType;
    totalCredits: number;
    packageValue: number;
    startDate: Date;
    endDate: Date | null;
    walkDuration?: ServiceDuration;
    sitterPlan?: SitterPlan;
  }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function PackForm({ onSubmit, onClose, isLoading }: PackFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    serviceType: 'walk' as ServiceType,
    totalCredits: 8,
    packageValue: '',
    startDate: today,
    endDate: '',
    walkDuration: 60 as ServiceDuration,
    sitterPlan: 'visita_media' as SitterPlan,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valueInCents = Math.round(parseFloat(formData.packageValue.replace(',', '.')) * 100) || 0;
    await onSubmit({
      serviceType: formData.serviceType,
      totalCredits: formData.serviceType === 'sitter' ? 9999 : formData.totalCredits, // Ilimitado para sitter
      packageValue: valueInCents,
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : null,
      walkDuration: formData.serviceType === 'walk' ? formData.walkDuration : undefined,
      sitterPlan: formData.serviceType === 'sitter' ? formData.sitterPlan : undefined,
    });
  };

  const creditOptions = [4, 8, 12, 16, 20].map((n) => ({
    value: String(n),
    label: `${n} passeios`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Tipo de Serviço"
        value={formData.serviceType}
        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as ServiceType })}
        options={[
          { value: 'walk', label: 'Passeio (com plano)' },
          { value: 'sitter', label: 'Pet Sitter (com diária)' },
        ]}
      />
      
      {/* Para Passeio: mostrar total de passeios e duração padrão */}
      {formData.serviceType === 'walk' && (
        <>
          <Select
            label="Total de Passeios"
            value={String(formData.totalCredits)}
            onChange={(e) => setFormData({ ...formData, totalCredits: Number(e.target.value) })}
            options={creditOptions}
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duração do Passeio
            </label>
            <div className="grid grid-cols-4 gap-2">
              {WALK_DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, walkDuration: option.value })}
                  className={`py-2 px-3 text-sm font-medium rounded-xl transition-all ${
                    formData.walkDuration === option.value
                      ? 'bg-emerald-600 text-white border-2 border-emerald-500'
                      : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-emerald-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Para Pet Sitter: mostrar plano de visita */}
      {formData.serviceType === 'sitter' && (
        <>
          <Select
            label="Plano de Visita"
            value={formData.sitterPlan}
            onChange={(e) => setFormData({ ...formData, sitterPlan: e.target.value as SitterPlan })}
            options={SITTER_PLAN_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
          />
          <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-3">
            <p className="text-sm text-purple-400">
              🏠 Pet Sitter tem diárias ilimitadas. O controle será feito pelo período contratado.
            </p>
          </div>
        </>
      )}

      <Input
        label="Valor do Pacote (R$)"
        type="text"
        placeholder="150,00"
        value={formData.packageValue}
        onChange={(e) => setFormData({ ...formData, packageValue: e.target.value })}
      />
      <Input
        label="Data de Início"
        type="date"
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
      />
      {formData.serviceType === 'sitter' && (
        <Input
          label="Data de Término (Pet Sitter)"
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
        />
      )}
      {formData.serviceType === 'walk' && (
        <p className="text-sm text-gray-400 italic">
          Para Passeio, o pacote fica ativo até ser encerrado manualmente ou os créditos acabarem.
        </p>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          Criar Pacote
        </Button>
      </div>
    </form>
  );
}

// Edit Pack Form Component
interface EditPackFormProps {
  pack: Pack;
  onSubmit: (data: {
    serviceType: ServiceType;
    totalCredits: number;
    packageValue: number;
    startDate: Date;
    endDate: Date | null;
    walkDuration?: ServiceDuration;
    sitterPlan?: SitterPlan;
  }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function EditPackForm({ pack, onSubmit, onClose, isLoading }: EditPackFormProps) {
  const formatDateForInput = (timestamp: Timestamp | null | undefined): string => {
    if (!timestamp) return '';
    return timestamp.toDate().toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    serviceType: pack.serviceType,
    totalCredits: pack.totalCredits,
    packageValue: ((pack.packageValue || 0) / 100).toFixed(2).replace('.', ','),
    startDate: formatDateForInput(pack.startDate),
    endDate: formatDateForInput(pack.endDate),
    walkDuration: (pack.walkDuration || 60) as ServiceDuration,
    sitterPlan: (pack.sitterPlan || 'visita_media') as SitterPlan,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valueInCents = Math.round(parseFloat(formData.packageValue.replace(',', '.')) * 100) || 0;
    await onSubmit({
      serviceType: formData.serviceType,
      totalCredits: formData.serviceType === 'sitter' ? 9999 : formData.totalCredits,
      packageValue: valueInCents,
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : null,
      walkDuration: formData.serviceType === 'walk' ? formData.walkDuration : undefined,
      sitterPlan: formData.serviceType === 'sitter' ? formData.sitterPlan : undefined,
    });
  };

  const creditOptions = [4, 8, 12, 16, 20].map((n) => ({
    value: String(n),
    label: `${n} passeios`,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Tipo de Serviço"
        value={formData.serviceType}
        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as ServiceType })}
        options={[
          { value: 'walk', label: 'Passeio (com plano)' },
          { value: 'sitter', label: 'Pet Sitter (com diária)' },
        ]}
      />
      
      {/* Para Passeio: mostrar total de passeios e duração padrão */}
      {formData.serviceType === 'walk' && (
        <>
          <Select
            label="Total de Passeios"
            value={String(formData.totalCredits)}
            onChange={(e) => setFormData({ ...formData, totalCredits: Number(e.target.value) })}
            options={creditOptions}
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duração do Passeio
            </label>
            <div className="grid grid-cols-4 gap-2">
              {WALK_DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, walkDuration: option.value })}
                  className={`py-2 px-3 text-sm font-medium rounded-xl transition-all ${
                    formData.walkDuration === option.value
                      ? 'bg-emerald-600 text-white border-2 border-emerald-500'
                      : 'bg-gray-700 text-gray-300 border-2 border-gray-600 hover:border-emerald-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Para Pet Sitter: mostrar plano de visita */}
      {formData.serviceType === 'sitter' && (
        <>
          <Select
            label="Plano de Visita"
            value={formData.sitterPlan}
            onChange={(e) => setFormData({ ...formData, sitterPlan: e.target.value as SitterPlan })}
            options={SITTER_PLAN_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
          />
          <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-3">
            <p className="text-sm text-purple-400">
              🏠 Pet Sitter tem diárias ilimitadas. O controle será feito pelo período contratado.
            </p>
          </div>
        </>
      )}

      <Input
        label="Valor do Pacote (R$)"
        type="text"
        placeholder="150,00"
        value={formData.packageValue}
        onChange={(e) => setFormData({ ...formData, packageValue: e.target.value })}
      />
      <Input
        label="Data de Início"
        type="date"
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
      />
      {formData.serviceType === 'sitter' && (
        <Input
          label="Data de Término (Pet Sitter)"
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
        />
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          Salvar Alterações
        </Button>
      </div>
    </form>
  );
}

// Pack Card Component
interface PackCardProps {
  pack: Pack;
  clientId: string;
  onUpdatePayment: (status: PaymentStatus, paidAmount?: number, paymentDate?: Date) => void;
  onMarkAsPaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClosePack: () => void;
  onPartialPayment: () => void;
  onExport: () => void;
}

function PackCard({ pack, clientId, onUpdatePayment, onMarkAsPaid, onEdit, onDelete, onClosePack, onPartialPayment, onExport }: PackCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const isSitter = pack.serviceType === 'sitter';
  const remaining = isSitter ? 'ilimitado' : pack.totalCredits - pack.usedCredits;
  const percentage = isSitter ? 0 : (pack.usedCredits / pack.totalCredits) * 100;
  const isLow = !isSitter && typeof remaining === 'number' && remaining <= 2 && pack.isActive;
  const isCompleted = !pack.isActive || (!isSitter && remaining === 0);

  // Get duration/plan label
  const getDurationLabel = () => {
    if (pack.serviceType === 'walk') {
      const option = WALK_DURATION_OPTIONS.find(d => d.value === pack.walkDuration);
      return option ? option.label : '1 hora';
    } else {
      const option = SITTER_PLAN_OPTIONS.find(p => p.value === pack.sitterPlan);
      return option ? option.label : 'Visita Média';
    }
  };

  const getPaymentBadge = () => {
    switch (pack.paymentStatus) {
      case 'paid':
        return <Badge variant="success">Pago</Badge>;
      case 'partial':
        return <Badge variant="warning">Parcial</Badge>;
      case 'pending':
        return <Badge variant="danger">Pendente</Badge>;
    }
  };

  const getBarColor = () => {
    if (isCompleted) return 'bg-gray-500';
    if (isLow) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  return (
    <Card className={isCompleted ? 'opacity-75' : ''}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className={`w-5 h-5 ${isCompleted ? 'text-gray-500' : 'text-emerald-400'}`} />
          <span className="font-semibold text-gray-100">
            {pack.serviceType === 'walk' ? 'Passeio' : 'Pet Sitter'}
            {pack.cycleNumber && <span className="text-gray-400 font-normal ml-1">• Ciclo {pack.cycleNumber}</span>}
          </span>
          {!pack.isActive && <Badge variant="default">Encerrado</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {getPaymentBadge()}
          {/* Menu dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-full hover:bg-gray-700 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-8 z-20 w-36 bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-600 flex items-center gap-2 text-gray-200"
                  >
                    <Edit className="w-4 h-4 text-gray-400" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-600 flex items-center gap-2 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pack Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <DollarSign className="w-4 h-4" />
          <span>{formatCurrency(pack.packageValue || 0)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>
            {formatDateDisplay(pack.startDate)} - {formatDateDisplay(pack.endDate)}
          </span>
        </div>
      </div>

      {/* Duration/Plan Info */}
      <div className="bg-gray-700/50 rounded-lg px-3 py-2 mb-3 text-sm">
        <span className="text-gray-300">
          ⏱️ {getDurationLabel()}
        </span>
      </div>

      {/* Payment date if paid */}
      {pack.paymentStatus === 'paid' && pack.paymentDate && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg px-3 py-2 mb-3 text-sm">
          <span className="text-emerald-400">
            ✓ Pago em {formatDateDisplay(pack.paymentDate)}
          </span>
        </div>
      )}

      {/* Progress bar - only for walk type */}
      {!isSitter && (
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">
              {pack.usedCredits} / {pack.totalCredits} passeios
            </span>
            <span className={`font-medium ${isLow ? 'text-orange-400' : 'text-gray-400'}`}>
              {remaining} restante{typeof remaining === 'number' && remaining !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor()} transition-all rounded-full`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* For sitter, show simple count */}
      {isSitter && (
        <div className="mb-3 text-sm text-gray-400">
          <span>🏠 {pack.usedCredits} visitas realizadas</span>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {/* Payment Status Actions */}
        {pack.paymentStatus !== 'paid' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onMarkAsPaid}
              className="flex-1"
            >
              Marcar Pago
            </Button>
            {(pack.paymentStatus === 'pending' || pack.paymentStatus === 'partial') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onPartialPayment}
                className="flex-1"
              >
                {pack.paymentStatus === 'partial' ? 'Editar Valor' : 'Pagamento Parcial'}
              </Button>
            )}
          </div>
        )}
        {/* Show partial payment info */}
        {pack.paymentStatus === 'partial' && pack.paidAmount !== undefined && pack.paidAmount > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-2 text-sm">
            <span className="text-yellow-400">
              Pago: {formatCurrency(pack.paidAmount)} de {formatCurrency(pack.packageValue)}
            </span>
            <span className="text-yellow-500 ml-2">
              (Faltam {formatCurrency(pack.packageValue - pack.paidAmount)})
            </span>
          </div>
        )}
        {/* Undo payment - allow reverting paid status */}
        {pack.paymentStatus === 'paid' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdatePayment('pending')}
              className="flex-1 text-orange-400 hover:bg-orange-900/30"
            >
              Desfazer Pagamento
            </Button>
          </div>
        )}
        {pack.paymentStatus === 'paid' && pack.isActive && !isSitter && remaining === 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onClosePack}
            leftIcon={<XCircle className="w-4 h-4" />}
            className="w-full"
          >
            Encerrar Pacote
          </Button>
        )}
        {pack.isActive && pack.serviceType === 'walk' && typeof remaining === 'number' && remaining > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClosePack}
            className="w-full text-gray-500"
          >
            Encerrar Antecipadamente
          </Button>
        )}
        {pack.isActive && isSitter && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClosePack}
            className="w-full text-gray-500"
          >
            Encerrar Ciclo
          </Button>
        )}
      </div>

      {/* Histórico do ciclo */}
      <PackOperationsHistory 
        clientId={clientId} 
        pack={pack} 
        onExport={onExport}
      />
    </Card>
  );
}

// Pack Operations History Component (histórico dentro do ciclo)
interface PackOperationsHistoryProps {
  clientId: string;
  pack: Pack;
  onExport: () => void;
}

function PackOperationsHistory({ clientId, pack, onExport }: PackOperationsHistoryProps) {
  const { operations, loading: operationsLoading } = useOperations(undefined, clientId, 100);
  const { allServices, loading: servicesLoading, revertServiceStatus } = useSchedule();
  const [reverting, setReverting] = useState<string | null>(null);
  const [confirmRevert, setConfirmRevert] = useState<{ service: ScheduledServiceWithClient; itemType: 'completed' | 'not_done' } | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Get date range from the pack - usando apenas a parte da data (YYYY-MM-DD) para comparação
  const packStartDate = pack.startDate?.toDate() || new Date(0);
  // Criar data de início às 00:00:00 no horário local
  const packStart = new Date(packStartDate.getFullYear(), packStartDate.getMonth(), packStartDate.getDate(), 0, 0, 0, 0);
  
  // Se o ciclo não foi finalizado, usar amanhã como data final
  let packEnd: Date;
  if (!pack.endDate || pack.isActive) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    packEnd = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);
  } else {
    const packEndDate = pack.endDate.toDate();
    packEnd = new Date(packEndDate.getFullYear(), packEndDate.getMonth(), packEndDate.getDate(), 23, 59, 59, 999);
  }

  // Filter services for this client within the pack date range
  const clientServices = allServices
    .filter((s) => {
      if (s.clientId !== clientId) return false;
      if (s.status !== 'not_done' && s.status !== 'completed') return false;
      const serviceDate = s.scheduledDate.toDate();
      // Comparar apenas a data (dia/mês/ano)
      const serviceDateStart = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate(), 12, 0, 0, 0);
      return serviceDateStart >= packStart && serviceDateStart <= packEnd;
    });

  const notDoneServices = clientServices.filter((s) => s.status === 'not_done');
  const completedServices = clientServices.filter((s) => s.status === 'completed');

  // Create a map of operations by date+type for weight lookup
  const operationsMap = new Map<string, number>();
  operations.forEach((op) => {
    const key = `${op.date.toDate().toDateString()}-${op.type}`;
    operationsMap.set(key, op.weight);
  });

  // Combine completed services and not_done services into a unified list
  type HistoryItem = 
    | { type: 'completed'; date: Date; operationType: OperationType; weight: number; id: string; service: ScheduledServiceWithClient }
    | { type: 'not_done'; date: Date; operationType: OperationType; id: string; service: ScheduledServiceWithClient };

  const historyItems: HistoryItem[] = [
    ...completedServices.map((s) => {
      const serviceDate = s.scheduledDate.toDate();
      const key = `${serviceDate.toDateString()}-${s.type}`;
      const weight = operationsMap.get(key) || 1;
      return {
        type: 'completed' as const,
        date: serviceDate,
        operationType: s.type,
        weight,
        id: s.id,
        service: s,
      };
    }),
    ...notDoneServices.map((s) => ({
      type: 'not_done' as const,
      date: s.scheduledDate.toDate(),
      operationType: s.type,
      id: s.id,
      service: s,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const handleRevert = async () => {
    if (!confirmRevert) return;
    setReverting(confirmRevert.service.id);
    try {
      await revertServiceStatus(confirmRevert.service);
      setConfirmRevert(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao reverter status');
    } finally {
      setReverting(null);
    }
  };

  const loading = operationsLoading || servicesLoading;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <p className="text-center text-gray-400 py-4">
        Nenhuma operação registrada ainda
      </p>
    );
  }

  const completedCount = completedServices.length;
  const notDoneCount = notDoneServices.length;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      {/* Header com título e botão de exportar */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
          <span>Histórico: {completedCount} realizado{completedCount !== 1 ? 's' : ''}</span>
          {notDoneCount > 0 && <span className="text-red-400">({notDoneCount} não realizado{notDoneCount !== 1 ? 's' : ''})</span>}
        </button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onExport}
          leftIcon={<FileText className="w-3 h-3" />}
          className="text-xs py-1 px-2"
        >
          Exportar
        </Button>
      </div>

      {/* Lista de histórico (expansível) */}
      {loading && isExpanded && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && isExpanded && historyItems.length === 0 && (
        <p className="text-center text-gray-500 py-3 text-sm">
          Nenhum registro neste ciclo
        </p>
      )}

      {!loading && isExpanded && historyItems.length > 0 && (
        <div className="space-y-2">
          {historyItems.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 p-3 rounded-xl border ${
            item.type === 'completed'
              ? 'bg-emerald-900/30 border-emerald-700'
              : 'bg-red-900/30 border-red-700'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
            {item.type === 'completed' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <X className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-100">
              {formatShortDate(Timestamp.fromDate(item.date))} -{' '}
              {item.type === 'completed' ? (
                <span className="text-emerald-400">OK</span>
              ) : (
                <span className="text-red-400">Não Realizado</span>
              )}
            </p>
            <p className="text-xs text-gray-400">{formatOperationType(item.operationType)}</p>
          </div>
          <div className="flex items-center gap-2">
            {item.type === 'completed' && (
              <span className="text-sm text-gray-400">-{item.weight} crédito{item.weight > 1 ? 's' : ''}</span>
            )}
            <button
              onClick={() => setConfirmRevert({ service: item.service, itemType: item.type })}
              disabled={reverting === item.service.id}
              className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-200"
              title="Desfazer"
            >
              <RotateCcw className={`w-4 h-4 ${reverting === item.service.id ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      ))}
        </div>
      )}

      {/* Modal de confirmação para reverter */}
      <Drawer
        isOpen={confirmRevert !== null}
        onClose={() => setConfirmRevert(null)}
        title="Desfazer Status"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Tem certeza que deseja desfazer o status deste serviço?
          </p>
          {confirmRevert?.itemType === 'completed' && (
            <p className="text-sm text-amber-400 bg-amber-900/30 border border-amber-700 rounded-lg p-3">
              ⚠️ Os créditos usados serão restaurados ao pacote.
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmRevert(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRevert}
              isLoading={reverting !== null}
              className="flex-1"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

// Export History Component
interface ExportHistoryDrawerProps {
  client: Client;
  pack: Pack | null;
  isOpen: boolean;
  onClose: () => void;
}

function ExportHistoryDrawer({ client, pack, isOpen, onClose }: ExportHistoryDrawerProps) {
  useOperations(undefined, client.id, 100);
  const { allServices } = useSchedule();
  
  const [copied, setCopied] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Limpa o estado quando o drawer abre
  useEffect(() => {
    if (isOpen) {
      setGeneratedText('');
      setCopied(false);
      setShowCelebration(false);
    }
  }, [isOpen]);

  // Filter services for this client
  const clientServices = allServices.filter((s) => s.clientId === client.id);

  // Generate the export text
  const generateExportText = () => {
    if (!pack) {
      setGeneratedText('Nenhum ciclo selecionado.');
      return '';
    }

    // Get date range from the pack - usando apenas a parte da data para comparação
    const startDate = pack.startDate.toDate();
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    
    // Se o ciclo não foi finalizado (endDate null ou isActive), usar amanhã (d+1) como data final
    let end: Date;
    if (!pack.endDate || pack.isActive) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      end = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);
    } else {
      const endDate = pack.endDate.toDate();
      end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    }

    // Combine completed operations and not_done services
    type HistoryItem = {
      date: Date;
      status: 'ok' | 'not_done';
      type: OperationType;
      isExtra?: boolean;
    };

    // Usar clientServices para obter os serviços com datas corretas
    const historyItems: HistoryItem[] = clientServices
      .filter((s) => {
        const sDate = s.scheduledDate.toDate();
        const serviceDateNorm = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), 12, 0, 0, 0);
        return serviceDateNorm >= start && serviceDateNorm <= end && (s.status === 'completed' || s.status === 'not_done');
      })
      .map((s) => ({
        date: s.scheduledDate.toDate(),
        status: s.status === 'completed' ? 'ok' as const : 'not_done' as const,
        type: s.type,
        isExtra: s.isExtra || false,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Count completed
    const completedCount = historyItems.filter((h) => h.status === 'ok').length;

    // Use pack info
    const packCredits = pack.totalCredits;
    const packValue = formatCurrency(pack.packageValue);
    const paymentStatus = pack.paymentStatus === 'paid'
      ? `Pagamento: FEITO em ${pack.paymentDate ? formatDateDisplay(pack.paymentDate) : 'N/A'}`
      : pack.paymentStatus === 'partial'
      ? `Pagamento: PARCIAL (${formatCurrency(pack.paidAmount || 0)})`
      : 'Pagamento: PENDENTE';

    // Format service type info
    const serviceTypeLabel = pack.serviceType === 'sitter' ? 'Pet Sitter' : 'Passeio';
    
    // Gerar info de frequência com base no tipo de serviço
    let frequencyInfo: string;
    let durationInfo: string;
    
    if (pack.serviceType === 'sitter') {
      // Para Pet Sitter, mostrar o plano de visita
      const sitterPlanInfo = SITTER_PLAN_OPTIONS.find(p => p.value === pack.sitterPlan);
      frequencyInfo = 'diárias ilimitadas';
      durationInfo = sitterPlanInfo ? sitterPlanInfo.label : 'Visita Média (30min)';
    } else {
      // Para Passeio, mostrar a duração
      const walkDurationInfo = WALK_DURATION_OPTIONS.find(d => d.value === pack.walkDuration);
      frequencyInfo = `${packCredits} passeios`;
      durationInfo = walkDurationInfo ? walkDurationInfo.label + ' por passeio' : '1h por passeio';
    }

    // Format the text like in the image
    let text = `🎉 Completamos mais um ciclo de ${serviceTypeLabel.toLowerCase()}s!\n\n`;
    text += `🐕 : ${client.petName}\n`;
    text += `📅 : ${frequencyInfo}\n`;
    text += `⏱️ : ${durationInfo}\n`;
    text += `💰 : ${packValue}\n`;
    text += `${paymentStatus}\n`;
    text += `\n`;
    text += `Rolês realizados:\n\n`;

    historyItems.forEach((item) => {
      const dateStr = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }).format(item.date);

      if (item.status === 'ok') {
        text += `• ${dateStr} — ✅ OK${item.isExtra ? ' (extra)' : ''}\n`;
      } else {
        text += `• ${dateStr} — ❌ NÃO REALIZADO\n`;
      }
    });

    text += `\n`;
    // Para sitter, não mostrar total de créditos (é ilimitado)
    if (pack.serviceType === 'sitter') {
      text += `Total: ${completedCount} visitas realizadas\n\n`;
    } else {
      text += `Total: ${completedCount} / ${packCredits}\n\n`;
    }
    text += `Vamos pra mais um mês? 🐾`;

    setGeneratedText(text);
    return text;
  };

  const handleCopy = async () => {
    const text = generatedText || generateExportText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Fire confetti celebration
  const fireCelebration = () => {
    // Fire confetti from both sides
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    // Fire multiple bursts
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    // Fire from left side
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      zIndex: 9999,
    });

    // Fire from right side
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      zIndex: 9999,
    });
  };

  // Generate text and auto-copy
  const handleGenerate = async () => {
    const text = generateExportText();
    setShowCelebration(true);
    fireCelebration();
    
    // Auto-copy the generated text
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
    
    // Hide celebration after animation
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const cycleLabel = pack ? (pack.serviceType === 'walk' ? 'Passeio' : 'Pet Sitter') + ` - Ciclo ${pack.cycleNumber || 1}` : '';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Exportar Histórico" subtitle={cycleLabel}>
      <div className="space-y-4">
        {/* Show cycle info */}
        {pack ? (
          <div className="bg-gray-700/50 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Tipo:</span>
              <span className="text-gray-200">{pack.serviceType === 'walk' ? 'Passeio' : 'Pet Sitter'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Período:</span>
              <span className="text-gray-200">{formatDateDisplay(pack.startDate)} - {formatDateDisplay(pack.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Valor:</span>
              <span className="text-gray-200">{formatCurrency(pack.packageValue)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-center">
            <p className="text-yellow-400">Nenhum ciclo selecionado.</p>
          </div>
        )}

        <Button onClick={handleGenerate} className="w-full" variant="secondary" disabled={!pack}>
          🎉 Gerar Mensagem
        </Button>

        {/* Celebration GIF */}
        {showCelebration && (
          <div className="flex flex-col items-center justify-center py-4 animate-bounce">
            <img
              src="https://media.giphy.com/media/mCRJDo24UvJMA/giphy.gif"
              alt="Cachorrinho correndo"
              className="w-32 h-32 rounded-xl object-cover"
            />
            <p className="text-lg font-bold text-emerald-400 mt-2 animate-pulse">
              🎉 Ciclo completo! 🐕
            </p>
          </div>
        )}

        {/* Preview */}
        {generatedText && (
          <div className="bg-gray-700 text-gray-100 p-4 rounded-xl text-sm whitespace-pre-wrap font-mono max-h-80 overflow-y-auto">
            {generatedText}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleCopy}
            className="flex-1"
            leftIcon={copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            variant={copied ? 'primary' : 'secondary'}
            disabled={!generatedText}
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>

        {/* Copy confirmation toast */}
        {copied && generatedText && (
          <div className="bg-emerald-900/50 border border-emerald-600 rounded-xl p-3 text-center">
            <span className="text-emerald-400 font-medium">✓ Mensagem copiada para a área de transferência!</span>
          </div>
        )}
      </div>
    </Drawer>
  );
}

// Partial Payment Form Component
interface PartialPaymentFormProps {
  pack: Pack;
  onSubmit: (paidAmount: number) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function PartialPaymentForm({ pack, onSubmit, onClose, isLoading }: PartialPaymentFormProps) {
  const [paidAmountStr, setPaidAmountStr] = useState(
    pack.paidAmount ? (pack.paidAmount / 100).toFixed(2).replace('.', ',') : ''
  );
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse the amount
    const parsedAmount = parseFloat(paidAmountStr.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Informe um valor válido');
      return;
    }
    
    const amountInCents = Math.round(parsedAmount * 100);
    if (amountInCents >= pack.packageValue) {
      setError('Para pagamento total, use "Marcar Pago"');
      return;
    }
    
    await onSubmit(amountInCents);
  };

  const remaining = pack.packageValue - (pack.paidAmount || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-700 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Valor do pacote:</span>
          <span className="font-medium text-gray-200">{formatCurrency(pack.packageValue)}</span>
        </div>
        {pack.paidAmount !== undefined && pack.paidAmount > 0 && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Já pago:</span>
              <span className="font-medium text-emerald-400">{formatCurrency(pack.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Restante:</span>
              <span className="font-medium text-orange-400">{formatCurrency(remaining)}</span>
            </div>
          </>
        )}
      </div>

      <Input
        label="Valor pago (R$)"
        placeholder="0,00"
        value={paidAmountStr}
        onChange={(e) => {
          setPaidAmountStr(e.target.value);
          setError('');
        }}
        error={error}
      />

      <p className="text-xs text-gray-400">
        Informe o valor total já recebido até o momento.
      </p>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          Salvar
        </Button>
      </div>
    </form>
  );
}

// Payment Date Form Component
interface PaymentDateFormProps {
  pack: Pack;
  onSubmit: (paymentDate: Date) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function PaymentDateForm({ pack, onSubmit, onClose, isLoading }: PaymentDateFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [paymentDate, setPaymentDate] = useState(today);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Parse date parts to avoid timezone issues
    const [year, month, day] = paymentDate.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0); // Meio-dia para evitar problemas de timezone
    await onSubmit(date);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-gray-300">
          Confirmar pagamento de <strong className="text-emerald-400">{formatCurrency(pack.packageValue)}</strong>
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {pack.serviceType === 'walk' ? 'Passeio' : 'Pet Sitter'} - Ciclo {pack.cycleNumber || 1}
        </p>
      </div>
      
      <Input
        label="Data do Pagamento"
        type="date"
        value={paymentDate}
        onChange={(e) => setPaymentDate(e.target.value)}
      />

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          Confirmar Pagamento
        </Button>
      </div>
    </form>
  );
}

// Main Client Detail Component
export function ClientDetail({ client, onBack, onEdit, onArchive }: ClientDetailProps) {
  const { packs, loading, addPack, updatePaymentStatus, updatePack, deletePack, closePack } = useClientPacks(client.id);
  const [isPackFormOpen, setIsPackFormOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [deletingPackId, setDeletingPackId] = useState<string | null>(null);
  const [partialPaymentPack, setPartialPaymentPack] = useState<Pack | null>(null);
  const [paymentDatePack, setPaymentDatePack] = useState<Pack | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exportingPack, setExportingPack] = useState<Pack | null>(null);

  const handleAddPack = async (data: {
    serviceType: ServiceType;
    totalCredits: number;
    packageValue: number;
    startDate: Date;
    endDate: Date | null;
    walkDuration?: ServiceDuration;
    sitterPlan?: SitterPlan;
  }) => {
    setIsSubmitting(true);
    try {
      await addPack({
        clientId: client.id,
        serviceType: data.serviceType,
        totalCredits: data.totalCredits,
        packageValue: data.packageValue,
        startDate: data.startDate,
        endDate: data.endDate,
        walkDuration: data.walkDuration,
        sitterPlan: data.sitterPlan,
      });
      setIsPackFormOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar pacote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePack = async (data: {
    serviceType: ServiceType;
    totalCredits: number;
    packageValue: number;
    startDate: Date;
    endDate: Date | null;
    walkDuration?: ServiceDuration;
    sitterPlan?: SitterPlan;
  }) => {
    if (!editingPack) return;
    setIsSubmitting(true);
    try {
      await updatePack(editingPack.id, {
        serviceType: data.serviceType,
        totalCredits: data.totalCredits,
        packageValue: data.packageValue,
        startDate: data.startDate,
        endDate: data.endDate,
        walkDuration: data.walkDuration,
        sitterPlan: data.sitterPlan,
      });
      setEditingPack(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar pacote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePack = async () => {
    if (!deletingPackId) return;
    setIsSubmitting(true);
    try {
      await deletePack(deletingPackId);
      setDeletingPackId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir pacote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePaymentStatus = async (packId: string, status: PaymentStatus, paidAmount?: number, paymentDate?: Date) => {
    try {
      await updatePaymentStatus(packId, status, paidAmount, paymentDate);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar pagamento');
    }
  };

  const handleMarkAsPaid = async (paymentDate: Date) => {
    if (!paymentDatePack) return;
    setIsSubmitting(true);
    try {
      await updatePaymentStatus(paymentDatePack.id, 'paid', undefined, paymentDate);
      setPaymentDatePack(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao marcar como pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePartialPayment = async (paidAmount: number) => {
    if (!partialPaymentPack) return;
    setIsSubmitting(true);
    try {
      await updatePaymentStatus(partialPaymentPack.id, 'partial', paidAmount);
      setPartialPaymentPack(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar pagamento parcial');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePack = async (packId: string) => {
    try {
      await closePack(packId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao encerrar pacote');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-100">{client.petName}</h1>
            <p className="text-sm text-gray-400">{client.ownerName}</p>
          </div>
          <Badge variant={client.status === 'active' ? 'success' : 'warning'}>
            {client.status === 'active' ? 'Ativo' : 'Arquivado'}
          </Badge>
        </div>

        {/* Client Info */}
        <div className="flex items-center gap-4">
          <PetAvatar
            photoUrl={client.photoUrl}
            petName={client.petName}
            size="lg"
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Phone className="w-4 h-4" />
              <a href={`tel:${client.phone}`} className="hover:text-emerald-400">
                {client.phone}
              </a>
            </div>
            {client.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span className="underline underline-offset-2">{client.address}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={onEdit} leftIcon={<Edit className="w-4 h-4" />}>
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onArchive}
            leftIcon={client.status === 'active' ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
          >
            {client.status === 'active' ? 'Arquivar' : 'Restaurar'}
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Packs Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-100">Ciclos</h2>
            <Button size="sm" onClick={() => setIsPackFormOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Novo ciclo
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : packs.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Package className="w-8 h-8 text-gray-400" />}
                title="Nenhum pacote"
                description="Crie um pacote de créditos para este cliente"
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {packs.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  clientId={client.id}
                  onUpdatePayment={(status, paidAmount, paymentDate) => handleUpdatePaymentStatus(pack.id, status, paidAmount, paymentDate)}
                  onMarkAsPaid={() => setPaymentDatePack(pack)}
                  onEdit={() => setEditingPack(pack)}
                  onDelete={() => setDeletingPackId(pack.id)}
                  onClosePack={() => handleClosePack(pack.id)}
                  onPartialPayment={() => setPartialPaymentPack(pack)}
                  onExport={() => setExportingPack(pack)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Add Pack Drawer */}
      <Drawer
        isOpen={isPackFormOpen}
        onClose={() => setIsPackFormOpen(false)}
        title="Novo Pacote"
        subtitle={`Pacote para ${client.petName}`}
      >
        <PackForm
          clientId={client.id}
          onSubmit={handleAddPack}
          onClose={() => setIsPackFormOpen(false)}
          isLoading={isSubmitting}
        />
      </Drawer>

      {/* Edit Pack Drawer */}
      <Drawer
        isOpen={!!editingPack}
        onClose={() => setEditingPack(null)}
        title="Editar Pacote"
        subtitle={`Pacote para ${client.petName}`}
      >
        {editingPack && (
          <EditPackForm
            pack={editingPack}
            onSubmit={handleUpdatePack}
            onClose={() => setEditingPack(null)}
            isLoading={isSubmitting}
          />
        )}
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Drawer
        isOpen={!!deletingPackId}
        onClose={() => setDeletingPackId(null)}
        title="Excluir Pacote"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita.
          </p>
          <p className="text-sm text-red-400 bg-red-900/40 p-3 rounded-lg">
            ⚠️ O histórico de operações associado a este pacote será mantido, mas ficará órfão.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setDeletingPackId(null)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeletePack}
              isLoading={isSubmitting}
              className="flex-1"
            >
              Excluir Pacote
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Partial Payment Drawer */}
      <Drawer
        isOpen={!!partialPaymentPack}
        onClose={() => setPartialPaymentPack(null)}
        title="Pagamento Parcial"
        subtitle={partialPaymentPack ? `Valor do pacote: ${formatCurrency(partialPaymentPack.packageValue)}` : undefined}
      >
        {partialPaymentPack && (
          <PartialPaymentForm
            pack={partialPaymentPack}
            onSubmit={handlePartialPayment}
            onClose={() => setPartialPaymentPack(null)}
            isLoading={isSubmitting}
          />
        )}
      </Drawer>

      {/* Payment Date Drawer */}
      <Drawer
        isOpen={!!paymentDatePack}
        onClose={() => setPaymentDatePack(null)}
        title="Confirmar Pagamento"
        subtitle={paymentDatePack ? `${paymentDatePack.serviceType === 'walk' ? 'Passeio' : 'Pet Sitter'} - Ciclo ${paymentDatePack.cycleNumber || 1}` : undefined}
      >
        {paymentDatePack && (
          <PaymentDateForm
            pack={paymentDatePack}
            onSubmit={handleMarkAsPaid}
            onClose={() => setPaymentDatePack(null)}
            isLoading={isSubmitting}
          />
        )}
      </Drawer>

      {/* Export History Drawer */}
      <ExportHistoryDrawer
        client={client}
        pack={exportingPack}
        isOpen={!!exportingPack}
        onClose={() => setExportingPack(null)}
      />
    </div>
  );
}
