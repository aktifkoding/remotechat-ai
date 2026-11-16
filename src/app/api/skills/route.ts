import { NextRequest, NextResponse } from "next/server";
import { createSkillSchema } from "@/lib/validators/schemas";
import { createCustomSkill, listAllSkills } from "@/modules/skills/engine";

export async function GET() {
  return NextResponse.json({ skills: listAllSkills() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSkillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const skill = createCustomSkill(parsed.data);
    return NextResponse.json({ skill }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create skill" },
      { status: 500 }
    );
  }
}
