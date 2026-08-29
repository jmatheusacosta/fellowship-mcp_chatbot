export interface Produto {
  id: string;
  nome: string;
  preco: number;
  descricao: string;
}

export interface Usuario {
  id: string;
  nome: string;
  limite: number;
}

export interface Intencao {
  intencao_id: string;
  produto_id: string;
  quantidade: number;
  valor_total: number;
  moeda: string;
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada';
  expira_em: string;
}

export interface Transacao {
  id: string;
  intencaoId: string;
  usuarioId: string;
  valor: number;
  status: 'concluida' | 'falhada';
  criadoEm: string;
}

// Mock de produtos disponíveis no catálogo
export const produtos: Produto[] = [
  {
    id: "prod_001",
    nome: "Fone Bluetooth",
    preco: 249.90,
    descricao: "Fone de ouvido sem fio bluetooth com cancelamento de ruído"
  },
  {
    id: "prod_002",
    nome: "Carregador Turbo",
    preco: 80.00,
    descricao: "Carregador de tomada turbo 30W USB-C"
  },
  {
    id: "prod_003",
    nome: "Cabo USB",
    preco: 30.00,
    descricao: "Cabo USB para USB-C reforçado 1m"
  }
];

// Mock de usuários e seus limites de crédito/compra
export const usuarios: Usuario[] = [
  {
    id: "usr_001",
    nome: "Carlos Silva",
    limite: 500.00
  },
  {
    id: "usr_002",
    nome: "Ana Souza",
    limite: 50.00
  }
];

// Arrays em memória para armazenar intenções de compra e transações realizadas
export const intencoes: Intencao[] = [];
export const transacoes: Transacao[] = [];

