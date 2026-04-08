import { getDashboardKPIs } from "@/actions/stats";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default async function DashboardPage() {
  const kpis = await getDashboardKPIs();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Panel de Control
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Bienvenido a tu preparacion OPE Osakidetza
        </p>
      </div>

      <KPICards kpis={kpis} />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Acciones rapidas
        </h2>
        <QuickActions />
      </div>
    </div>
  );
}
