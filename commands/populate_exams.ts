import env from '#start/env';
import fs from 'node:fs/promises';
import { BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import db from '@adonisjs/lucid/services/db';

interface ITuss {
  id: string;
  source: string;
  display_name: string;
}

const BATCH_SIZE = 500;

export default class PopulateExams extends BaseCommand {
  static commandName = 'exams:populate';
  static description = 'Popula a tabela de exames a partir de um arquivo JSON do TUSS';
  static options: CommandOptions = {
    startApp: true,
  };

  @flags.string({
    description: 'Caminho do arquivo JSON do TUSS (default: TUSS_FILE no .env)',
    required: false,
  })
  declare file: string;

  private chunk(items: ITuss[], size: number): ITuss[][] {
    const chunks: ITuss[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  async run() {
    this.file = this.file || env.get('TUSS_FILE', '');
    if (!this.file) {
      this.logger.error('Informe o arquivo via --file ou defina TUSS_FILE no .env.');
      this.exitCode = 1;
      return;
    }

    let data: ITuss[];

    try {
      const contents = await fs.readFile(this.file, { encoding: 'utf-8' });
      data = JSON.parse(contents) as ITuss[];
    } catch (error) {
      this.logger.error(`Falha ao ler o arquivo "${this.file}": ${error.message}`);
      this.exitCode = 1;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      this.logger.warning('Nenhum registro encontrado no arquivo.');
      return;
    }

    const rows = data.filter((item) => item?.id && item?.display_name);
    const skipped = data.length - rows.length;
    if (skipped > 0) {
      this.logger.warning(`${skipped} registro(s) ignorado(s) por não possuir id/display_name.`);
    }

    let processed = 0;

    try {
      for (const batch of this.chunk(rows, BATCH_SIZE)) {
        const placeholders = Array.from({ length: batch.length }, () => "(?, ?, ?, ?, '{}', NOW())").join(', ');

        const sql = `
          INSERT INTO exams (code, name, type, description, tags, created_at)
          VALUES ${placeholders}
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            description = EXCLUDED.description,
            updated_at = NOW()
        `;

        const bindings = batch.flatMap((item) => [item.id, item.display_name.slice(0, 255), item.source ?? null, item.display_name]);

        await db.rawQuery(sql, bindings);
        processed += batch.length;
        this.logger.info(`Processados ${processed}/${rows.length} registros...`);
      }

      this.logger.success(`Concluído: ${processed} exames populados/atualizados.`);
    } catch (error) {
      this.logger.error(`Falha ao inserir os registros: ${error.message}`);
      this.exitCode = 1;
    }
  }
}
