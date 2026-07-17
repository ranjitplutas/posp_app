import { educationDistribution, stateDistribution } from "../../database/analytics.repository.js";

export async function getStateDistribution() {
  return stateDistribution();
}

export async function getEducationDistribution() {
  return educationDistribution();
}
