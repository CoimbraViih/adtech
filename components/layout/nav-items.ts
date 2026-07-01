import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Sparkles,
  BarChart3,
  Radio,
  FileText,
  Zap,
  Settings,
  Layers,
  Users,
  GitCompareArrows,
  List,
  Download,
  Palette,
  Handshake,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** When true, marks this item active for any route starting with `href` */
  matchPrefix?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",               icon: LayoutDashboard },
  { label: "Campanhas",     href: "/campaigns",               icon: Megaphone },
  { label: "Programático",  href: "/campaigns/programmatic",  icon: Layers },
  { label: "Deals",         href: "/campaigns/programmatic/deals", icon: Handshake },
  { label: "Audiências",    href: "/audiences",               icon: Users },
  { label: "Criativos",     href: "/creatives",               icon: Sparkles },
  { label: "Analytics",     href: "/analytics",               icon: BarChart3 },
  { label: "Reconciliação", href: "/analytics/reconciliation", icon: GitCompareArrows },
  { label: "Eventos",       href: "/analytics/events",         icon: List },
  { label: "Pixel",         href: "/pixel",                   icon: Radio },
  { label: "Landing Pages", href: "/landing-pages",           icon: FileText },
  { label: "Automação",     href: "/automation",              icon: Zap },
  { label: "Otimização Preditiva", href: "/automation/predictive", icon: Sparkles },
  { label: "Configurações", href: "/settings",                icon: Settings, matchPrefix: true },
  { label: "Exportações",   href: "/settings/exports",        icon: Download, matchPrefix: false },
  { label: "Branding",      href: "/settings/branding",       icon: Palette, matchPrefix: false },
];
