import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Sparkles,
  BarChart3,
  Radio,
  Zap,
  Settings,
  Layers,
  Users,
  GitCompareArrows,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** When true, marks this item active for any route starting with `href` */
  matchPrefix?: boolean;
  /** Sub-paths that should NOT activate this item (used to avoid collision with sibling items) */
  excludePrefixes?: string[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",               icon: LayoutDashboard },
  { label: "Campanhas",     href: "/campaigns",               icon: Megaphone,    excludePrefixes: ["/campaigns/programmatic"] },
  { label: "Programático",  href: "/campaigns/programmatic",  icon: Layers },
  { label: "Audiências",    href: "/audiences",               icon: Users },
  { label: "Criativos",     href: "/creatives",               icon: Sparkles },
  { label: "Analytics",     href: "/analytics",               icon: BarChart3,    excludePrefixes: ["/analytics/reconciliation"] },
  { label: "Reconciliação", href: "/analytics/reconciliation", icon: GitCompareArrows },
  { label: "Pixel",         href: "/pixel",                   icon: Radio },
  { label: "Automação",     href: "/automation",              icon: Zap },
  { label: "Configurações", href: "/settings",                icon: Settings, matchPrefix: true },
];
