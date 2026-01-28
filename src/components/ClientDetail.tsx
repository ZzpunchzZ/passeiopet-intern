import { useState } from 'react';
import {
  ArrowLeft,
  Dog,
  Phone,
  MapPin,
  Edit,
  Archive,
  RotateCcw,
  Plus,
  Package,
  Footprints,
  Sun,
  Clock,
  Calendar,
  DollarSign,
  XCircle,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useClientPacks } from '../hooks/useClientPacks';
import { useOperations, formatOperationType, formatShortDate } from '../hooks/useOperations';
import { Drawer } from './ui/Modal';
import { Input, Select, Button, Badge, Card, EmptyState, Skeleton } from './ui/FormElements';
import type { Client, Pack, PaymentStatus, ServiceType } from '../types';

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
  }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function PackForm({ onSubmit, onClose, isLoading }: PackFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    serviceType: 'walk' as ServiceType,
    totalCredits: 10,
    packageValue: '',
    startDate: today,
    endDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valueInCents = Math.round(parseFloat(formData.packageValue.replace(',', '.')) * 100) || 0;
    await onSubmit({
      serviceType: formData.serviceType,
      totalCredits: formData.totalCredits,
      packageValue: valueInCents,
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : null,
    });
  };

  const creditOptions = [5, 10, 15, 20, 30].map((n) => ({
    value: String(n),
    label: `${n} ${formData.serviceType === 'walk' ? 'passeios' : 'diárias'}`,
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
      <Select
        label={formData.serviceType === 'walk' ? 'Total de Passeios' : 'Total de Diárias'}
        value={String(formData.totalCredits)}
        onChange={(e) => setFormData({ ...formData, totalCredits: Number(e.target.value) })}
        options={creditOptions}
      />
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
        <p className="text-sm text-gray-500 italic">
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valueInCents = Math.round(parseFloat(formData.packageValue.replace(',', '.')) * 100) || 0;
    await onSubmit({
      serviceType: formData.serviceType,
      totalCredits: formData.totalCredits,
      packageValue: valueInCents,
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : null,
    });
  };

  const creditOptions = [5, 10, 15, 20, 30].map((n) => ({
    value: String(n),
    label: `${n} ${formData.serviceType === 'walk' ? 'passeios' : 'diárias'}`,
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
      <Select
        label={formData.serviceType === 'walk' ? 'Total de Passeios' : 'Total de Diárias'}
        value={String(formData.totalCredits)}
        onChange={(e) => setFormData({ ...formData, totalCredits: Number(e.target.value) })}
        options={creditOptions}
      />
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
  onUpdatePayment: (status: PaymentStatus, paidAmount?: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClosePack: () => void;
  onPartialPayment: () => void;
}

function PackCard({ pack, onUpdatePayment, onEdit, onDelete, onClosePack, onPartialPayment }: PackCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const remaining = pack.totalCredits - pack.usedCredits;
  const percentage = (pack.usedCredits / pack.totalCredits) * 100;
  const isLow = remaining <= 2 && pack.isActive;
  const isCompleted = !pack.isActive || remaining === 0;

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
    if (isCompleted) return 'bg-gray-400';
    if (isLow) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  return (
    <Card className={isCompleted ? 'opacity-75' : ''}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className={`w-5 h-5 ${isCompleted ? 'text-gray-400' : 'text-emerald-600'}`} />
          <span className="font-semibold text-gray-900">
            {pack.serviceType === 'walk' ? 'Passeio' : 'Pet Sitter'}
          </span>
          {!pack.isActive && <Badge variant="default">Encerrado</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {getPaymentBadge()}
          {/* Menu dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-8 z-20 w-36 bg-white rounded-lg shadow-lg border py-1">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
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
        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign className="w-4 h-4" />
          <span>{formatCurrency(pack.packageValue || 0)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>
            {formatDateDisplay(pack.startDate)} - {formatDateDisplay(pack.endDate)}
          </span>
        </div>
      </div>

      {/* Payment date if paid */}
      {pack.paymentStatus === 'paid' && pack.paymentDate && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3 text-sm">
          <span className="text-emerald-700">
            ✓ Pago em {formatDateDisplay(pack.paymentDate)}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">
            {pack.usedCredits} / {pack.totalCredits} {pack.serviceType === 'walk' ? 'passeios' : 'diárias'}
          </span>
          <span className={`font-medium ${isLow ? 'text-orange-600' : 'text-gray-600'}`}>
            {remaining} restante{remaining !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor()} transition-all rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {/* Payment Status Actions */}
        {pack.paymentStatus !== 'paid' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onUpdatePayment('paid')}
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-sm">
            <span className="text-yellow-800">
              Pago: {formatCurrency(pack.paidAmount)} de {formatCurrency(pack.packageValue)}
            </span>
            <span className="text-yellow-600 ml-2">
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
              className="flex-1 text-orange-600 hover:bg-orange-50"
            >
              Desfazer Pagamento
            </Button>
          </div>
        )}
        {pack.paymentStatus === 'paid' && pack.isActive && remaining === 0 && (
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
        {pack.isActive && pack.serviceType === 'walk' && remaining > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClosePack}
            className="w-full text-gray-500"
          >
            Encerrar Antecipadamente
          </Button>
        )}
      </div>
    </Card>
  );
}

// Operations History Component
function OperationsHistory({ clientId }: { clientId: string }) {
  const { operations, loading } = useOperations(undefined, clientId, 20);

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

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">
        Nenhuma operação registrada ainda
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-2">
        Histórico de {operations.length} operações realizadas
      </p>
      {operations.map((op) => (
        <div
          key={op.id}
          className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100"
        >
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            {getOperationIcon(op.type)}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {formatShortDate(op.date)} - <span className="text-emerald-600">Feito</span>
            </p>
            <p className="text-xs text-gray-500">{formatOperationType(op.type)}</p>
          </div>
          <span className="text-sm text-gray-500">-{op.weight} crédito{op.weight > 1 ? 's' : ''}</span>
        </div>
      ))}
    </div>
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
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Valor do pacote:</span>
          <span className="font-medium">{formatCurrency(pack.packageValue)}</span>
        </div>
        {pack.paidAmount !== undefined && pack.paidAmount > 0 && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Já pago:</span>
              <span className="font-medium text-emerald-600">{formatCurrency(pack.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Restante:</span>
              <span className="font-medium text-orange-600">{formatCurrency(remaining)}</span>
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

      <p className="text-xs text-gray-500">
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

// Main Client Detail Component
export function ClientDetail({ client, onBack, onEdit, onArchive }: ClientDetailProps) {
  const { packs, loading, addPack, updatePaymentStatus, updatePack, deletePack, closePack } = useClientPacks(client.id);
  const [isPackFormOpen, setIsPackFormOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [deletingPackId, setDeletingPackId] = useState<string | null>(null);
  const [partialPaymentPack, setPartialPaymentPack] = useState<Pack | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPack = async (data: {
    serviceType: ServiceType;
    totalCredits: number;
    packageValue: number;
    startDate: Date;
    endDate: Date | null;
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

  const handleUpdatePaymentStatus = async (packId: string, status: PaymentStatus, paidAmount?: number) => {
    try {
      await updatePaymentStatus(packId, status, paidAmount);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar pagamento');
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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{client.petName}</h1>
            <p className="text-sm text-gray-500">{client.ownerName}</p>
          </div>
          <Badge variant={client.status === 'active' ? 'success' : 'warning'}>
            {client.status === 'active' ? 'Ativo' : 'Arquivado'}
          </Badge>
        </div>

        {/* Client Info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <Dog className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <a href={`tel:${client.phone}`} className="hover:text-emerald-600">
                {client.phone}
              </a>
            </div>
            {client.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{client.address}</span>
              </div>
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
            <h2 className="text-lg font-bold text-gray-900">Pacotes</h2>
            <Button size="sm" onClick={() => setIsPackFormOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Novo Pacote
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
                  onUpdatePayment={(status) => handleUpdatePaymentStatus(pack.id, status)}
                  onEdit={() => setEditingPack(pack)}
                  onDelete={() => setDeletingPackId(pack.id)}
                  onClosePack={() => handleClosePack(pack.id)}
                  onPartialPayment={() => setPartialPaymentPack(pack)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Operations History */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Histórico Recente</h2>
          <Card>
            <OperationsHistory clientId={client.id} />
          </Card>
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
          <p className="text-gray-600">
            Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita.
          </p>
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
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
    </div>
  );
}
