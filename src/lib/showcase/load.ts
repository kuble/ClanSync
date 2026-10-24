import { createClient } from "@/lib/supabase/server";
import { defaultShowcase, type ShowcaseResult, type ShowcaseProduct, type ShowcaseDocument } from "./domain";

export async function loadShowcase(userId: string, owner = true): Promise<ShowcaseResult> {
  try {
    const client = await createClient();
    const [library, catalog, inventory] = await Promise.all([
      client.from("user_showcase_libraries").select("revision,document").eq("user_id", userId).maybeSingle(),
      client.from("showcase_catalog").select("id,name,kind,sprite,image_path,width,starter,available").order("sprite"),
      owner ? client.from("user_showcase_inventory").select("catalog_id,quantity").eq("user_id", userId) : Promise.resolve({ data: [], error: null }),
    ]);
    if (library.error || catalog.error || inventory.error) return { ok: false, error: "진열장을 불러오지 못했습니다. 다시 시도해 주세요." };
    const products = (catalog.data ?? []) as ShowcaseProduct[];
    return { ok: true, state: { revision: library.data?.revision ?? -1,
      document: library.data?.document as ShowcaseDocument ?? defaultShowcase(), catalog: products,
      owned: owner ? Object.fromEntries(products.map(p => [p.id, (p.starter ? 1 : 0) + (inventory.data ?? []).filter(i => i.catalog_id === p.id).reduce((sum, i) => sum + i.quantity, 0)])) : {} } };
  } catch { return { ok: false, error: "진열장을 불러오지 못했습니다. 다시 시도해 주세요." }; }
}
