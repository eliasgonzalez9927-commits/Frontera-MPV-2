import { NextResponse } from "next/server";
import { getActiveClinicBySlug } from "@/lib/clinics";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no esta configurado para leer clinicas." },
      { status: 503 }
    );
  }

  const { slug } = await context.params;

  try {
    const result = await getActiveClinicBySlug(slug);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json({
      clinic: {
        name: result.clinic.name,
        slug: result.clinic.slug,
        is_active: result.clinic.isActive,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo cargar la clinica." },
      { status: 500 }
    );
  }
}
