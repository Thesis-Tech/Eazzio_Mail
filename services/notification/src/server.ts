import { WebSocketGateway } from './gateway/websocket-gateway.js';

const wsPort = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8081;

export const gateway = new WebSocketGateway({
  port: wsPort,
  verifyAuth: async (token) => {
    return { userId: token ? `user_${token}` : 'user_guest' };
  },
});

console.log(`📡 Eazzio Notification Realtime WebSocket Gateway listening on port ${gateway.port}`);
