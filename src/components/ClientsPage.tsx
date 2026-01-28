import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Dog,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { Drawer, ConfirmDialog } from './ui/Modal';
import { Input, Button, EmptyState, Card, Skeleton } from './ui/FormElements';
import type { Client } from '../types';
import { ClientDetail } from './ClientDetail';

// Client Form Component
interface ClientFormProps {
  client?: Client;
  onSubmit: (data: { ownerName: string; petName: string; address: string; phone: string }) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function ClientForm({ client, onSubmit, onClose, isLoading }: ClientFormProps) {
  const [formData, setFormData] = useState({
    ownerName: client?.ownerName || '',
    petName: client?.petName || '',
    address: client?.address || '',
    phone: client?.phone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.ownerName.trim()) newErrors.ownerName = 'Nome do tutor é obrigatório';
    if (!formData.petName.trim()) newErrors.petName = 'Nome do pet é obrigatório';
    if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nome do Pet"
        placeholder="Ex: Rex"
        value={formData.petName}
        onChange={(e) => setFormData({ ...formData, petName: e.target.value })}
        error={errors.petName}
      />
      <Input
        label="Nome do Tutor"
        placeholder="Ex: João Silva"
        value={formData.ownerName}
        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
        error={errors.ownerName}
      />
      <Input
        label="Telefone"
        placeholder="(11) 99999-9999"
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        error={errors.phone}
      />
      <Input
        label="Endereço"
        placeholder="Rua, número, bairro"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        error={errors.address}
      />

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          {client ? 'Salvar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}

// Client Card Component
interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

function ClientCard({ client, onClick }: ClientCardProps) {
  return (
    <Card onClick={onClick} className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
        <Dog className="w-7 h-7 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-gray-100 truncate">{client.petName}</h3>
        <p className="text-sm text-gray-400 truncate">{client.ownerName}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {client.phone}
          </span>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
    </Card>
  );
}

// Loading skeleton for client list
function ClientsLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-800 rounded-2xl border-2 border-gray-700 p-5 flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Clients Page
export function ClientsPage() {
  const {
    activeClients,
    archivedClients,
    loading,
    error,
    addClient,
    updateClient,
    archiveClient,
    restoreClient,
  } = useClients();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<Client | null>(null);

  const displayedClients = showArchived ? archivedClients : activeClients;
  const filteredClients = displayedClients.filter(
    (c) =>
      c.petName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleAddClient = async (data: { ownerName: string; petName: string; address: string; phone: string }) => {
    setIsSubmitting(true);
    try {
      await addClient(data);
      setIsFormOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao adicionar cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClient = async (data: { ownerName: string; petName: string; address: string; phone: string }) => {
    if (!editingClient) return;
    setIsSubmitting(true);
    try {
      await updateClient(editingClient.id, data);
      setEditingClient(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!confirmArchive) return;
    setIsSubmitting(true);
    try {
      if (confirmArchive.status === 'active') {
        await archiveClient(confirmArchive.id);
      } else {
        await restoreClient(confirmArchive.id);
      }
      setConfirmArchive(null);
      setSelectedClient(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao arquivar cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If a client is selected, show detail view
  if (selectedClient) {
    return (
      <>
        <ClientDetail
          client={selectedClient}
          onBack={() => setSelectedClient(null)}
          onEdit={() => {
            setEditingClient(selectedClient);
            setSelectedClient(null);
          }}
          onArchive={() => {
            setConfirmArchive(selectedClient);
          }}
        />
        {/* Archive Confirmation - needs to be here too for ClientDetail */}
        <ConfirmDialog
          isOpen={!!confirmArchive}
          onClose={() => setConfirmArchive(null)}
          onConfirm={handleArchive}
          title={confirmArchive?.status === 'active' ? 'Arquivar Cliente' : 'Restaurar Cliente'}
          message={
            confirmArchive?.status === 'active'
              ? `Deseja arquivar ${confirmArchive?.petName}? O cliente não aparecerá mais na lista principal.`
              : `Deseja restaurar ${confirmArchive?.petName}? O cliente voltará para a lista de ativos.`
          }
          confirmText={confirmArchive?.status === 'active' ? 'Arquivar' : 'Restaurar'}
          variant={confirmArchive?.status === 'active' ? 'warning' : 'default'}
          isLoading={isSubmitting}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Clientes</h1>
            <p className="text-sm text-gray-400">
              {activeClients.length} ativo{activeClients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
            Novo
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !showArchived ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-700 text-gray-400'
            }`}
          >
            Ativos ({activeClients.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              showArchived ? 'bg-orange-900/50 text-orange-400' : 'bg-gray-700 text-gray-400'
            }`}
          >
            Arquivados ({archivedClients.length})
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-3">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {loading ? (
          <ClientsLoadingSkeleton />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={<Users className="w-10 h-10 text-gray-400" />}
            title={searchQuery ? 'Nenhum resultado' : showArchived ? 'Nenhum cliente arquivado' : 'Nenhum cliente'}
            description={
              searchQuery
                ? 'Tente buscar com outros termos'
                : showArchived
                ? 'Clientes arquivados aparecerão aqui'
                : 'Cadastre seu primeiro cliente'
            }
            action={
              !searchQuery &&
              !showArchived && (
                <Button onClick={() => setIsFormOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
                  Cadastrar Cliente
                </Button>
              )
            }
          />
        ) : (
          filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} onClick={() => setSelectedClient(client)} />
          ))
        )}
      </main>

      {/* Add Client Drawer */}
      <Drawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Novo Cliente"
        subtitle="Cadastre um novo cliente e pet"
      >
        <ClientForm onSubmit={handleAddClient} onClose={() => setIsFormOpen(false)} isLoading={isSubmitting} />
      </Drawer>

      {/* Edit Client Drawer */}
      <Drawer
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        title="Editar Cliente"
        subtitle={editingClient?.petName}
      >
        {editingClient && (
          <ClientForm
            client={editingClient}
            onSubmit={handleEditClient}
            onClose={() => setEditingClient(null)}
            isLoading={isSubmitting}
          />
        )}
      </Drawer>

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={handleArchive}
        title={confirmArchive?.status === 'active' ? 'Arquivar Cliente' : 'Restaurar Cliente'}
        message={
          confirmArchive?.status === 'active'
            ? `Deseja arquivar ${confirmArchive?.petName}? O cliente não aparecerá mais na lista principal.`
            : `Deseja restaurar ${confirmArchive?.petName}? O cliente voltará para a lista de ativos.`
        }
        confirmText={confirmArchive?.status === 'active' ? 'Arquivar' : 'Restaurar'}
        variant={confirmArchive?.status === 'active' ? 'warning' : 'default'}
        isLoading={isSubmitting}
      />
    </div>
  );
}
