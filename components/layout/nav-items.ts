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
  { label: "Audiências",    href: "/audiences",               icon: Users },
  { label: "Criativos",     href: "/creatives",               icon: Sparkles },
  { label: "Analytics",     href: "/analytics",               icon: BarChart3 },
  { label: "Pixel",         href: "/pixel",                   icon: Radio },
  { label: "Landing Pages", href: "/landing-pages",           icon: FileText },
  { label: "Automação",     href: "/automation",              icon: Zap },
  { label: "Configurações", href: "/settings",                icon: Settings, matchPrefix: true },
];
