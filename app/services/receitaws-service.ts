import { ApiException } from '../utils/api-error.js';

/**
 * Contrato normalizado do lookup de CNPJ (fonte: Receitaws).
 * `address` já sai no formato aceito pelo `AddressService`.
 */
export interface ICnpjLookup {
  cnpjf: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: {
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    country: string;
    zip: string | null;
  } | null;
}

type Fetcher = (url: string, init?: { signal?: AbortSignal }) => Promise<Pick<Response, 'status' | 'json'>>;

interface IReceitawsRaw {
  status?: string | number;
  message?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  [key: string]: unknown;
}

export type ReceitawsServiceDeps = {
  fetcher?: Fetcher;
  baseUrl?: string;
  timeoutMs?: number;
};

export default class ReceitawsService {
  private readonly fetcher: Fetcher;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(deps: ReceitawsServiceDeps = {}) {
    this.fetcher = deps.fetcher ?? (globalThis.fetch as Fetcher).bind(globalThis);
    this.baseUrl = deps.baseUrl ?? process.env.RECEITAWS_BASE_URL ?? 'https://www.receitaws.com.br/v1/cnpj';
    this.timeoutMs = deps.timeoutMs ?? 10_000;
  }

  /**
   * Consulta o CNPJ na Receitaws e devolve os dados normalizados.
   *
   * Erros mapeados:
   * - 400 `CNPJ_INVALID`: menos de 14 dígitos;
   * - 404 `CNPJ_NOT_FOUND`: CNPJ não existe na base;
   * - 429 `CNPJ_LOOKUP_RATE_LIMITED`: plano free da Receitaws permite 3 req/min;
   * - 503 `CNPJ_LOOKUP_FAILED`: indisponibilidade/timeout da fonte.
   */
  async lookup(cnpjf: string | undefined | null): Promise<ICnpjLookup> {
    const digits = String(cnpjf ?? '').replace(/\D/g, '');

    if (digits.length !== 14) {
      throw new ApiException(400, 'CNPJ_INVALID', 'Informe os 14 dígitos do CNPJ.', { cnpjf: digits });
    }

    const raw = await this.fromReceitaws(digits);

    if (raw.status !== 'OK') {
      throw new ApiException(
        404,
        'CNPJ_NOT_FOUND',
        'CNPJ não encontrado na base da Receitaws.',
        { cnpjf: digits, message: raw.message ?? null },
      );
    }

    const optional = (value: unknown): string | null => {
      const text = typeof value === 'string' ? value.trim() : '';
      return text || null;
    };

    const street = optional(raw.logradouro);

    return {
      cnpjf: digits,
      name: optional(raw.nome) ?? '',
      email: optional(raw.email),
      phone: optional(raw.telefone),
      address: street
        ? {
            street,
            number: optional(raw.numero),
            complement: optional(raw.complemento),
            district: optional(raw.bairro),
            city: optional(raw.municipio),
            state: optional(raw.uf),
            country: 'Brasil',
            zip: optional(raw.cep),
          }
        : null,
    };
  }

  private async fromReceitaws(digits: string): Promise<IReceitawsRaw> {
    let response: Pick<Response, 'status' | 'json'>;

    try {
      response = await this.fetcher(`${this.baseUrl}/${digits}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new ApiException(503, 'CNPJ_LOOKUP_FAILED', 'Falha ao consultar o CNPJ. Tente novamente em instantes.', {});
    }

    if (response.status === 429) {
      throw new ApiException(
        429,
        'CNPJ_LOOKUP_RATE_LIMITED',
        'Muitas consultas de CNPJ em sequência. Aguarde um instante e tente novamente.',
        {},
      );
    }

    if (response.status === 404) {
      throw new ApiException(404, 'CNPJ_NOT_FOUND', 'CNPJ não encontrado na base da Receitaws.', { cnpjf: digits });
    }

    if (response.status >= 400) {
      throw new ApiException(503, 'CNPJ_LOOKUP_FAILED', 'Falha ao consultar o CNPJ. Tente novamente em instantes.', {
        http_status: response.status,
      });
    }

    return (await response.json()) as IReceitawsRaw;
  }
}
