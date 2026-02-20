import type { Response } from "express";

const clients = new Set<Response>();

export function addClient(res: Response) {
  clients.add(res);
}

export function removeClient(res: Response) {
  clients.delete(res);
}

export function broadcast(event: any) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;

  for (const client of clients) {
    client.write(payload);
  }
}
