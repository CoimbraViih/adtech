-- Migration 030: Add 'payment_failed' to invoices.status check constraint
-- This status is set by the invoice.payment_failed Stripe webhook handler (M22).

-- Drop old constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add new constraint with payment_failed
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('pending', 'open', 'paid', 'uncollectible', 'void', 'payment_failed'));
