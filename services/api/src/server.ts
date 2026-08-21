import './env.js';
import { app } from './app.js';

const port = process.env.API_PORT || 8080;

app.listen(port, () => {
  console.log(`🚀 Eazzio Mail Backend API Server listening on port ${port} (Transport: ${process.env.MAIL_TRANSPORT || 'relay'})`);
});
