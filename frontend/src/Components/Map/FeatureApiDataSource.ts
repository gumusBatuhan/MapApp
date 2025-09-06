import { getFeatures } from "../../api/featureApi";
import type { FeatureDto } from "../../api/featureApi";
import type { IFeatureDataSource } from "./types";

export class FeatureApiDataSource implements IFeatureDataSource {
  private provider: "ef" | "ado";

  constructor(provider: "ef" | "ado" = "ef") {
    this.provider = provider;
  }

  async fetchAll(): Promise<FeatureDto[]> {
    const resp = await getFeatures(this.provider).catch(() => null);
    return resp?.data ?? [];
  }
}
