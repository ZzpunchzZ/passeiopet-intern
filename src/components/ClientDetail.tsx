import { useState } from 'react';
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
import type { Client, Pack, PaymentStatus, ServiceType, OperationType } from '../types';

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

      {/* Payment date if paid */}
      {pack.paymentStatus === 'paid' && pack.paymentDate && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg px-3 py-2 mb-3 text-sm">
          <span className="text-emerald-400">
            ✓ Pago em {formatDateDisplay(pack.paymentDate)}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">
            {pack.usedCredits} / {pack.totalCredits} {pack.serviceType === 'walk' ? 'passeios' : 'diárias'}
          </span>
          <span className={`font-medium ${isLow ? 'text-orange-400' : 'text-gray-400'}`}>
            {remaining} restante{remaining !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
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
  const { operations, loading: operationsLoading } = useOperations(undefined, clientId, 20);
  const { allServices, loading: servicesLoading } = useSchedule();

  // Filter services that are not_done for this client
  const notDoneServices = allServices
    .filter((s) => s.clientId === clientId && s.status === 'not_done')
    .slice(0, 20);

  // Combine operations and not_done services into a unified list
  type HistoryItem = 
    | { type: 'completed'; date: Date; operationType: OperationType; weight: number; id: string }
    | { type: 'not_done'; date: Date; operationType: OperationType; id: string };

  const historyItems: HistoryItem[] = [
    ...operations.map((op) => ({
      type: 'completed' as const,
      date: op.date.toDate(),
      operationType: op.type,
      weight: op.weight,
      id: op.id,
    })),
    ...notDoneServices.map((s) => ({
      type: 'not_done' as const,
      date: s.scheduledDate.toDate(),
      operationType: s.type,
      id: s.id,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

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

  const completedCount = operations.length;
  const notDoneCount = notDoneServices.length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-400 mb-2">
        Histórico: {completedCount} realizado{completedCount !== 1 ? 's' : ''}
        {notDoneCount > 0 && `, ${notDoneCount} não realizado${notDoneCount !== 1 ? 's' : ''}`}
      </p>
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
          {item.type === 'completed' && (
            <span className="text-sm text-gray-400">-{item.weight} crédito{item.weight > 1 ? 's' : ''}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Export History Component
interface ExportHistoryDrawerProps {
  client: Client;
  packs: Pack[];
  isOpen: boolean;
  onClose: () => void;
}

function ExportHistoryDrawer({ client, packs, isOpen, onClose }: ExportHistoryDrawerProps) {
  const { operations } = useOperations(undefined, client.id, 100);
  const { allServices } = useSchedule();
  
  // Get date range defaults (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Filter services for this client
  const clientServices = allServices.filter((s) => s.clientId === client.id);

  // Generate the export text
  const generateExportText = () => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Combine completed operations and not_done services
    type HistoryItem = {
      date: Date;
      status: 'ok' | 'not_done';
      type: OperationType;
      isExtra?: boolean;
    };

    const historyItems: HistoryItem[] = [
      ...operations
        .filter((op) => {
          const opDate = op.date.toDate();
          return opDate >= start && opDate <= end;
        })
        .map((op) => ({
          date: op.date.toDate(),
          status: 'ok' as const,
          type: op.type,
          isExtra: false,
        })),
      ...clientServices
        .filter((s) => {
          const sDate = s.scheduledDate.toDate();
          return sDate >= start && sDate <= end && (s.status === 'completed' || s.status === 'not_done');
        })
        .filter((s) => s.status === 'not_done') // Only add not_done from services (completed already comes from operations)
        .map((s) => ({
          date: s.scheduledDate.toDate(),
          status: 'not_done' as const,
          type: s.type,
          isExtra: false,
        })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Count completed
    const completedCount = historyItems.filter((h) => h.status === 'ok').length;

    // Get active pack info
    const activePack = packs.find((p) => p.isActive);
    const packCredits = activePack ? activePack.totalCredits : completedCount;
    const packValue = activePack ? formatCurrency(activePack.packageValue) : '';
    const paymentStatus = activePack
      ? activePack.paymentStatus === 'paid'
        ? `Pagamento: FEITO em ${activePack.paymentDate ? formatDateDisplay(activePack.paymentDate) : 'N/A'}`
        : activePack.paymentStatus === 'partial'
        ? `Pagamento: PARCIAL (${formatCurrency(activePack.paidAmount || 0)})`
        : 'Pagamento: PENDENTE'
      : '';

    // Format service type info
    const serviceTypeLabel = activePack?.serviceType === 'sitter' ? 'Pet Sitter' : 'Passeio';
    const frequencyInfo = activePack
      ? `${packCredits} ${activePack.serviceType === 'walk' ? 'passeios' : 'diárias'}`
      : `${completedCount} serviços`;

    // Format the text like in the image
    let text = `🎉 Completamos mais um ciclo de ${serviceTypeLabel.toLowerCase()}s!\n\n`;
    text += `🐕 : ${client.petName}\n`;
    text += `📅 : ${frequencyInfo}\n`;
    text += `⏱️ : 1h por passeio\n`;
    if (packValue) text += `💰 : ${packValue}\n`;
    if (paymentStatus) text += `${paymentStatus}\n`;
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
    text += `Total: ${completedCount} / ${packCredits}\n\n`;
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

  // Generate text when dates change
  const handleGenerate = () => {
    generateExportText();
    setShowCelebration(true);
    fireCelebration();
    
    // Hide celebration after animation
    setTimeout(() => setShowCelebration(false), 3000);
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Exportar Histórico" subtitle={`Histórico de ${client.petName}`}>
      <div className="space-y-4">
        {/* Date Range Selection */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data Início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Data Fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <Button onClick={handleGenerate} className="w-full" variant="secondary">
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
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>
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

// Main Client Detail Component
export function ClientDetail({ client, onBack, onEdit, onArchive }: ClientDetailProps) {
  const { packs, loading, addPack, updatePaymentStatus, updatePack, deletePack, closePack } = useClientPacks(client.id);
  const [isPackFormOpen, setIsPackFormOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [deletingPackId, setDeletingPackId] = useState<string | null>(null);
  const [partialPaymentPack, setPartialPaymentPack] = useState<Pack | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

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
            <h2 className="text-lg font-bold text-gray-100">Pacotes</h2>
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-100">Histórico Recente</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsExportOpen(true)}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Exportar
            </Button>
          </div>
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

      {/* Export History Drawer */}
      <ExportHistoryDrawer
        client={client}
        packs={packs}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
