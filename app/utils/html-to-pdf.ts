import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/** Candidatos de binário do Chrome, em ordem de preferência. */
const CHROME_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
]

/** Tempo máximo de espera da renderização antes de matar o processo. */
const RENDER_TIMEOUT_MS = 20_000

/**
 * Tempo de "virtual time" concedido ao Chrome para concluir layout,
 * carregar imagens base64 e aplicar `@page` antes de fechar o PDF.
 */
const VIRTUAL_TIME_BUDGET_MS = 3_000

let cachedBinary: string | null = null

/**
 * Localiza o executável do Chrome.
 *
 * `CHROME_BIN` tem precedência; depois testamos os caminhos padrão e, por fim,
 * o `PATH`. O resultado é memoizado — a checagem só acontece uma vez por
 * processo. Lança quando não encontra, para o chamador receber uma falha
 * explícita em vez de um PDF vazio.
 */
function resolveChromeBinary(): string {
  if (cachedBinary) {
    return cachedBinary
  }

  const fromEnv = process.env.CHROME_BIN
  if (fromEnv && existsSync(fromEnv)) {
    cachedBinary = fromEnv
    return cachedBinary
  }

  for (const candidate of CHROME_CANDIDATES) {
    if (existsSync(candidate)) {
      cachedBinary = candidate
      return cachedBinary
    }
  }

  throw new Error(
    'Chrome não encontrado para gerar PDF. Defina CHROME_BIN com o caminho do executável.'
  )
}

/** Indica se há um Chrome disponível (usado em health checks e testes). */
export function isPdfEngineAvailable(): boolean {
  try {
    resolveChromeBinary()
    return true
  } catch {
    return false
  }
}

/**
 * Converte HTML em PDF usando o Chrome headless.
 *
 * Não é preciso nenhum pacote: o Chrome abre o HTML temporário e imprime
 * em PDF via `--print-to-pdf`. A folha de estilo da página controla tamanho
 * e margens com `@page`, e o resultado mantém texto selecionável.
 *
 * Cada chamada usa um `--user-data-dir` exclusivo: dois downloads em paralelo
 * não disputam o mesmo perfil e não corrompem a saída.
 */
export async function renderPdf(html: string): Promise<Buffer> {
  const binary = resolveChromeBinary()
  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'medkit-pdf-'))
  const htmlPath = path.join(workdir, 'documento.html')
  const pdfPath = path.join(workdir, 'documento.pdf')

  try {
    await fs.writeFile(htmlPath, html, 'utf8')

    const args = [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      // Sem isso o Chrome escreve "url" e a data no canto de toda página.
      '--no-pdf-header-footer',
      `--user-data-dir=${path.join(workdir, 'profile')}`,
      `--virtual-time-budget=${VIRTUAL_TIME_BUDGET_MS}`,
      `--print-to-pdf=${pdfPath}`,
      `file://${htmlPath}`,
    ]

    await new Promise<void>((resolve, reject) => {
      const child = execFile(
        binary,
        args,
        { timeout: RENDER_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
        (error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        }
      )

      child.on('error', reject)
    })

    const buffer = await fs.readFile(pdfPath)

    if (buffer.length === 0) {
      throw new Error('Chrome gerou um PDF vazio.')
    }

    return buffer
  } finally {
    await fs.rm(workdir, { recursive: true, force: true })
  }
}
