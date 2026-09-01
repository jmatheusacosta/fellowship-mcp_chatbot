export interface MessagePart {
  text?: string;
  functionCall?: any;
  functionResponse?: any;
  thought?: boolean;
  thoughtSignature?: string;
  [key: string]: any;
}

export interface ChatMessage {
  role?: string;
  parts?: MessagePart[] | any[];
  [key: string]: any;
}

export class HistoryManager {
  private histories = new Map<string, any[]>();

  getHistory(userId: string): any[] {
    if (!this.histories.has(userId)) {
      this.histories.set(userId, []);
    }
    return this.histories.get(userId)!;
  }

  addMessage(userId: string, message: any): void {
    const history = this.getHistory(userId);
    history.push(message);
  }

  clearHistory(userId: string): void {
    this.histories.delete(userId);
  }
}

export const historyManager = new HistoryManager();
