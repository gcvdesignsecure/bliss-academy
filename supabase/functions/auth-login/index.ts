import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const GENERIC = "Invalid login details";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);

  let body: { kind?: string; id?: string; name?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const { kind, id, name, password } = body;
  if ((kind !== "student" && kind !== "admin") ||
      typeof id !== "string" || typeof password !== "string" ||
      id.length > 40 || password.length > 200) return json({ error: "Invalid request" }, 400);

  const identifier = `${kind}:${id.trim().toUpperCase()}`;
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await service.from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier).eq("succeeded", false).gte("created_at", since);
  if ((count ?? 0) >= 5) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);

  const record = async (ok: boolean) => {
    await service.from("login_attempts").insert({ identifier, succeeded: ok });
  };

  let email: string | null = null;
  let status = "";
  if (kind === "student") {
    const { data } = await service.from("students").select("profiles(email,status)")
      .eq("mat_number", id.trim().toUpperCase()).maybeSingle();
    // deno-lint-ignore no-explicit-any
    const p = (data as any)?.profiles;
    email = p?.email ?? null; status = p?.status ?? "";
  } else {
    const num = parseInt(id.trim(), 10);
    if (Number.isNaN(num)) { await record(false); return json({ error: GENERIC }, 401); }
    const { data } = await service.from("admins")
      .select("registered_name,profiles(email,status)").eq("admin_number", num).maybeSingle();
    // deno-lint-ignore no-explicit-any
    const row = data as any;
    const nameOk = typeof name === "string" &&
      row?.registered_name?.trim().toLowerCase() === name.trim().toLowerCase();
    if (nameOk) { email = row.profiles?.email ?? null; status = row.profiles?.status ?? ""; }
  }

  if (!email) { await record(false); return json({ error: GENERIC }, 401); }
  const { data: auth, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !auth.session) { await record(false); return json({ error: GENERIC }, 401); }
  if (status !== "active") {
    await record(false);
    return json({ error: "This account is not active. Contact the academy." }, 403);
  }
  await record(true);
  return json({ access_token: auth.session.access_token, refresh_token: auth.session.refresh_token });
});