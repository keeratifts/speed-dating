// Naive Bayes match prediction model
// Trained on Columbia University Speed Dating dataset (2002-2004)
// Fisman, R., Iyengar, S., Kamenica, E., & Simonson, I. (2006). Gender differences in mate selection.
// The Quarterly Journal of Economics, 121(2), 673-697.

// Feature order: attr, sinc, intel, fun, amb, shar,
//                attr_o, sinc_o, intel_o, fun_o, amb_o, shar_o,
//                int_corr (fixed 0.21), age, age_o,
//                attr1_1, sinc1_1, intel1_1, fun1_1, amb1_1, shar1_1

const THETA_0 = [5.964,7.055,7.251,6.199,6.712,5.32,5.952,7.024,7.235,6.184,6.698,5.3,0.19,26.391,26.391,22.397,17.462,20.223,17.436,10.694,11.917];
const THETA_1 = [7.334,7.82,7.948,7.591,7.317,6.699,7.295,7.786,7.957,7.589,7.295,6.68,0.213,26.034,26.05,23.135,16.792,20.464,18.011,10.548,11.174];
const VAR_0   = [3.662,2.976,2.41,3.631,3.036,3.942,3.638,3.048,2.404,3.684,3.009,4.023,0.09,13.049,12.964,148.389,48.391,46.056,35.955,37.322,39.703];
const VAR_1   = [2.391,2.041,1.575,2.19,2.39,3.127,2.436,2.137,1.548,2.172,2.414,3.013,0.092,10.551,11.093,194.707,48.765,46.775,42.333,37.85,41.509];
const PRIOR   = [0.8353, 0.1647];
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
 * @param raterAge       - age of the person doing the rating
 * @param targetAge      - age of the person being rated
 * @param ratingsOfTarget - how the rater rates the target (attr,sinc,intel,fun,amb,shar)
 * @param ratingsOfRater  - how the target rates the rater (attr_o etc.)
 * @param raterPrefs     - rater's importance weights [attr,sinc,intel,fun,amb,shar] sum=100
 */
export function predictMatchProbability(
  raterAge: number,
  targetAge: number,
  ratingsOfTarget: number[],   // [attr, sinc, intel, fun, amb, shar] — rater→target
  ratingsOfRater: number[],    // [attr_o, sinc_o, intel_o, fun_o, amb_o, shar_o] — target→rater
  raterPrefs: number[]         // [attr1_1, sinc1_1, intel1_1, fun1_1, amb1_1, shar1_1]
): number {
  const features = [
    ...ratingsOfTarget,    // attr, sinc, intel, fun, amb, shar
    ...ratingsOfRater,     // attr_o, sinc_o, intel_o, fun_o, amb_o, shar_o
    0.21,                  // int_corr (fixed population mean)
    raterAge,
    targetAge,
    ...raterPrefs,         // attr1_1 … shar1_1
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
      const otherPrefs = [other.pref_attr, other.pref_sinc, other.pref_intel, other.pref_fun, other.pref_amb, other.pref_shar];
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
      const otherPrefs = [other.pref_attr, other.pref_sinc, other.pref_intel, other.pref_fun, other.pref_amb, other.pref_shar];
      pTheyLikeMe = predictMatchProbability(other.age, me.age, ratingsFromThem, myRatingOfThem, otherPrefs);
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
