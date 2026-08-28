import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";

dotenv.config();

export class MCPService {
  private client: Client | null = null;
  private tools: any[] = [];

  constructor() { }

  async connect() {
    // comando para iniciar o servidor MCP, geralmente será 'node' ou 'tsx' com o caminho do arquivo.
    // Exemplo: MCP_SERVER_CMD="tsx" e MCP_SERVER_ARGS="../mcp-server/src/index.ts"
    const command = process.env.MCP_SERVER_CMD || "node";

    // path fictício para rodar se não vier do .env
    const args = process.env.MCP_SERVER_ARGS
      ? process.env.MCP_SERVER_ARGS.split(" ")
      : ["../servidor_mcp_mock/index.js"];

    console.log(`Conectando ao Servidor MCP via STDIO: ${command} ${args.join(" ")}`);

    const transport = new StdioClientTransport({
      command,
      args,
    });

    this.client = new Client(
      { name: "OrquestradorChat", version: "1.0.0" },
      { capabilities: {} }
    );

    try {
      await this.client.connect(transport);
      console.log("Conectado ao Servidor MCP com sucesso!");

      const toolsResponse = await this.client.listTools();
      this.tools = toolsResponse.tools;
      console.log(`Ferramentas MCP carregadas: ${this.tools.map(t => t.name).join(", ")}`);
    } catch (error) {
      console.error("Erro ao conectar no Servidor MCP:", error);
    }
  }

  getTools() {
    return this.tools;
  }

  // chamada de tool
  async callTool(name: string, args: any) {
    if (!this.client) {
      throw new Error("Cliente MCP não está conectado");
    }

    console.log(`Chamando Tool MCP: ${name} com args:`, args);
    const result = await this.client.callTool({ name, arguments: args });
    return result;
  }
}

export const mcpService = new MCPService();
