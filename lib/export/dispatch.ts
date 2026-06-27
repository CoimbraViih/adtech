import type { ExportDestination } from '@/types/database'
import type { EventRow } from '@/lib/events/query'
import { isBigQueryConfig, exportToBigQuery } from './bigquery'
import { isSnowflakeConfig, exportToSnowflake } from './snowflake'
import { isS3Config, exportToS3 } from './s3'

export async function runExport(
  destination: ExportDestination,
  rows: EventRow[],
  filename: string,
): Promise<{ rows_exported: number; output_path: string }> {
  const { destination_type, config } = destination

  switch (destination_type) {
    case 'bigquery': {
      if (!isBigQueryConfig(config)) {
        throw new Error(`Invalid config for destination ${destination_type}`)
      }
      return exportToBigQuery(config, rows)
    }

    case 'snowflake': {
      if (!isSnowflakeConfig(config)) {
        throw new Error(`Invalid config for destination ${destination_type}`)
      }
      return exportToSnowflake(config, rows)
    }

    case 's3': {
      if (!isS3Config(config)) {
        throw new Error(`Invalid config for destination ${destination_type}`)
      }
      return exportToS3(config, rows, filename)
    }

    case 'csv_download': {
      throw new Error('csv_download destinations do not support scheduled export')
    }

    default: {
      // TypeScript exhaustiveness guard
      const _exhaustive: never = destination_type
      throw new Error(`Unknown destination type: ${String(_exhaustive)}`)
    }
  }
}
