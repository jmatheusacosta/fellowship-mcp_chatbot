import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { mcpService } from './mcpClient';
import { authenticateToken } from './authMiddleware';
import { chatHandler } from './chatController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-super-segura-mock';

app.use(cors());
app.use(express.json());


app.post('/login', (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username é obrigatório' });
  }

  const user_id = `user_${username.toLowerCase()}`;

  const token = jwt.sign({ user_id, username }, JWT_SECRET, {
    expiresIn: '1h'
  });

  return res.json({ token, user_id, username });
});

// Rota de Chat
app.post('/chat', authenticateToken, chatHandler);

app.listen(PORT, async () => {
  console.log(`Servidor Orquestrador rodando na porta ${PORT}`);
  
  // Conecta ao servidor MCP assim que o orquestrador subir
  await mcpService.connect();
});
