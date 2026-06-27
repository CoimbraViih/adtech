'use client'

import { useState } from 'react'
import type { ExportDestination, ExportDestinationType, ExportSchedule } from '@/types/database'

type Props = {
  onSaved: (destination: ExportDestination) => void
  onCancel: () => void
}

const inputClass =
  'w-full rounded border bg-[var(--color-base)] px-3 py-2 text-sm text-white placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]'
const labelClass = 'block text-xs mb-1'

export function ExportDestinationForm({ onSaved, onCancel }: Props) {
  const [name, setName] = useState('')
  const [destinationType, setDestinationType] = useState<ExportDestinationType>('csv_download')
  const [schedule, setSchedule] = useState<ExportSchedule | ''>('')

  // BigQuery config
  const [bqProjectId, setBqProjectId] = useState('')
  const [bqDatasetId, setBqDatasetId] = useState('')
  const [bqTableId, setBqTableId] = useState('')
  const [bqCredentials, setBqCredentials] = useState('')

  // Snowflake config
  const [sfAccount, setSfAccount] = useState('')
  const [sfUsername, setSfUsername] = useState('')
  const [sfPassword, setSfPassword] = useState('')
  const [sfWarehouse, setSfWarehouse] = useState('')
  const [sfDatabase, setSfDatabase] = useState('')
  const [sfSchema, setSfSchema] = useState('')
  const [sfTable, setSfTable] = useState('')

  // S3 config
  const [s3Bucket, setS3Bucket] = useState('')
  const [s3Region, setS3Region] = useState('')
  const [s3Prefix, setS3Prefix] = useState('')
  const [s3AccessKeyId, setS3AccessKeyId] = useState('')
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState('')

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function buildConfig(): Record<string, unknown> {
    switch (destinationType) {
      case 'bigquery':
        return {
          project_id: bqProjectId,
          dataset_id: bqDatasetId,
          table_id: bqTableId,
          credentials_json: bqCredentials,
        }
      case 'snowflake':
        return {
          account: sfAccount,
          username: sfUsername,
          password: sfPassword,
          warehouse: sfWarehouse,
          database: sfDatabase,
          schema: sfSchema,
          table: sfTable,
        }
      case 's3':
        return {
          bucket: s3Bucket,
          region: s3Region,
          prefix: s3Prefix,
          access_key_id: s3AccessKeyId,
          secret_access_key: s3SecretAccessKey,
        }
      case 'csv_download':
      default:
        return {}
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/export/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          destination_type: destinationType,
          config: buildConfig(),
          schedule: schedule || null,
        }),
      })

      const data = (await res.json()) as { destination?: ExportDestination; error?: string }

      if (!res.ok || !data.destination) {
        setErrorMsg(data.error ?? 'Falha ao salvar destino')
        return
      }

      onSaved(data.destination)
    } catch (err) {
      setErrorMsg((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border p-4 flex flex-col gap-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <h3 className="text-sm font-medium text-white">Novo destino de exportação</h3>

      {/* Name */}
      <div>
        <label className={labelClass} style={{ color: 'var(--color-muted)' }}>
          Nome *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: BigQuery Produção"
          required
          className={inputClass}
          style={{ borderColor: 'var(--color-border)' }}
        />
      </div>

      {/* Destination type */}
      <div>
        <label className={labelClass} style={{ color: 'var(--color-muted)' }}>
          Tipo de destino
        </label>
        <select
          value={destinationType}
          onChange={(e) => setDestinationType(e.target.value as ExportDestinationType)}
          className={inputClass}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <option value="bigquery">BigQuery</option>
          <option value="snowflake">Snowflake</option>
          <option value="s3">S3</option>
          <option value="csv_download">CSV Download</option>
        </select>
      </div>

      {/* Schedule */}
      <div>
        <label className={labelClass} style={{ color: 'var(--color-muted)' }}>
          Agendamento
        </label>
        <select
          value={schedule}
          onChange={(e) => setSchedule(e.target.value as ExportSchedule | '')}
          className={inputClass}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <option value="">Nenhum (manual)</option>
          <option value="hourly">A cada hora</option>
          <option value="daily">Diário</option>
        </select>
      </div>

      {/* BigQuery config */}
      {destinationType === 'bigquery' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            Configuração BigQuery
          </p>
          <input type="text" placeholder="Project ID" value={bqProjectId} onChange={(e) => setBqProjectId(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Dataset ID" value={bqDatasetId} onChange={(e) => setBqDatasetId(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Table ID" value={bqTableId} onChange={(e) => setBqTableId(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <textarea
            placeholder="credentials.json (conteúdo)"
            value={bqCredentials}
            onChange={(e) => setBqCredentials(e.target.value)}
            rows={4}
            className={inputClass}
            style={{ borderColor: 'var(--color-border)', resize: 'vertical' }}
          />
        </div>
      )}

      {/* Snowflake config */}
      {destinationType === 'snowflake' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            Configuração Snowflake
          </p>
          <input type="text" placeholder="Account (ex: xy12345.us-east-1)" value={sfAccount} onChange={(e) => setSfAccount(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Username" value={sfUsername} onChange={(e) => setSfUsername(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="password" placeholder="Password" value={sfPassword} onChange={(e) => setSfPassword(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Warehouse" value={sfWarehouse} onChange={(e) => setSfWarehouse(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Database" value={sfDatabase} onChange={(e) => setSfDatabase(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Schema" value={sfSchema} onChange={(e) => setSfSchema(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Table" value={sfTable} onChange={(e) => setSfTable(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
        </div>
      )}

      {/* S3 config */}
      {destinationType === 's3' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            Configuração S3
          </p>
          <input type="text" placeholder="Bucket" value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Região (ex: us-east-1)" value={s3Region} onChange={(e) => setS3Region(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Prefix (ex: exports/)" value={s3Prefix} onChange={(e) => setS3Prefix(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="text" placeholder="Access Key ID" value={s3AccessKeyId} onChange={(e) => setS3AccessKeyId(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
          <input type="password" placeholder="Secret Access Key" value={s3SecretAccessKey} onChange={(e) => setS3SecretAccessKey(e.target.value)} className={inputClass} style={{ borderColor: 'var(--color-border)' }} />
        </div>
      )}

      {errorMsg && (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {errorMsg}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          {saving ? 'Salvando…' : 'Salvar destino'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
