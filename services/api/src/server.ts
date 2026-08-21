import { app } from './app.js';

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`🚀 Eazzio Mail Backend API Server listening on port ${port}`);
});
