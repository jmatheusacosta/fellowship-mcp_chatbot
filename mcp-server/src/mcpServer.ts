import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { produtos, usuarios, intencoes, transacoes } from "./db.js";
import type { Intencao, Transacao } from "./db.js";

// Inicializa a instância do servidor MCP
export const server = new McpServer({
  name: "payment-mcp-server",
  version: "1.0.0",
});

// Tool: listar_catalogo - Lê e retorna todos os produtos cadastrados no db.ts
server.tool(
  "listar_catalogo",
  "Lista todos os produtos disponíveis no catálogo com ID, nome, preço e descrição",
  async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(produtos, null, 2),
        },
      ],
    };
  }
);

// Tool: registrar_intencao - Registra uma intenção de compra para um produto e quantidade especificados
server.tool(
  "registrar_intencao",
  "Registra uma nova intenção de compra calculando o valor total e definindo expiração para 10 minutos",
  {
    produto_id: z.string().describe("ID do produto a ser adquirido"),
    quantidade: z.number().min(1).describe("Quantidade do produto (deve ser um número positivo)"),
    user_id: z.string().optional().describe("ID do usuário associado à intenção (opcional)"),
  },
  async ({ produto_id, quantidade, user_id }) => {
    const produto = produtos.find((p) => p.id === produto_id);

    if (!produto) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Erro: Produto com ID '${produto_id}' não encontrado no catálogo.`,
          },
        ],
      };
    }

    const valor_total = Number((produto.preco * quantidade).toFixed(2));
    const expira_em = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const novaIntencao: Intencao = {
      intencao_id: `int_${Date.now()}`,
      produto_id,
      quantidade,
      valor_total,
      moeda: "BRL",
      status: "pendente",
      expira_em,
      ...(user_id ? { user_id } : {}),
    };

    intencoes.push(novaIntencao);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(novaIntencao, null, 2),
        },
      ],
    };
  }
);

// Tool: realizar_compra - Valida e processa o pagamento de uma intenção de compra
server.tool(
  "realizar_compra",
  "Processa o pagamento de uma intenção de compra realizando validações de integridade, status, expiração e limite do usuário",
  {
    intencao_id: z.string().describe("ID da intenção de compra previamente registrada"),
    metodo_pagamento: z.enum(["cartao", "pix"]).describe("Método de pagamento escolhido ('cartao' ou 'pix')"),
    user_id: z.string().describe("ID do usuário que está realizando o pagamento"),
  },
  async ({ intencao_id, metodo_pagamento, user_id }) => {
    const intencao = intencoes.find((i) => i.intencao_id === intencao_id);
    const usuario = usuarios.find((u) => u.id === user_id);

    // 1. Validação: intenção inexistente, usuário inexistente ou intenção não pertence ao user_id informado
    if (!intencao || (intencao.user_id && intencao.user_id !== user_id) || !usuario) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "recusado",
                codigo: "INTENCAO_INVALIDA",
                mensagem: "Intenção de compra inválida, inexistente ou não pertence ao usuário informado.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // 2. Validação: intenção já com status "paga"
    if (intencao.status === "paga") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "recusado",
                codigo: "INTENCAO_JA_PAGA",
                mensagem: "Esta intenção de compra já foi paga anteriormente.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // 3. Validação: data atual superior à expiração
    const agora = Date.now();
    const dataExpiracao = new Date(intencao.expira_em).getTime();
    if (agora > dataExpiracao) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "recusado",
                codigo: "INTENCAO_EXPIRADA",
                mensagem: "Esta intenção de compra expirou.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // 4. Validação: valor_total maior que limite_restante do usuário
    const limiteAtual = usuario.limite_restante !== undefined ? usuario.limite_restante : usuario.limite;
    if (intencao.valor_total > limiteAtual) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "recusado",
                codigo: "LIMITE_EXCEDIDO",
                mensagem: "Limite de crédito insuficiente para realizar esta compra.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Sucesso: Atualizar dados e registrar transação
    const transacao_id = `tx_${Date.now()}`;
    const dataISO = new Date().toISOString();

    intencao.status = "paga";
    if (!intencao.user_id) {
      intencao.user_id = user_id;
    }

    usuario.limite_restante = Number((limiteAtual - intencao.valor_total).toFixed(2));
    usuario.limite = usuario.limite_restante;

    const novaTransacao: Transacao = {
      transacao_id,
      intencao_id,
      user_id,
      metodo_pagamento,
      valor: intencao.valor_total,
      status: "aprovado",
      data: dataISO,
    };

    transacoes.push(novaTransacao);

    const respostaSucesso = {
      status: "aprovado",
      transacao_id,
      limite_restante: usuario.limite_restante,
      data: dataISO,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(respostaSucesso, null, 2),
        },
      ],
    };
  }
);

// Função de inicialização do servidor com transporte stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Servidor MCP de Pagamentos iniciado com sucesso via stdio.");
}

// Executa apenas se o arquivo for chamado diretamente como script principal
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("mcpServer.ts")) {
  main().catch((error) => {
    console.error("Erro fatal ao iniciar o servidor MCP:", error);
    process.exit(1);
  });
}
