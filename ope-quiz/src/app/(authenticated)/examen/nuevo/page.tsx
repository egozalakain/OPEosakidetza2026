import { ExamConfigForm } from "@/components/exam/exam-config-form";

export default async function NewExamPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const defaultMode = params.mode === "weak" ? "weak" : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Nuevo Examen
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configura las opciones de tu examen
        </p>
      </div>

      <ExamConfigForm defaultMode={defaultMode} />
    </div>
  );
}
