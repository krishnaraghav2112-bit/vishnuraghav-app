import React from "react";
import Lottie from "lottie-react";
import { successCheck } from "../animations/successCheck";

/**
 * Reusable premium success animation (self-hosted Lottie, ~3 KB).
 * Used after payment, newsletter subscribe, and contact form submit.
 *
 * Props:
 *  - size: "sm" | "md" | "lg" (default "md")
 *  - loop: boolean (default false — plays once)
 *  - testId: optional
 */
export default function SuccessLottie({ size = "md", loop = false, testId = "success-lottie" }) {
  const dim = size === "lg" ? 140 : size === "sm" ? 56 : 88;
  return (
    <div data-testid={testId} style={{ width: dim, height: dim, lineHeight: 0 }} aria-label="Success">
      <Lottie animationData={successCheck} loop={loop} autoplay style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
