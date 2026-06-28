import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { WhitelabelTheme, getWhitelabelLogoUrl } from '@/components/whitelabel/whitelabel-theme'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const whitelabelLogoUrl = await getWhitelabelLogoUrl()

  return (
    <div className="flex h-screen overflow-hidden bg-[color:var(--adflow-base)]">
      <WhitelabelTheme />
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar logoUrl={whitelabelLogoUrl} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
