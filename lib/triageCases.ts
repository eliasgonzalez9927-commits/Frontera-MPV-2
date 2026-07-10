import type { Priority, TriageResult, TriageSource } from "@/lib/triage";

export type CaseStatus = "waiting" | "in_review" | "attended";

export type TriageCase = TriageResult & {
  status: CaseStatus;
  chiefComplaint: string;
  evolution?: string;
  intensity?: number;
  symptoms: string[];
};

export type TriageCaseRow = {
  id: string;
  case_code: string;
  source: TriageSource;
  source_label: string;
  patient_label: string;
  chief_complaint: string;
  evolution: string | null;
  intensity: number | null;
  symptoms: string[];
  red_signals: string[];
  priority: Priority;
  priority_label: string;
  recommendation: string;
  handover: TriageResult["handover"];
  status: CaseStatus;
  created_at: string;
};

export const allowedStatuses: CaseStatus[] = ["waiting", "in_review", "attended"];

export const statusLabels: Record<CaseStatus, string> = {
  waiting: "En espera",
  in_review: "En revisión",
  attended: "Atendido",
};

export function mapRowToTriageCase(row: TriageCaseRow): TriageCase {
  return {
    id: row.case_code,
    caseCode: row.case_code,
    patientLabel: row.patient_label,
    source: row.source,
    sourceLabel: row.source_label,
    priority: row.priority,
    title: row.priority_label,
    recommendation: row.recommendation,
    redSignals: row.red_signals,
    handover: row.handover,
    createdAt: row.created_at,
    status: row.status,
    chiefComplaint: row.chief_complaint,
    evolution: row.evolution ?? undefined,
    intensity: row.intensity ?? undefined,
    symptoms: row.symptoms,
  };
}

export function prioritySortValue(priority: Priority) {
  const rank: Record<Priority, number> = {
    ROJO: 1,
    NARANJA: 2,
    AMARILLO: 3,
    VERDE: 4,
    AZUL: 5,
  };

  return rank[priority];
}

export function statusSortValue(status: CaseStatus) {
  const rank: Record<CaseStatus, number> = {
    waiting: 1,
    in_review: 2,
    attended: 3,
  };

  return rank[status];
}

export function sortTriageCases(cases: TriageCase[]) {
  return [...cases].sort((a, b) => {
    const byStatus = statusSortValue(a.status) - statusSortValue(b.status);
    if (byStatus !== 0) {
      return byStatus;
    }

    const byPriority = prioritySortValue(a.priority) - prioritySortValue(b.priority);
    if (byPriority !== 0) {
      return byPriority;
    }

    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export function formatCaseDate(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} · ${hours}:${minutes} hs`;
}

export function formatCaseTime(value: string) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes} hs`;
}
