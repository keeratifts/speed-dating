// Naive Bayes match prediction model
// Trained on Columbia University Speed Dating dataset (2002-2004)
// Fisman, R., Iyengar, S., Kamenica, E., & Simonson, I. (2006). Gender differences in mate selection.
// The Quarterly Journal of Economics, 121(2), 673-697.
//
// Model version: v3 — wave 6-9 excluded from PREF features (scale correction)
//   Waves 6-9 used a 1-10 scale for stated preferences instead of 100-point allocation.
//   Mixing the two scales produced incorrect theta/var for attr1_1...shar1_1 in v2.
//   RATINGS + CONTEXT features are unchanged (wave 6-9 rating data is still valid).
//   PREF features (attr1_1...shar1_1) are retrained on 100pt-allocation waves only.
//
// Changes from v2:
//   RATINGS (attr...shar_o): no change
//   CONTEXT (int_corr, age, age_o): no change
//   PREF theta/var: updated for all 6 preference features
//     Notable shifts — theta: amb1_1 -0.87, shar1_1 -0.84, attr1_1 +0.72
//     Notable shifts — var:   attr1_1 -9.1,  amb1_1 -6.8,  shar1_1 -4.1
//
// Features: 21 (ratings + context + stated preferences)
//
// FEATURES_FINAL order (21 features):
//   attr, sinc, intel, fun, amb, shar,            — how rater rates target
//   attr_o, sinc_o, intel_o, fun_o, amb_o, shar_o, — how target rates rater
//   int_corr,                                      — interest correlation (fixed 0.21)
//   age, age_o,                                    — rater age, target age
//   attr1_1, sinc1_1, intel1_1, fun1_1, amb1_1, shar1_1  — rater's stated preference weights

// Class means — NO MATCH (class 0)
const THETA_0 = [
  5.964166,   // attr
  7.055466,   // sinc
  7.251340,   // intel
  6.198642,   // fun
  6.711593,   // amb
  5.320472,   // shar
  5.951501,   // attr_o
  7.024384,   // sinc_o
  7.235263,   // intel_o
  6.183816,   // fun_o
  6.697660,   // amb_o
  5.300464,   // shar_o
  0.189670,   // int_corr
  26.391033,  // age
  26.391033,  // age_o
  23.119048,  // attr1_1  (v2: 22.397144 — corrected for wave scale)
  17.874762,  // sinc1_1  (v2: 17.462206 — corrected for wave scale)
  20.429789,  // intel1_1 (v2: 20.223442 — corrected for wave scale)
  17.634273,  // fun1_1   (v2: 17.435766 — corrected for wave scale)
   9.828719,  // amb1_1   (v2: 10.693917 — corrected for wave scale)
  11.073825,  // shar1_1  (v2: 11.911801 — corrected for wave scale)
];

// Class means — MATCH (class 1)
const THETA_1 = [
  7.334239,   // attr
  7.819746,   // sinc
  7.947917,   // intel
  7.590580,   // fun
  7.316576,   // amb
  6.699275,   // shar
  7.295290,   // attr_o
  7.786232,   // sinc_o
  7.957428,   // intel_o
  7.588768,   // fun_o
  7.294837,   // amb_o
  6.679801,   // shar_o
  0.212609,   // int_corr
  26.033514,  // age
  26.049819,  // age_o
  23.786540,  // attr1_1  (v2: 23.135272 — corrected for wave scale)
  17.246005,  // sinc1_1  (v2: 16.792219 — corrected for wave scale)
  20.616739,  // intel1_1 (v2: 20.463632 — corrected for wave scale)
  18.207219,  // fun1_1   (v2: 18.010752 — corrected for wave scale)
   9.626694,  // amb1_1   (v2: 10.547998 — corrected for wave scale)
  10.479574,  // shar1_1  (v2: 11.167446 — corrected for wave scale)
];

// Class variances — NO MATCH (class 0)
const VAR_0 = [
  3.661714,    // attr
  2.975800,    // sinc
  2.410033,    // intel
  3.630870,    // fun
  3.036105,    // amb
  3.942046,    // shar
  3.638011,    // attr_o
  3.048128,    // sinc_o
  2.404012,    // intel_o
  3.683879,    // fun_o
  3.008939,    // amb_o
  4.022619,    // shar_o
  0.090435,    // int_corr
  13.049130,   // age
  12.964457,   // age_o
  139.252554,  // attr1_1  (v2: 148.389120 — corrected for wave scale)
   48.096142,  // sinc1_1  (v2:  48.390770 — corrected for wave scale)
   44.966949,  // intel1_1 (v2:  46.055811 — corrected for wave scale)
   35.243671,  // fun1_1   (v2:  35.955333 — corrected for wave scale)
   30.544806,  // amb1_1   (v2:  37.322013 — corrected for wave scale)
   35.582765,  // shar1_1  (v2:  39.718788 — corrected for wave scale)
];

// Class variances — MATCH (class 1)
const VAR_1 = [
  2.391455,    // attr
  2.040878,    // sinc
  1.574507,    // intel
  2.189712,    // fun
  2.390042,    // amb
  3.126503,    // shar
  2.436355,    // attr_o
  2.137274,    // sinc_o
  1.548459,    // intel_o
  2.171921,    // fun_o
  2.414204,    // amb_o
  3.012735,    // shar_o
  0.091660,    // int_corr
  10.550507,   // age
  11.092627,   // age_o
  185.480326,  // attr1_1  (v2: 194.706561 — corrected for wave scale)
   49.180648,  // sinc1_1  (v2:  48.765135 — corrected for wave scale)
   45.818852,  // intel1_1 (v2:  46.775021 — corrected for wave scale)
   41.259444,  // fun1_1   (v2:  42.333391 — corrected for wave scale)
   29.806357,  // amb1_1   (v2:  37.850359 — corrected for wave scale)
   37.006898,  // shar1_1  (v2:  41.517881 — corrected for wave scale)
];

// Class priors: [P(no match), P(match)]
const PRIOR = [0.8352730528200537, 0.1647269471799463];

const THRESHOLD = 0.3;

function gaussianLogProb(x: number, mean: number, variance: number): number {
  const diff = x - mean;
  return -0.5 * Math.log(2 * Math.PI * variance) - (diff * diff) / (2 * variance);
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  // Self-rated attributes (1-10)
  attr: number;
  sinc: number;
  intel: number;
  fun: number;
  amb: number;
  shar: number;
  // Preference weights (sum to 100)
  pref_attr: number;
  pref_sinc: number;
  pref_intel: number;
  pref_fun: number;
  pref_amb: number;
  pref_shar: number;
  createdAt: number;
}

export interface RatingSet {
  [targetId: string]: {
    attr: number;
    sinc: number;
    intel: number;
    fun: number;
    amb: number;
    shar: number;
  };
}

/**
 * Predicts probability of a match (P=1) given rater and target data.
 *
 * @param raterAge        - age of the person doing the rating
 * @param targetAge       - age of the person being rated
 * @param ratingsOfTarget - how the rater rates the target (attr,sinc,intel,fun,amb,shar)
 * @param ratingsOfRater  - how the target rates the rater (attr_o etc.)
 * @param raterPrefs      - rater's importance weights [attr,sinc,intel,fun,amb,shar] sum=100
 */
export function predictMatchProbability(
  raterAge: number,
  targetAge: number,
  ratingsOfTarget: number[],   // [attr, sinc, intel, fun, amb, shar] — rater->target
  ratingsOfRater: number[],    // [attr_o, sinc_o, intel_o, fun_o, amb_o, shar_o] — target->rater
  raterPrefs: number[]         // [attr1_1, sinc1_1, intel1_1, fun1_1, amb1_1, shar1_1]
): number {
  const features = [
    ...ratingsOfTarget,    // attr, sinc, intel, fun, amb, shar
    ...ratingsOfRater,     // attr_o, sinc_o, intel_o, fun_o, amb_o, shar_o
    0.21,                  // int_corr (fixed population mean)
    raterAge,
    targetAge,
    ...raterPrefs,         // attr1_1 ... shar1_1
  ];

  let logP0 = Math.log(PRIOR[0]);
  let logP1 = Math.log(PRIOR[1]);

  for (let i = 0; i < features.length; i++) {
    logP0 += gaussianLogProb(features[i], THETA_0[i], VAR_0[i]);
    logP1 += gaussianLogProb(features[i], THETA_1[i], VAR_1[i]);
  }

  // Normalise with log-sum-exp trick
  const maxLog = Math.max(logP0, logP1);
  const p1 = Math.exp(logP1 - maxLog) / (Math.exp(logP0 - maxLog) + Math.exp(logP1 - maxLog));

  return Math.min(1, Math.max(0, p1));
}

export interface MatchResult {
  userId: string;
  name: string;
  age: number;
  pILikeThem: number;   // P(I like them) — do I match on them?
  pTheyLikeMe: number;  // P(they like me) — do they match on me?
  pMutual: number;      // P(mutual) = pILikeThem * pTheyLikeMe
  hasRatedMe: boolean;
  iHaveRated: boolean;
}

/**
 * Compute all match probabilities for a given user vs everyone else.
 */
export function computeAllMatches(
  me: UserProfile,
  others: UserProfile[],
  myRatings: RatingSet,        // how I rated others
  ratingsOfMe: { [fromId: string]: RatingSet }  // how others rated everyone
): MatchResult[] {
  const myPrefs = [me.pref_attr, me.pref_sinc, me.pref_intel, me.pref_fun, me.pref_amb, me.pref_shar];

  return others.map(other => {
    const iHaveRated = !!myRatings[other.id];
    const theyRatedMe = ratingsOfMe[other.id]?.[me.id];
    const hasRatedMe = !!theyRatedMe;

    // P(I like them)
    let pILikeThem = 0;
    if (iHaveRated) {
      const r = myRatings[other.id];
      const ratingsFromMe = [r.attr, r.sinc, r.intel, r.fun, r.amb, r.shar];
      // For attr_o (how they rate me), use their actual ratings if available, else their self-attrs
      const theirRatingOfMe = theyRatedMe
        ? [theyRatedMe.attr, theyRatedMe.sinc, theyRatedMe.intel, theyRatedMe.fun, theyRatedMe.amb, theyRatedMe.shar]
        : [other.attr, other.sinc, other.intel, other.fun, other.amb, other.shar];
      pILikeThem = predictMatchProbability(me.age, other.age, ratingsFromMe, theirRatingOfMe, myPrefs);
    }

    // P(they like me)
    let pTheyLikeMe = 0;
    if (hasRatedMe) {
      const r = theyRatedMe!;
      const ratingsFromThem = [r.attr, r.sinc, r.intel, r.fun, r.amb, r.shar];
      const myRatingOfThem = iHaveRated
        ? [myRatings[other.id].attr, myRatings[other.id].sinc, myRatings[other.id].intel, myRatings[other.id].fun, myRatings[other.id].amb, myRatings[other.id].shar]
        : [me.attr, me.sinc, me.intel, me.fun, me.amb, me.shar];
      pTheyLikeMe = predictMatchProbability(other.age, me.age, ratingsFromThem, myRatingOfThem, [other.pref_attr, other.pref_sinc, other.pref_intel, other.pref_fun, other.pref_amb, other.pref_shar]);
    }

    return {
      userId: other.id,
      name: other.name,
      age: other.age,
      pILikeThem,
      pTheyLikeMe,
      pMutual: pILikeThem * pTheyLikeMe,
      hasRatedMe,
      iHaveRated,
    };
  });
}
