# SmartOps Mobile (Ionic)

School portal mobile app for all users (admin, teacher, accountant, etc.). Menus and actions follow **role permissions** from the API (`auth/permissions`, `menus/my`). Login with **mobile number or email** + password (OTP later).

## Setup

1. Install dependencies: `npm install`
2. Configure API in `src/environments/environment.ts`:
   - `apiBaseUrl` — e.g. `https://localhost:7288/api`
   - `tenantSubdomain` — optional local-dev fallback only (leave empty to use school-code screen)
3. Run: `npm start` (or `ionic serve`)
4. First launch: enter **school code** → then sign in with mobile (10 digits) or email + password.

## Screens

| Tab / Route | Feature |
|-------------|---------|
| `/school-code` | Find school by code (`GET schools/by-code/{code}`) — stored on device |
| `/login` | Auth (`POST auth/login`, `GET auth/me`) + Change school |
| `/tabs/home` | Shortcuts |
| `/tabs/attendance` | Mark attendance (Stitch design) |
| `/tabs/homework` | List + stats |
| `/homework/new` | Create homework |
| `/homework/:id` | Student submissions |
| `/homework/:id/edit` | Edit homework |

## API modules used

- `GET /api/schools/by-code/{schoolCode}` (anonymous bootstrap)
- `GET/POST /api/attendance`, `POST /api/attendance/submit`
- `GET/POST/PUT/DELETE /api/homework`, submissions endpoints
- `GET /api/class/dropdown`, `GET /api/subject/dropdown`
- `GET /api/academic-year/current`

Headers: `Authorization`, `X-Tenant-ID` (school subdomain), `X-Academic-Year-Id`

Design tokens from `Document/stitch_smartops_teacher_mobile_app/DESIGN.md`.
