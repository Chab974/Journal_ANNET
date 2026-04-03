import { appendFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

import { fromRepo } from './lib/utils.mjs';
import { buildVercelLogsArgs, formatLocalLogLine } from './lib/vercel-logs.mjs';

const outputFile = process.env.VERCEL_LOG_FILE || fromRepo('logs', 'vercel-webhook.log');
const target = process.env.VERCEL_LOG_TARGET || 'journal-annet.vercel.app';
const environment = process.env.VERCEL_LOG_ENV || 'production';
const query = process.env.VERCEL_LOG_QUERY || '';

function printUsage(error) {
  if (error) {
    console.error(error);
  }

  console.error(
    'Usage local: `npm run logs:webhook`\n' +
      `Variables optionnelles: VERCEL_LOG_TARGET=${target} VERCEL_LOG_ENV=${environment} VERCEL_LOG_QUERY="..."`,
  );
}

async function appendLocalLog(source, line) {
  if (!line) {
    return;
  }

  await mkdir(fromRepo('logs'), { recursive: true });
  await appendFile(outputFile, formatLocalLogLine(line, { source }), 'utf8');
}

function mirrorStream(stream, source) {
  let buffer = '';

  stream.setEncoding('utf8');
  stream.on('data', async (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const writer = source === 'stderr' ? process.stderr : process.stdout;
      writer.write(`${line}\n`);
      try {
        await appendLocalLog(source, line);
      } catch (error) {
        process.stderr.write(`Impossible d'écrire ${outputFile}: ${error.message}\n`);
      }
    }
  });

  stream.on('end', async () => {
    if (!buffer.trim()) {
      return;
    }

    const writer = source === 'stderr' ? process.stderr : process.stdout;
    writer.write(`${buffer}\n`);
    try {
      await appendLocalLog(source, buffer);
    } catch (error) {
      process.stderr.write(`Impossible d'écrire ${outputFile}: ${error.message}\n`);
    }
  });
}

async function main() {
  const args = buildVercelLogsArgs({
    environment,
    query,
    target,
  });

  await mkdir(fromRepo('logs'), { recursive: true });
  await appendFile(
    outputFile,
    formatLocalLogLine(`--- Session started for ${target} (${environment}) ---`, { source: 'local' }),
    'utf8',
  );

  console.log(`Suivi des logs Vercel lancé pour ${target}.`);
  console.log(`Sortie locale: ${outputFile}`);
  console.log(`Commande exécutée: vercel ${args.join(' ')}`);

  const child = spawn('vercel', args, {
    cwd: fromRepo(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.on('error', (error) => {
    if (error.code === 'ENOENT') {
      printUsage('Vercel CLI introuvable. Installe-la puis connecte-toi avant de lancer cette commande.');
      process.exitCode = 1;
      return;
    }

    console.error(`Impossible de lancer Vercel CLI: ${error.message}`);
    process.exitCode = 1;
  });

  mirrorStream(child.stdout, 'stdout');
  mirrorStream(child.stderr, 'stderr');

  child.on('exit', async (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    await appendLocalLog('local', `--- Session ended (${reason}) ---`);
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

await main();
