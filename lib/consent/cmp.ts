// lib/consent/cmp.ts
// Gera o HTML de embed para o cliente instalar o pixel AdFlow com suporte a CMP (AdOpt).
// Não faz I/O — pure functions para facilitar teste.

export type PixelSnippetOptions = {
  endpoint?: string; // default: 'https://app.adflow.com.br'
  cmpSiteKey?: string; // chave AdOpt (opcional — se ausente, consent default = 'granted')
  defaultConsent?: 'granted' | 'denied' | 'unknown'; // default: 'unknown' quando cmpSiteKey presente, 'granted' se ausente
};

export function generatePixelSnippet(
  pixelId: string,
  opts: PixelSnippetOptions = {}
): string {
  const endpoint = opts.endpoint ?? 'https://app.adflow.com.br';
  // Validate cmpSiteKey: only allow alphanumeric, hyphens, underscores (typical slug format)
  const safeCmpSiteKey = opts.cmpSiteKey?.replace(/[^a-zA-Z0-9\-_]/g, '') ?? undefined;
  const hasAdopt = Boolean(safeCmpSiteKey);
  const defaultConsent = opts.defaultConsent ?? (hasAdopt ? 'unknown' : 'granted');

  const adoptScript = hasAdopt
    ? `
  <!-- AdOpt CMP -->
  <script>
    window.adoptConfig = { siteKey: "${safeCmpSiteKey}" };
    window.adoptCallback = function(consent) {
      if (window.__adflowConsentCallback) window.__adflowConsentCallback(consent.analytics !== false);
    };
  </script>
  <script async src="https://cdn.adopt.com.br/adopt.js"></script>`
    : '';

  const defaultConsentScript =
    defaultConsent !== 'granted'
      ? `\n  <script>window.adflow && window.adflow("consent","default",{analytics_storage:"${defaultConsent}",ad_storage:"${defaultConsent}"});</script>`
      : '';

  return `<!-- AdFlow Pixel ${pixelId} -->
<script>
  window.__ADFLOW_PIXEL_ID = "${pixelId}";
  window.__ADFLOW_ENDPOINT = "${endpoint}";
</script>
<script async src="${endpoint}/adflow.js"></script>${defaultConsentScript}${adoptScript}`;
}
