import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { produtos, intencoes, Intencao } from "./db.js";

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
    quantidade: z.number().positive().describe("Quantidade do produto (deve ser um número positivo)"),
  },
  async ({ produto_id, quantidade }) => {
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
