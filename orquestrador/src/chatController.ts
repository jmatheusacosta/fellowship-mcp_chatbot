import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { historyManager } from './historyManager';
import { mcpService } from './mcpClient';

// Inicializa a SDK do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// Usar gemini-1.5-pro ou gemini-1.5-flash
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); 

// Função auxiliar para mapear as ferramentas do MCP para o formato do Gemini
function mapMcpToolsToGeminiTools(mcpTools: any[]) {
  if (!mcpTools || mcpTools.length === 0) return [];
  
  const functionDeclarations = mcpTools.map(tool => {
    return {
      name: tool.name,
      description: tool.description || `Tool MCP: ${tool.name}`,
      parameters: {
        type: 'OBJECT',
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
    
    // Configura o chat do Gemini usando o histórico salvo
    const history = historyManager.getHistory(user.user_id);
    const chat = model.startChat({
      history: history.slice(0, -1) as any[], // Passa tudo menos a última mensagem (que é a atual)
      tools: geminiTools.length > 0 ? (geminiTools as any) : undefined
    });

    let finalResponseText = '';
    
    // 2. Envia a mensagem pro Gemini
    let result = await chat.sendMessage(message);

    // 3. Loop ReAct (O Agente)
    // Enquanto o Gemini pedir para chamar funções, nós executamos e devolvemos o resultado
    while (result.response.functionCalls() && result.response.functionCalls()!.length > 0) {
      const calls = result.response.functionCalls()!;
      
      // Salva a intenção do modelo no histórico (importante para manter a coerência)
      historyManager.addMessage(user.user_id, {
        role: 'model',
        parts: calls.map(c => ({ functionCall: c }))
      });

      const functionResponses = [];

      for (const call of calls) {
        console.log(`Gemini solicitou Tool: ${call.name}`);
        
        try {
          // A MÁGICA: Chamamos a tool do seu colega via MCP
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

      // Adiciona o resultado da execução no histórico (como 'user' reportando pra 'model')
      historyManager.addMessage(user.user_id, {
        role: 'user', // O Gemini exige que functionResponses sejam enviadas na role do usuário ou function
        parts: functionResponses
      });

      // Devolve o resultado pro Gemini pra ele formular a resposta final ou pedir mais coisas
      result = await chat.sendMessage(functionResponses as any);
    }

    // 4. Salva a resposta de texto final do modelo
    finalResponseText = result.response.text();
    historyManager.addMessage(user.user_id, {
      role: 'model',
      parts: [{ text: finalResponseText }]
    });

    // 5. Retorna ao Frontend
    res.json({ reply: finalResponseText });
  } catch (error: any) {
    console.error('Erro na rota /chat:', error);
    res.status(500).json({ error: 'Erro interno no servidor de chat.' });
  }
};
