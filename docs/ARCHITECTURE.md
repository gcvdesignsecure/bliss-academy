# BLISS ACADEMY — Architecture (Phase 1)

## Stack
- Frontend: Vite + React + TypeScript, React Router, PWA plugin
- Backend: Supabase (Postgres, Auth, RLS, Storage, Edge Functions)
- Hosting: Netlify (frontend), Supabase (backend)
- Payments: Paystack via a provider interface (server-side only)
- KYC: provider interface (NIN/BVN/international), no raw ID stored

## Folder layout
src/
  app/          routing, layouts
  features/     admission, auth, student, teacher, admin,
                courses, quiz, attendance, grading,
                payments, certificates
  lib/          supabase client, utils
  styles/       design tokens
supabase/
  migrations/   SQL schema + RLS
  functions/    edge functions (quiz, payments, kyc, grading)
docs/

## Roles (RBAC)
public, applicant, student, teacher, superadmin
Superadmins: 100 BLISS, 101 VIX, 102 MKS

## Rules enforced server-side only
- Quiz timing, scoring, question selection
- Attendance (only from verified passing quiz)
- Payment verification and course unlock
- Final score calculation

## Credentials needed later
Supabase URL/keys, Paystack keys, KYC provider keys,
email provider. None are hardcoded; use env vars.