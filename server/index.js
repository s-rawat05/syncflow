import { createApp } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`SyncFlow backend server running on http://localhost:${PORT}`);
});
