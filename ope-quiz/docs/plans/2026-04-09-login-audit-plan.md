# Login Audit System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add persistent login auditing (successes + failures with full details) and an admin page to view the logs.

**Architecture:** New `audit_logs` table in PostgreSQL via Drizzle ORM. The `authorize()` function in NextAuth logs every attempt. IP is obtained via a `/api/client-info` route handler. A new `/admin/audit` page displays logs with color-coded rows.

**Tech Stack:** Next.js 16, NextAuth v5, Drizzle ORM, PostgreSQL (Neon), Tailwind CSS

**IMPORTANT:** This project uses Next.js 16 which may have breaking changes. Read `node_modules/next/dist/docs/` before writing any code. Heed AGENTS.md.

---

### Task 1: Add `auditLogs` table to database schema

**Files:**
- Modify: `ope-quiz/src/db/schema.ts:84` (append after `userSettings` table)

**Step 1: Add the table definition**

Add to the end of `ope-quiz/src/db/schema.ts`:

```typescript
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  event: text("event").notNull(),
  usernameAttempted: text("username_attempted").notNull(),
  passwordAttempted: text("password_attempted").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
});
```

**Step 2: Generate the migration**

Run: `cd ope-quiz && npx drizzle-kit generate`
Expected: A new migration file created in `src/db/migrations/`

**Step 3: Push the migration to the database**

Run: `cd ope-quiz && npx drizzle-kit push`
Expected: Table `audit_logs` created in PostgreSQL

**Step 4: Commit**

```bash
git add ope-quiz/src/db/schema.ts ope-quiz/src/db/migrations/
git commit -m "feat: add audit_logs table schema and migration"
```

---

### Task 2: Create `/api/client-info` route handler

This endpoint returns the client's IP address from request headers so the login page can include it.

**Files:**
- Create: `ope-quiz/src/app/api/client-info/route.ts`

**Step 1: Create the route handler**

Create `ope-quiz/src/app/api/client-info/route.ts`:

```typescript
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return Response.json({ ip });
}
```

**Step 2: Test manually**

Run: `cd ope-quiz && npm run dev`
Then visit: `http://localhost:3000/api/client-info`
Expected: JSON response like `{"ip":"::1"}` or `{"ip":"127.0.0.1"}`

**Step 3: Commit**

```bash
git add ope-quiz/src/app/api/client-info/route.ts
git commit -m "feat: add /api/client-info endpoint for IP detection"
```

---

### Task 3: Update login page to capture and send IP + User-Agent

**Files:**
- Modify: `ope-quiz/src/app/login/page.tsx`

**Step 1: Add IP fetch on mount and send extra fields**

In the `LoginPage` component, add a state for `clientIp` and fetch it on mount:

```typescript
const [clientIp, setClientIp] = useState("unknown");

// Add useEffect import at top, then:
useEffect(() => {
  fetch("/api/client-info")
    .then((r) => r.json())
    .then((d) => setClientIp(d.ip))
    .catch(() => setClientIp("unknown"));
}, []);
```

**Step 2: Include IP and User-Agent in the credentials POST body**

In `handleSubmit`, add these to the `URLSearchParams`:

```typescript
body: new URLSearchParams({
  username,
  password,
  csrfToken,
  json: "true",
  clientIp,
  clientUserAgent: navigator.userAgent,
}),
```

**Step 3: Commit**

```bash
git add ope-quiz/src/app/login/page.tsx
git commit -m "feat: send IP and user-agent with login credentials"
```

---

### Task 4: Update `authorize()` to log audit records

**Files:**
- Modify: `ope-quiz/src/lib/auth.ts`

**Step 1: Add imports and audit logging**

Replace the entire content of `ope-quiz/src/lib/auth.ts` with:

```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contrasena", type: "password" },
        clientIp: {},
        clientUserAgent: {},
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        const clientIp = (credentials?.clientIp as string) || "unknown";
        const clientUserAgent = (credentials?.clientUserAgent as string) || "unknown";
        const envUser = process.env.AUTH_USER;
        const envPass = process.env.AUTH_PASSWORD;

        const success = username === envUser && password === envPass;

        // Log the attempt to the database
        try {
          await db.insert(auditLogs).values({
            event: success ? "login_success" : "login_failure",
            usernameAttempted: username || "",
            passwordAttempted: success ? "***" : (password || ""),
            ipAddress: clientIp,
            userAgent: clientUserAgent,
            success,
          });
        } catch (e) {
          console.error("[AUDIT] Failed to write audit log:", e);
        }

        if (success) {
          return { id: "1", name: "admin" };
        }
        return null;
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
});
```

Note: The old `console.log` with credential lengths is removed (cleanup item from design).

**Step 2: Test manually**

1. Try logging in with wrong credentials → check DB has a `login_failure` row with the attempted values
2. Try logging in with correct credentials → check DB has a `login_success` row with `***` as password

**Step 3: Commit**

```bash
git add ope-quiz/src/lib/auth.ts
git commit -m "feat: log login attempts to audit_logs table"
```

---

### Task 5: Create audit page at `/admin/audit`

**Files:**
- Create: `ope-quiz/src/app/(authenticated)/admin/audit/page.tsx`

**Step 1: Create the audit page**

Create `ope-quiz/src/app/(authenticated)/admin/audit/page.tsx`:

```tsx
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export default async function AuditPage() {
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(100);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Registro de Accesos
      </h1>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Fecha</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Evento</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Password</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">IP</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Navegador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <tr
                key={log.id}
                className={
                  log.success
                    ? "bg-green-50 dark:bg-green-900/20"
                    : "bg-red-50 dark:bg-red-900/20"
                }
              >
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {formatDate(log.timestamp)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.success
                        ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                        : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                    }`}
                  >
                    {log.success ? "OK" : "FALLO"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-mono">
                  {log.usernameAttempted}
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-mono">
                  {log.passwordAttempted}
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-mono whitespace-nowrap">
                  {log.ipAddress}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                  {log.userAgent}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay registros de acceso
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Mostrando los ultimos {logs.length} registros
      </p>
    </div>
  );
}
```

**Step 2: Test manually**

Visit `http://localhost:3000/admin/audit` while logged in.
Expected: Table showing the login attempts from Task 4 testing, with green/red rows.

**Step 3: Commit**

```bash
git add ope-quiz/src/app/\(authenticated\)/admin/audit/page.tsx
git commit -m "feat: add /admin/audit page to view login logs"
```

---

### Task 6: Add link to audit page in navbar

**Files:**
- Modify: `ope-quiz/src/components/layout/navbar.tsx:11-15`

**Step 1: Add the audit link to navLinks array**

In `navbar.tsx`, add to the `navLinks` array:

```typescript
const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/examen/nuevo", label: "Nuevo Examen" },
  { href: "/estadisticas", label: "Estadisticas" },
  { href: "/historial", label: "Historial" },
  { href: "/admin/audit", label: "Accesos" },
];
```

**Step 2: Commit**

```bash
git add ope-quiz/src/components/layout/navbar.tsx
git commit -m "feat: add audit page link to navbar"
```

---

### Task 7: Cleanup — remove debug endpoint and old console.log

**Files:**
- Delete: `ope-quiz/src/app/api/debug/route.ts` (and the `debug/` directory)

Note: The `console.log` in `auth.ts` was already removed in Task 4.

**Step 1: Delete the debug endpoint**

```bash
rm -rf ope-quiz/src/app/api/debug
```

**Step 2: Verify nothing references it**

Search the codebase for `/api/debug` to confirm no other files reference it.

**Step 3: Commit**

```bash
git add -A ope-quiz/src/app/api/debug
git commit -m "fix: remove /api/debug endpoint that exposed env vars"
```

---

### Task 8: Final integration test

**Step 1: Start dev server**

Run: `cd ope-quiz && npm run dev`

**Step 2: Test failed login**

1. Go to `/login`
2. Enter wrong username and password
3. Verify error message shown
4. Go to `/admin/audit` (log in first with correct credentials)
5. Verify the failed attempt shows in red with the attempted username and password

**Step 3: Test successful login**

1. Log out, then log in with correct credentials
2. Go to `/admin/audit`
3. Verify the successful login shows in green with `***` as password
4. Verify IP and User-Agent are populated

**Step 4: Verify debug endpoint removed**

Visit `/api/debug` — should return 404.

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "feat: login audit system complete"
```
