/**
 * Supprime le compte utilisateur : ligne profile (toutes les données) et optionnellement
 * l'utilisateur Auth si SUPABASE_SERVICE_ROLE_KEY est configuré.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { error: deleteProfileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (deleteProfileError) {
      return NextResponse.json(
        { error: deleteProfileError.message },
        { status: 400 },
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceRoleKey && supabaseUrl) {
      const admin = createServiceClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await admin.auth.admin.deleteUser(user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
