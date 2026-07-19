import { readFile } from 'node:fs/promises';

const files = [
  'src/portal-utils.js',
  'src/portal-schema.js',
  'src/portal-auth.js',
  'src/portal-orders.js',
  'src/portal-email.js',
  'src/portal-admin-routes.js',
  'src/portal-public-routes.js',
  'src/store-v3.js',
  'public/studio/studio.js',
  'public/studio/clients.js',
  'public/espace-client/client.js',
];

for (const file of files) await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
console.log(`Workflow model ready: ${files.length} critical files loaded.`);
