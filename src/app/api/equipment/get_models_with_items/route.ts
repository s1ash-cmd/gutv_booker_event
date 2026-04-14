import { type NextRequest, NextResponse } from "next/server";
import { EquipmentService } from "@/services/equipmentService";

const equipmentService = new EquipmentService();

export async function GET(request: NextRequest) {
  try {
    const modelsWithItems = await equipmentService.getModelsWithItems();
    return NextResponse.json(modelsWithItems);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
