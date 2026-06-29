// tests/e2e/assistant.spec.ts
import { test, expect } from '@playwright/test'

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    // Assumes test user is already logged in via storageState
    await page.goto('/dashboard')
  })

  test('floating trigger button is visible on dashboard', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Abrir assistente IA' })
    await expect(trigger).toBeVisible()
  })

  test('clicking trigger opens the panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir assistente IA' }).click()
    await expect(page.getByText('Assistente AdFlow')).toBeVisible()
  })

  test('panel shows suggestion prompts when empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir assistente IA' }).click()
    await expect(page.getByText('Como estão minhas campanhas?')).toBeVisible()
  })

  test('closing panel hides the sheet', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir assistente IA' }).click()
    await expect(page.getByText('Assistente AdFlow')).toBeVisible()
    // Close via the sheet's X button
    await page.keyboard.press('Escape')
    await expect(page.getByText('Assistente AdFlow')).not.toBeVisible()
  })
})

test.describe('Onboarding Checklist', () => {
  test('checklist is visible on dashboard for new users', async ({ page }) => {
    await page.goto('/dashboard')
    // Mock: intercept GET /api/assistant/onboarding to return empty steps
    await page.route('**/api/assistant/onboarding', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ json: { steps: [] } })
      } else {
        route.continue()
      }
    })
    await page.reload()
    await expect(page.getByText('Primeiros passos')).toBeVisible()
  })
})
