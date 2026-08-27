import './env.js';
import http from 'http';
import { app } from './app.js';
import { WebSocketGateway } from '@eazzio/notification';

const port = process.env.API_PORT || 8080;
const server = http.createServer(app);

// Attach Realtime WebSocket Gateway directly to HTTP Server on /ws
export const wsGateway = new WebSocketGateway({
  server,
  verifyAuth: async (token) => {
    return { userId: token ? `user_${token}` : 'user_guest' };
  },
});

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  server.listen(port, () => {
    console.log(`🚀 Eazzio Mail Backend API Server listening on port ${port} (Transport: ${process.env.MAIL_TRANSPORT || 'relay'})`);
    console.log(`📡 Realtime WebSocket Gateway mounted at ws://0.0.0.0:${port}/ws`);
  });
}
