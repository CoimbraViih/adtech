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
  Plug,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
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
  { label: "Integrações",   href: "/settings/integrations",   icon: Plug },
  { label: "Configurações", href: "/settings",                icon: Settings },
];
