/* eslint-disable @typescript-eslint/no-require-imports -- script Node.js CommonJS */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_ANON_KEY devem estar configuradas no .env.local');
  process.exit(1);
}

// Extrai o project-id da URL do Supabase
// Formato: https://<project-id>.supabase.co
const projectIdMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!projectIdMatch) {
  console.error('❌ Erro: Não foi possível extrair o project-id da URL do Supabase');
  console.error('URL fornecida:', supabaseUrl);
  process.exit(1);
}

const projectId = projectIdMatch[1];
console.log(`🔄 Gerando tipos do Supabase para o projeto: ${projectId}`);

const canonicalPath = path.join(__dirname, '..', 'src', 'types', 'database.ts');
const mirrorPath = path.join(__dirname, '..', 'types', 'database.ts');

try {
  const command = `npx supabase gen types typescript --project-id ${projectId}`;
  const generatedTypes = execSync(command, { encoding: 'utf8', shell: true });

  fs.mkdirSync(path.dirname(canonicalPath), { recursive: true });
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(canonicalPath, generatedTypes, 'utf8');
  fs.writeFileSync(mirrorPath, generatedTypes, 'utf8');

  console.log(`✅ Tipos gerados com sucesso em: ${canonicalPath}`);
  console.log(`✅ Espelho gravado em: ${mirrorPath}`);
} catch (error) {
  console.error('❌ Erro ao gerar tipos:', error.message);
  process.exit(1);
}
