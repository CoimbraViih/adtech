# M0 — Design System & App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Next.js 15 project with the AdFlow design system (tokens, fonts, dark mode) and the full App Shell UI (sidebar, topbar, org-switcher) using mocked data — no Supabase or auth yet.

**Architecture:** Next.js 15 App Router with two route groups: `(auth)` for public pages and `(dashboard)` for the protected shell. The shell layout renders a collapsible sidebar + topbar and is built entirely as Server Components except for interactive pieces (sidebar collapse toggle, org-switcher dropdown). All design tokens live in `app/globals.css` and are aliased in `tailwind.config.ts`.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui, Inter + JetBrains Mono via `next/font/google`, Vitest, Playwright.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `package.json` | Project dependencies |
| Create | `next.config.ts` | Image domains, security headers |
| Create | `tsconfig.json` | Strict TypeScript + `@/*` alias |
| Create | `tailwind.config.ts` | Maps CSS tokens to utility classes |
| Create | `app/globals.css` | CSS custom properties (design tokens) + Tailwind base |
| Create | `app/layout.tsx` | Root layout: fonts, `<html>` attrs, global CSS |
| Create | `app/page.tsx` | Root redirect → `/dashboard` |
| Create | `app/(auth)/login/page.tsx` | Login placeholder (magic link + Google) |
| Create | `app/(auth)/signup/page.tsx` | Signup placeholder |
| Create | `app/(dashboard)/layout.tsx` | Shell: sidebar + topbar grid |
| Create | `app/(dashboard)/page.tsx` | Redirect → `/dashboard` |
| Create | `app/(dashboard)/dashboard/page.tsx` | Dashboard placeholder with mock KPI cards |
| Create | `app/api/health/route.ts` | `GET /api/health` → `{ status: "ok" }` |
| Create | `components/layout/sidebar.tsx` | Collapsible sidebar with nav items |
| Create | `components/layout/topbar.tsx` | Topbar: breadcrumb + workspace selector + user avatar |
| Create | `components/layout/org-switcher.tsx` | Org dropdown (mocked) |
| Create | `components/auth/user-menu.tsx` | User avatar dropdown (mocked) |
| Create | `components/dashboard/kpi-card.tsx` | Metric card: label, value, delta |
| Create | `.env.local.example` | All required env vars (no values) |
| Create | `vitest.config.ts` | Vitest configuration |
| Create | `playwright.config.ts` | Playwright configuration |
| Create | `tests/unit/health.test.ts` | Unit test for health route handler |
| Create | `tests/e2e/shell.spec.ts` | E2E: visit dashboard, see sidebar, topbar |

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `.env.local.example`

- [ ] **Step 1: Bootstrap Next.js 15**

```bash
cd "c:\Users\victo\OneDrive\Área de Trabalho\adtech"
npx create-next-app@latest . --typescript --tailwind --app --src-dir=no --import-alias="@/*" --yes
```

Expected output: "Success! Created project at ..."

- [ ] **Step 2: Verify the scaffold**

```bash
ls
```

Expected: `app/`, `components/`, `public/`, `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`

- [ ] **Step 3: Install additional dependencies**

```bash
npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @playwright/test
npm install class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 4: Initialize shadcn/ui**

```bash
npx shadcn@latest init --defaults
```

When prompted, choose:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

- [ ] **Step 5: Add required shadcn components**

```bash
npx shadcn@latest add button dropdown-menu avatar separator tooltip scroll-area
```

- [ ] **Step 6: Update `.env.local.example`**

```bash
cat > .env.local.example << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# OpenAI
OPENAI_API_KEY=

# AI Providers (M3)
STABILITY_API_KEY=
RUNWAY_API_KEY=

# Tracking (M4)
META_CAPI_TOKEN=
GOOGLE_EC_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(m0): scaffold Next.js 15, install deps, shadcn/ui init"
```

---

## Task 2: Design Tokens & Global CSS

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing test (visual snapshot placeholder)**

This task has no unit test — visual correctness is verified by running the dev server in Step 5. Move on.

- [ ] **Step 2: Replace `app/globals.css` with design tokens**

```css
/* app/globals.css */
@import "tailwindcss";

@layer base {
  :root {
    --color-base:    #0D0D1A;
    --color-surface: #13131F;
    --color-border:  #1E1E2E;
    --color-muted:   #6B7280;
    --color-accent:  #E8390E;
    --color-success: #10B981;
    --color-data:    #3B82F6;
    --color-warning: #F59E0B;
    --color-danger:  #EF4444;
    --color-fg:      #F1F5F9;
    --color-fg-muted: #94A3B8;

    /* shadcn/ui compatibility */
    --background: var(--color-base);
    --foreground: var(--color-fg);
    --card: var(--color-surface);
    --card-foreground: var(--color-fg);
    --border: var(--color-border);
    --input: var(--color-border);
    --ring: var(--color-accent);
    --primary: var(--color-accent);
    --primary-foreground: #ffffff;
    --muted: var(--color-surface);
    --muted-foreground: var(--color-muted);
    --radius: 0.5rem;
  }

  * {
    border-color: var(--color-border);
  }

  body {
    background-color: var(--color-base);
    color: var(--color-fg);
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

- [ ] **Step 3: Update `tailwind.config.ts` to map tokens as utility classes**

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base:    "var(--color-base)",
        surface: "var(--color-surface)",
        border:  "var(--color-border)",
        muted:   "var(--color-muted)",
        accent:  "var(--color-accent)",
        success: "var(--color-success)",
        data:    "var(--color-data)",
        warning: "var(--color-warning)",
        danger:  "var(--color-danger)",
        fg:      "var(--color-fg)",
        "fg-muted": "var(--color-fg-muted)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Update root layout with fonts**

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AdFlow",
  description: "AI-powered AdTech platform for digital agencies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-base text-fg`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Start dev server and verify dark background + fonts**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: dark `#0D0D1A` background, Inter font.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css tailwind.config.ts app/layout.tsx
git commit -m "feat(m0): design tokens, Inter + JetBrains Mono fonts, dark mode base"
```

---

## Task 3: Health Endpoint + Unit Test

**Files:**
- Create: `app/api/health/route.ts`
- Create: `tests/unit/health.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 2: Create test setup file**

```typescript
// tests/setup.ts
import "@testing-library/jest-dom";
```

- [ ] **Step 3: Write the failing test**

```typescript
// tests/unit/health.test.ts
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 4: Run test to confirm it fails**

```bash
npx vitest run tests/unit/health.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/health/route'"

- [ ] **Step 5: Implement the health route**

```typescript
// app/api/health/route.ts
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
```

- [ ] **Step 6: Add test script to `package.json`**

Open `package.json` and add inside `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 7: Run test to confirm it passes**

```bash
npx vitest run tests/unit/health.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add app/api/health/route.ts tests/unit/health.test.ts tests/setup.ts vitest.config.ts
git commit -m "feat(m0): health endpoint, Vitest config, first passing unit test"
```

---

## Task 4: Playwright Setup

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/shell.spec.ts`

- [ ] **Step 1: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Write `playwright.config.ts`**

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 3: Write shell E2E test (will pass after Task 6)**

```typescript
// tests/e2e/shell.spec.ts
import { test, expect } from "@playwright/test";

test("dashboard shell renders sidebar and topbar", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByText("Dashboard")).toBeVisible();
  await expect(page.getByText("Campanhas")).toBeVisible();
  await expect(page.getByText("Criativos")).toBeVisible();
});

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
});
```

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/e2e/shell.spec.ts
git commit -m "feat(m0): Playwright config, shell E2E spec"
```

---

## Task 5: Sidebar Component

**Files:**
- Create: `components/layout/sidebar.tsx`

- [ ] **Step 1: Create `components/layout/sidebar.tsx`**

```typescript
// components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Megaphone,
  Sparkles,
  BarChart3,
  Radio,
  FileText,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",      icon: LayoutDashboard },
  { label: "Campanhas",     href: "/campaigns",      icon: Megaphone },
  { label: "Criativos",     href: "/creatives",      icon: Sparkles },
  { label: "Analytics",     href: "/analytics",      icon: BarChart3 },
  { label: "Pixel",         href: "/pixel",          icon: Radio },
  { label: "Landing Pages", href: "/landing-pages",  icon: FileText },
  { label: "Automação",     href: "/automation",     icon: Zap },
  { label: "Configurações", href: "/settings",       icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        aria-label="Main navigation"
        className={cn(
          "flex flex-col h-screen bg-surface border-r border-border transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 px-4 border-b border-border shrink-0",
          collapsed ? "justify-center" : "gap-2"
        )}>
          <div className="w-6 h-6 rounded bg-accent shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-fg text-sm tracking-tight">AdFlow</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            const linkEl = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                  collapsed ? "justify-center" : "",
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-fg-muted hover:bg-surface hover:text-fg"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return linkEl;
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="shrink-0 p-2 border-t border-border">
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-fg-muted hover:text-fg hover:bg-border transition-colors",
              collapsed ? "justify-center" : ""
            )}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(m0): sidebar component with collapse, active state, tooltips"
```

---

## Task 6: Org Switcher + User Menu

**Files:**
- Create: `components/layout/org-switcher.tsx`
- Create: `components/auth/user-menu.tsx`

- [ ] **Step 1: Create `components/layout/org-switcher.tsx`**

```typescript
// components/layout/org-switcher.tsx
"use client";

import { ChevronDown, Check, Building2 } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Org = { id: string; name: string };

const MOCK_ORGS: Org[] = [
  { id: "1", name: "Agência Exemplo" },
  { id: "2", name: "Cliente Demo" },
];

export function OrgSwitcher() {
  const [selected, setSelected] = useState<Org>(MOCK_ORGS[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-sm text-fg-muted hover:text-fg max-w-[180px]"
        >
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate">{selected.name}</span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 bg-surface border-border">
        <DropdownMenuLabel className="text-fg-muted text-xs">Organizações</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        {MOCK_ORGS.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setSelected(org)}
            className="flex items-center justify-between text-fg hover:bg-border cursor-pointer"
          >
            <span>{org.name}</span>
            {selected.id === org.id && <Check className="w-3.5 h-3.5 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Create `components/auth/user-menu.tsx`**

```typescript
// components/auth/user-menu.tsx
"use client";

import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MOCK_USER = {
  name: "Victor Coimbra",
  email: "victor@agencia.com",
  plan: "Pro",
  initials: "VC",
};

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="bg-accent/20 text-accent text-xs font-medium">
              {MOCK_USER.initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-surface border-border">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-fg">{MOCK_USER.name}</p>
          <p className="text-xs text-fg-muted">{MOCK_USER.email}</p>
          <span className="mt-1 inline-block text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">
            {MOCK_USER.plan}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem className="gap-2 text-fg hover:bg-border cursor-pointer">
          <User className="w-3.5 h-3.5" /> Perfil
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-fg hover:bg-border cursor-pointer">
          <Settings className="w-3.5 h-3.5" /> Configurações
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem className="gap-2 text-danger hover:bg-border cursor-pointer">
          <LogOut className="w-3.5 h-3.5" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/org-switcher.tsx components/auth/user-menu.tsx
git commit -m "feat(m0): org-switcher and user-menu components (mocked)"
```

---

## Task 7: Topbar Component

**Files:**
- Create: `components/layout/topbar.tsx`

- [ ] **Step 1: Create `components/layout/topbar.tsx`**

```typescript
// components/layout/topbar.tsx
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { UserMenu } from "@/components/auth/user-menu";

type TopbarProps = {
  breadcrumb?: string;
};

export function Topbar({ breadcrumb }: TopbarProps) {
  return (
    <header
      role="banner"
      className="flex items-center justify-between h-14 px-4 border-b border-border bg-surface shrink-0"
    >
      <div className="flex items-center gap-4">
        <OrgSwitcher />
        {breadcrumb && (
          <>
            <span className="text-border">/</span>
            <span className="text-sm text-fg-muted">{breadcrumb}</span>
          </>
        )}
      </div>
      <UserMenu />
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/topbar.tsx
git commit -m "feat(m0): topbar component with breadcrumb slot"
```

---

## Task 8: Dashboard Shell Layout

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/page.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/layout.tsx`**

```typescript
// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(dashboard)/page.tsx` redirect**

```typescript
// app/(dashboard)/page.tsx
import { redirect } from "next/navigation";

export default function DashboardRoot() {
  redirect("/dashboard");
}
```

- [ ] **Step 3: Create `app/page.tsx` root redirect**

```typescript
// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
```

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/layout.tsx" "app/(dashboard)/page.tsx" app/page.tsx
git commit -m "feat(m0): dashboard shell layout with sidebar + topbar"
```

---

## Task 9: KPI Card + Dashboard Page

**Files:**
- Create: `components/dashboard/kpi-card.tsx`
- Create: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create `components/dashboard/kpi-card.tsx`**

```typescript
// components/dashboard/kpi-card.tsx
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  prefix?: string;
};

export function KpiCard({ label, value, delta, deltaLabel, prefix }: KpiCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;

  return (
    <div className="rounded-lg bg-surface border border-border p-4 flex flex-col gap-2">
      <span className="text-xs text-fg-muted uppercase tracking-wide font-medium">{label}</span>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold text-fg font-mono">
          {prefix && <span className="text-base text-fg-muted mr-0.5">{prefix}</span>}
          {value}
        </span>
        {delta !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositive && "text-success",
              isNegative && "text-danger",
              !isPositive && !isNegative && "text-fg-muted"
            )}
          >
            {isPositive && <TrendingUp className="w-3.5 h-3.5" />}
            {isNegative && <TrendingDown className="w-3.5 h-3.5" />}
            {!isPositive && !isNegative && <Minus className="w-3.5 h-3.5" />}
            <span>{deltaLabel ?? `${delta > 0 ? "+" : ""}${delta}%`}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(dashboard)/dashboard/page.tsx`**

```typescript
// app/(dashboard)/dashboard/page.tsx
import { KpiCard } from "@/components/dashboard/kpi-card";

const MOCK_KPIS = [
  { label: "ROAS",        value: "3.24x",    delta: 12,   deltaLabel: "+12% vs mês anterior" },
  { label: "CPA",         value: "R$ 48,20", delta: -8,   deltaLabel: "-8% vs mês anterior", prefix: "" },
  { label: "Spend Total", value: "24.800",   delta: 5,    deltaLabel: "+5% vs mês anterior",  prefix: "R$" },
  { label: "Conversões",  value: "514",      delta: 0,    deltaLabel: "estável" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-fg">Dashboard</h1>
        <p className="text-sm text-fg-muted mt-0.5">Visão geral dos últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_KPIS.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="rounded-lg bg-surface border border-border p-6 text-center text-fg-muted text-sm">
        Gráficos de performance serão adicionados no M5 (Analytics)
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run dev server and verify the shell visually**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected:
- Redirect to `/dashboard`
- Sidebar on left (dark `#13131F`) with nav items
- Topbar with org-switcher and user avatar
- 4 KPI cards in a grid
- No layout overflow

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/kpi-card.tsx "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(m0): KPI card component, dashboard placeholder with mock metrics"
```

---

## Task 10: Auth Pages Placeholders

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Create `app/(auth)/login/page.tsx`**

```typescript
// app/(auth)/login/page.tsx
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-1">
          <div className="w-8 h-8 rounded bg-accent mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-fg">Entrar no AdFlow</h1>
          <p className="text-sm text-fg-muted">Acesse sua conta para continuar</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-fg-muted" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="voce@agencia.com"
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button className="w-full bg-accent hover:bg-accent/90 text-white" size="sm">
            Enviar link mágico
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-base px-2 text-fg-muted">ou continue com</span>
          </div>
        </div>

        <Button variant="outline" className="w-full border-border text-fg hover:bg-surface" size="sm">
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar com Google
        </Button>

        <p className="text-center text-xs text-fg-muted">
          Não tem conta?{" "}
          <a href="/signup" className="text-accent hover:underline">Criar conta</a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(auth)/signup/page.tsx`**

```typescript
// app/(auth)/signup/page.tsx
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-1">
          <div className="w-8 h-8 rounded bg-accent mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-fg">Criar conta</h1>
          <p className="text-sm text-fg-muted">14 dias grátis, sem cartão de crédito</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-fg-muted" htmlFor="name">Nome</label>
            <input
              id="name"
              type="text"
              placeholder="Seu nome"
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-fg-muted" htmlFor="email">E-mail profissional</label>
            <input
              id="email"
              type="email"
              placeholder="voce@agencia.com"
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button className="w-full bg-accent hover:bg-accent/90 text-white" size="sm">
            Criar conta grátis
          </Button>
        </div>

        <p className="text-center text-xs text-fg-muted">
          Já tem conta?{" "}
          <a href="/login" className="text-accent hover:underline">Entrar</a>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/login/page.tsx" "app/(auth)/signup/page.tsx"
git commit -m "feat(m0): login and signup page placeholders"
```

---

## Task 11: `next.config.ts` + Security Headers

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Update `next.config.ts`**

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "oaidalleapiprodscus.blob.core.windows.net" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Commit**

```bash
git add next.config.ts
git commit -m "feat(m0): security headers, image remote patterns"
```

---

## Task 12: Run All Tests + Final Verification

- [ ] **Step 1: Run unit tests**

```bash
npx vitest run
```

Expected: all tests PASS (health endpoint test)

- [ ] **Step 2: Run E2E tests**

```bash
npx playwright test
```

Expected: shell spec PASS (sidebar, topbar, KPI page visible), health spec PASS.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Final commit tagging M0 complete**

```bash
git add -A
git status  # confirm nothing unexpected
git commit -m "feat(m0): M0 complete — design system, app shell, all tests passing"
```

---

## Self-Review

**Spec coverage:**

| M0 Requirement | Task |
|----------------|------|
| Scaffold Next.js 15, TS strict, Tailwind v4 | Task 1 |
| shadcn/ui installed | Task 1 |
| Color tokens in `globals.css` | Task 2 |
| Inter + JetBrains Mono | Task 2 |
| `tailwind.config.ts` mapping tokens as classes | Task 2 |
| `.env.local.example` | Task 1 |
| `next.config.ts` | Task 11 |
| `tsconfig.json` with `@/*` | Task 1 (create-next-app) |
| Vitest config | Task 3 |
| Playwright config | Task 4 |
| Health endpoint + unit test | Task 3 |
| App Shell: sidebar, topbar, org-switcher, user-menu | Tasks 5, 6, 7, 8 |
| Dashboard page with KPI cards | Task 9 |
| Auth page placeholders | Task 10 |
| E2E shell test | Task 4 + 12 |

All requirements covered. No placeholders remaining. Types are consistent across tasks (`KpiCardProps`, `NavItem`, `Org` are all self-contained within their files).
