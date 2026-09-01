import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { mcpService } from './mcpClient';
import { authenticateToken } from './authMiddleware';
import { chatHandler } from './chatController';
import { usuarios } from '@shared/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-super-segura-mock';

// Helper para normalizar strings (remover acentos e minúsculas)
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

app.use(cors());
app.use(express.json());

app.post('/login', (req: Request, res: Response) => {
  const loginInput = req.body.username || req.body.user_id || req.body.id;

  if (!loginInput || typeof loginInput !== 'string') {
    return res.status(400).json({ error: 'Username é obrigatório' });
  }

  const normalizedInput = normalizeText(loginInput);

  // Busca o usuário na base compartilhada por id (user_usr_001, usr_001, user_carlos silva), nome completo ou primeiro nome
  const usuarioEncontrado = usuarios.find((u) => {
    const idNorm = normalizeText(u.id);                      // ex: "user_carlos silva"
    const idShortNorm = normalizeText(u.id.replace(/^user_/, '')); // ex: "carlos silva" ou "usr_001"
    const nomeNorm = normalizeText(u.nome);                  // ex: "carlos silva"
    const primeiroNomeNorm = normalizeText(u.nome.split(' ')[0] || ''); // ex: "carlos"

    return (
      idNorm === normalizedInput ||
      idShortNorm === normalizedInput ||
      nomeNorm === normalizedInput ||
      primeiroNomeNorm === normalizedInput
    );
  });

  if (!usuarioEncontrado) {
    return res.status(401).json({ error: 'Usuário não cadastrado.' });
  }

  // user_id assinado no JWT é SEMPRE o ID oficial cadastrado no banco de dados
  const user_id = usuarioEncontrado.id;

  const token = jwt.sign({ user_id, username: usuarioEncontrado.nome }, JWT_SECRET, {
    expiresIn: '1h',
  });

  return res.status(200).json({
    token,
    user_id,
    username: usuarioEncontrado.nome,
  });
});

// Rota de Chat
app.post('/chat', authenticateToken, chatHandler);

app.listen(PORT, async () => {
  console.log(`Servidor Orquestrador rodando na porta ${PORT}`);

  // Conecta ao servidor MCP assim que o orquestrador subir
  await mcpService.connect();
});
