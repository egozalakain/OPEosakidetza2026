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
