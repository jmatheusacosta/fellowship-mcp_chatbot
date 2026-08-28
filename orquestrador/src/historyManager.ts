export interface MessagePart {
  text?: string;
  functionCall?: any;
  functionResponse?: any;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'function';
  parts: MessagePart[];
}

export class HistoryManager {
  private histories = new Map<string, ChatMessage[]>();

  getHistory(userId: string): ChatMessage[] {
    if (!this.histories.has(userId)) {
      this.histories.set(userId, []);
    }
    return this.histories.get(userId)!;
  }

  addMessage(userId: string, message: ChatMessage): void {
    const history = this.getHistory(userId);
    history.push(message);
  }

  clearHistory(userId: string): void {
    this.histories.delete(userId);
  }
}

export const historyManager = new HistoryManager();
