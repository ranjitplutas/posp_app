import { apiClient } from "../lib/http/api-client";
import type { BarDatum } from "../components/BarChart";

export const analyticsService = {
  stateDistribution(): Promise<BarDatum[]> {
    return apiClient<BarDatum[]>("/analytics/state-distribution");
  },
  educationDistribution(): Promise<BarDatum[]> {
    return apiClient<BarDatum[]>("/analytics/education-distribution");
  },
};
