/**
 * Route API pour sauvegarder le profil (appelée au beforeunload / sendBeacon
 * pour enregistrer les changements même si l'utilisateur quitte sans blur).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import type { ProfileUpdate } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProfileUpdate;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const { error } = await supabase
      .from("profiles")
      .update(body)
      .eq("id", user.id);
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
