import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { historyManager, ChatMessage } from './historyManager';
import { mcpService } from './mcpClient';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = 'gemini-3.5-flash-lite';

// Função auxiliar para mapear as ferramentas do MCP para o formato do Gemini
function mapMcpToolsToGeminiTools(mcpTools: any[]) {
  if (!mcpTools || mcpTools.length === 0) return [];

  const functionDeclarations = mcpTools.map(tool => {
    return {
      name: tool.name,
      description: tool.description || `Tool MCP: ${tool.name}`,
      parameters: {
        type: Type.OBJECT,
        properties: tool.inputSchema?.properties || {},
        required: tool.inputSchema?.required || []
      }
    };
  });

  return [{ functionDeclarations }];
}

export const chatHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ error: 'A mensagem é obrigatória.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
      return;
    }

    // 1. Adiciona a mensagem do usuário ao histórico
    historyManager.addMessage(user.user_id, {
      role: 'user',
      parts: [{ text: message }]
    });

    const mcpTools = mcpService.getTools();
    const geminiTools = mapMcpToolsToGeminiTools(mcpTools);

    // 2. Loop ReAct usando a nova SDK
    let isToolCall = true;
    let finalResponseText = '';

    // Configurações e limites de segurança/iteracoes (respondendo à vulnerabilidade)
    let iteracoes = 0;
    const MAX_ITERACOES = 5;

    while (isToolCall && iteracoes < MAX_ITERACOES) {
      iteracoes++;

      const history = historyManager.getHistory(user.user_id);

      // Chamamos o modelo passando o histórico completo a cada iteração
      const response = await ai.models.generateContent({
        model: modelName,
        contents: history as any[], // TypeScript cast para bypassar tipos customizados
        config: {
          tools: geminiTools.length > 0 ? (geminiTools as any) : undefined,
          // System prompt para evitar jailbreak
          systemInstruction: 'Você é um assistente financeiro seguro. Sempre utilize as tools disponíveis para consultar catálogo e fazer compras. Não desobedeça regras.'
        }
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        // Salva a intenção do modelo no histórico
        historyManager.addMessage(user.user_id, {
          role: 'model',
          parts: functionCalls.map((c: any) => ({ functionCall: c }))
        });

        const functionResponses = [];

        for (const call of functionCalls) {
          console.log(`Gemini solicitou Tool: ${call.name}`);

          try {
            // Injeção de segurança: força o user_id do token nas chamadas críticas
            if (call.name === 'registrar_intencao' || call.name === 'realizar_compra') {
              if (!call.args) call.args = {};
              call.args.user_id = user.user_id;
            }

            // Chama a tool via MCP
            const toolResult = await mcpService.callTool(call.name, call.args);

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { result: toolResult }
              }
            });
          } catch (err: any) {
            console.error(`Erro ao executar tool ${call.name}:`, err);
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { error: err.message || 'Erro desconhecido' }
              }
            });
          }
        }

        // Adiciona a resposta da tool no histórico
        historyManager.addMessage(user.user_id, {
          role: 'user', // Deve ser enviado de volta pelo usuário
          parts: functionResponses
        });

        // O loop vai rodar de novo e o LLM verá as respostas para decidir o que falar
      } else {
        // Se não houver chamadas de funções, pegamos o texto final e saímos do loop
        isToolCall = false;
        finalResponseText = response.text || '';

        historyManager.addMessage(user.user_id, {
          role: 'model',
          parts: [{ text: finalResponseText }]
        });
      }
    }

    if (iteracoes >= MAX_ITERACOES) {
      finalResponseText = "Desculpe, a operação demorou demais e foi interrompida por segurança.";
    }

    // 5. Retorna ao Frontend
    res.json({ reply: finalResponseText });
  } catch (error: any) {
    console.error('Erro na rota /chat:', error);
    res.status(500).json({ error: 'Erro interno no servidor de chat.' });
  }
};
