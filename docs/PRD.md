Product Requirements Document (PRD): Sistema de Gestão Passeio Pet SP
1. Visão Geral
Sistema web mobile-first para gestão operacional e financeira de serviços de passeios e pet sitter. O objetivo é reduzir a carga cognitiva do usuário (seu irmão), automatizando a contagem de "manejos", o controle de pacotes e o acesso a mensagens padrão.

2. Personas e Fluxos de Usuário
Usuário Principal: Gestor de Passeios (Irmão).

Fluxo Principal (Diário): Abrir app > Ver lista de hoje > Clicar em "OK" no passeio realizado > Sistema desconta do pacote e soma no faturamento > Se necessário, copiar mensagem pronta para enviar ao cliente.

3. Requisitos Funcionais
3.1. Gestão de Clientes (CRUD)
Cadastro: Nome do Tutor, Nome do Pet, Endereço, Telefone.

Status do Cliente:

Ativo: Aparece nas listas de seleção.

Arquivado: Histórico preservado, mas oculto das ações diárias.

Configuração de Contrato:

Tipo de Serviço (Passeio ou Pet Sitter).

Plano contratado (ex: Pacote de 8 passeios ou Diárias avulsas).

Valor do Pacote/Diária.

3.2. O "Manejo" (Core Business Logic)
O sistema deve calcular automaticamente a "carga de trabalho" (manejos) baseada nas seguintes regras:

Passeio Realizado: Conta como 1 manejo.

Pet Sitter (Diária Completa): Conta como 2 manejos.

Pet Sitter (Parcial): Conta como 1 manejo (Derivado da regra: "2 parciais = 1 diária").

Cancelado: Conta como 0 manejos.

Contadores:

Mensal: Reseta quando completa todos os passeios do pacote e um novo pagamento é efetuado.

Total Acumulado: Nunca reseta (Lifetime stats).

3.3. Agenda e Execução Diária
Visualização: Lista de tarefas do dia ordenadas por horário.

Ação Rápida (One-Click): Botão de "Check/OK" ao lado de cada tarefa.

Ao clicar: Marca a data atual, incrementa o contador de "realizados" do pacote do cliente e atualiza o status financeiro.

Integração Google Agenda:

MVP (Mínimo Viável): Link direto que abre o app do Google Calendar.

Fase 2: Sincronização via API (Ler eventos do GCal e criar tarefas no sistema).

3.4. Módulo Financeiro
Controle de Pacotes:

Visualização de progresso: Realizado / Contratado (ex: 8/8).

Histórico de datas: Lista de datas onde o serviço foi realizado (ex: "21/01 - Feito").

Status de Pagamento:

Tags visuais: Pendente (Vermelho), Parcial (Amarelo), Feito (Verde).

Data do pagamento realizado.

Dashboard Financeiro:

Valor Total Faturado (Mensal).

Previsão (Baseado nos pacotes ativos).

3.5. Repositório de Mensagens (Clipboard Manager)
Interface estilo "lista de cartões" com textos pré-definidos.

Funcionalidade: Um botão "Copiar" ao lado de cada texto.

Categorias sugeridas:

Orçamentos.

Detalhes de Planos.

Política de Cancelamento.

Feedback pós-passeio.

4. Estrutura de Dados (Data Model)
Para o GitHub Spark funcionar bem, ele precisa entender as entidades e relacionamentos.

Entidade: Cliente

id: UUID

nome_tutor: String

nome_pet: String

status: Enum [Ativo, Arquivado]

telefone: String

Entidade: Contrato (Pacote)

id: UUID

cliente_id: Relacionamento

tipo_servico: Enum [Passeio, PetSitter]

qtd_contratada: Number (ex: 8, 12, 1)

valor_total: Currency

status_pagamento: Enum [Pendente, Pago, Parcial]

data_inicio: Date

data_fim: Date (opcional)

Entidade: Evento (Execução)

id: UUID

contrato_id: Relacionamento

data_hora: DateTime

tipo_manejo: Enum [Passeio, Diaria, Parcial]

status: Enum [Agendado, Realizado, Cancelado]

peso_manejo: Number (Calculado: Passeio=1, Diaria=2, Parcial=1)

Entidade: MensagemTemplate

titulo: String (ex: "Orçamento Padrão")

corpo_texto: Long Text

5. UI/UX Guidelines (Diretrizes para o Spark)
Mobile First: Botões grandes para facilitar o clique na rua.

Dashboard Limpo: A tela inicial deve mostrar apenas o que é urgente:

Resumo financeiro do mês (topo).

Lista de tarefas de HOJE.

Menu inferior para: Clientes, Financeiro, Mensagens.

Feedback Visual: Ao concluir um passeio, o card deve ficar verde ou desaparecer da lista "A Fazer".