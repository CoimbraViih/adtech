import type { Skill } from "../types";
import { lowCtr } from "./low-ctr";
import { highCpa } from "./high-cpa";
import { creativeFatigue } from "./creative-fatigue";
import { spendNoConversion } from "./spend-no-conversion";
import { clickNoConvert } from "./click-no-convert";
import { learningPhase } from "./learning-phase";
import { trackingDivergence } from "./tracking-divergence";

export const SKILLS: Skill[] = [
  spendNoConversion,
  highCpa,
  creativeFatigue,
  lowCtr,
  clickNoConvert,
  learningPhase,
  trackingDivergence,
];
