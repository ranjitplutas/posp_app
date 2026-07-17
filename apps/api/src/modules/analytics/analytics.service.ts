import { educationDistribution, onboardingFunnel, stateDistribution } from "../../database/analytics.repository.js";

export async function getStateDistribution() {
  return stateDistribution();
}

export async function getEducationDistribution() {
  return educationDistribution();
}

export type FunnelStage = { stage: string; label: string; count: number; percentOfSignedUp: number; dropOffFromPrevious: number };

export async function getOnboardingFunnel(): Promise<FunnelStage[]> {
  const counts = await onboardingFunnel();
  const order: { stage: keyof typeof counts; label: string }[] = [
    { stage: "signedUp", label: "Signed Up" },
    { stage: "profileCompleted", label: "Profile Completed" },
    { stage: "panVerified", label: "PAN Verified" },
    { stage: "aadharVerified", label: "Aadhaar Verified" },
    { stage: "bankVerified", label: "Bank Verified" },
    { stage: "educationVerified", label: "Education Verified" },
  ];

  const base = counts.signedUp || 1; // avoid div-by-zero when the table is empty
  let previous = counts.signedUp;

  return order.map(({ stage, label }) => {
    const count = counts[stage];
    const dropOffFromPrevious = previous > 0 ? Math.round(((previous - count) / previous) * 1000) / 10 : 0;
    previous = count;
    return {
      stage,
      label,
      count,
      percentOfSignedUp: Math.round((count / base) * 1000) / 10,
      dropOffFromPrevious,
    };
  });
}
