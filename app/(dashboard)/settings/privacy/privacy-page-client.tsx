'use client';

import { useState } from 'react';
import { generatePixelSnippet } from '@/lib/consent/cmp';

type Pixel = {
  id: string;
  name: string;
  cmp_site_key: string | null;
  data_retention_days: number;
};

type DeletionRequest = {
  id: string;
  scope: string;
  status: string;
  rows_deleted: number | null;
  completed_at: string | null;
  created_at: string;
};

type Props = {
  pixels: Pixel[];
  deletionRequests: DeletionRequest[];
  isAdmin: boolean;
};

export default function PrivacyPageClient({ pixels, deletionRequests, isAdmin }: Props) {
  const [selectedPixel, setSelectedPixel] = useState<Pixel | null>(pixels[0] ?? null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function submitDeletionRequest(scope: 'all' | 'pixel_events' | 'analytics') {
    setRequestStatus('loading');
    try {
      const res = await fetch('/api/lgpd/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      if (!res.ok) throw new Error('failed');
      setRequestStatus('done');
    } catch {
      setRequestStatus('error');
    }
  }

  const snippet = selectedPixel
    ? generatePixelSnippet(selectedPixel.id, {
        cmpSiteKey: selectedPixel.cmp_site_key ?? undefined,
      })
    : '';

  return (
    <div className="p-6 max-w-3xl space-y-8">

      {/* Seção CMP / Pixel Embed */}
      <section>
        <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)] mb-1">
          Consentimento (LGPD / CMP)
        </h2>
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mb-4">
          Adicione o snippet abaixo ao &lt;head&gt; do site do cliente. Com a chave AdOpt configurada,
          o pixel respeita automaticamente o consentimento do usuário.
        </p>

        {pixels.length > 1 && (
          <div className="mb-3">
            <label className="text-xs text-[color:var(--adflow-fg-muted)] block mb-1">Pixel</label>
            <select
              className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] text-sm rounded px-2 py-1"
              value={selectedPixel?.id ?? ''}
              onChange={(e) => setSelectedPixel(pixels.find((p) => p.id === e.target.value) ?? null)}
            >
              {pixels.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <pre className="bg-[color:var(--adflow-surface)] border border-[color:var(--adflow-border)] rounded p-3 text-xs text-[color:var(--adflow-fg)] overflow-x-auto whitespace-pre-wrap">
          {snippet || 'Nenhum pixel configurado.'}
        </pre>
      </section>

      {/* Seção Apagamento LGPD */}
      <section>
        <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)] mb-1">
          Apagamento de Dados — LGPD art. 18
        </h2>
        <p className="text-xs text-[color:var(--adflow-fg-muted)] mb-4">
          Solicitar apagamento de todos os dados pessoais coletados pelo pixel desta organização.
          A operação é irreversível e executada em até 24h.
        </p>

        {isAdmin && (
          <div className="flex gap-2 mb-6">
            <button
              disabled={requestStatus === 'loading'}
              onClick={() => submitDeletionRequest('pixel_events')}
              className="px-3 py-1.5 text-xs rounded border border-[color:var(--adflow-border)] text-[color:var(--adflow-fg)] hover:bg-[color:var(--adflow-surface)] disabled:opacity-50"
            >
              Apagar eventos de pixel
            </button>
            <button
              disabled={requestStatus === 'loading'}
              onClick={() => submitDeletionRequest('all')}
              className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Apagar tudo (todos os dados pessoais)
            </button>
          </div>
        )}

        {requestStatus === 'done' && (
          <p className="text-xs text-green-400 mb-4">Pedido de apagamento criado com sucesso.</p>
        )}
        {requestStatus === 'error' && (
          <p className="text-xs text-red-400 mb-4">Erro ao criar pedido. Tente novamente.</p>
        )}

        {/* Histórico de pedidos */}
        {deletionRequests.length > 0 && (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--adflow-border)] text-[color:var(--adflow-fg-muted)]">
                <th className="text-left py-1.5 pr-4">Data</th>
                <th className="text-left py-1.5 pr-4">Escopo</th>
                <th className="text-left py-1.5 pr-4">Status</th>
                <th className="text-right py-1.5">Linhas removidas</th>
              </tr>
            </thead>
            <tbody>
              {deletionRequests.map((r) => (
                <tr key={r.id} className="border-b border-[color:var(--adflow-border)]">
                  <td className="py-1.5 pr-4 text-[color:var(--adflow-fg-muted)]">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-1.5 pr-4 text-[color:var(--adflow-fg)]">{r.scope}</td>
                  <td className="py-1.5 pr-4">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      r.status === 'completed'
                        ? 'bg-green-900 text-green-400'
                        : r.status === 'failed'
                        ? 'bg-red-900 text-red-400'
                        : 'bg-yellow-900 text-yellow-400'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-[color:var(--adflow-fg)]">
                    {r.rows_deleted ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
