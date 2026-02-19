require('dotenv').config();
const { execSync } = require('child_process');
const app = require('./app');
const PORT = process.env.PORT || 3001;

// Auto-create database tables on first run
try {
  console.log('Running database sync...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('Database ready.');
} catch (err) {
  console.error('Database sync failed:', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
