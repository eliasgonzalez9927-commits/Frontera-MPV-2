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
