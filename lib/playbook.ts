// Evee's conversion playbook: how she thinks about every TikTok Shop video.
// Shared by the app (shown on the Frameworks tab) and the server (taught to Evee in every prompt).

export const SPINE = [
  { id: "hook", name: "Hook", goal: "Stop the scroll in the first 1–3 seconds.",
    how: ["Verbal, text and visual hooks working together (the Hook Trifecta).", "A pattern interrupt: something unexpected to see or hear.", "Call out the viewer or their exact situation so they feel “this is about me.”", "Open a loop (a question, a secret, a result) that only the rest of the video closes."] },
  { id: "pain", name: "Pain point", goal: "Make the viewer feel understood before you sell anything.",
    how: ["Name the specific frustration in their words, not marketing words.", "Show it on camera, don’t just say it.", "A little vulnerability or honesty builds trust fast.", "Agitate gently: why it matters, what it costs them, without shaming anyone."] },
  { id: "solution", name: "Solution + proof", goal: "Make the product feel like the obvious fix, and prove it.",
    how: ["Reveal the product as the answer to the pain you just named.", "Show and tell at the same time: demonstrate while you explain.", "Put proof right where doubt peaks: a close-up, a test, a before/after, a detail.", "Answer the #1 objection (price, fit, quality, hassle) before they think it.", "Make it personal: how it fits a real day."] },
  { id: "cta", name: "CTA", goal: "Turn interest into a click.",
    how: ["Tell them exactly what to do: tap the orange cart.", "Give one honest reason to act now (a real sale, a size note, the season).", "Remove the last hesitation: size and fit, price framing, who it’s for.", "Sound like a friend’s recommendation, not an ad."] },
];

export const PRINCIPLES = [
  "Identity: viewers buy what people like them use. Speak to one specific person.",
  "Curiosity: hold back the product name or result until the viewer is asking for it.",
  "Commitment loop: a direct line like “don’t you scroll” makes leaving feel like breaking a promise.",
  "Show, don’t tell: physical demonstration (pulling, pointing, pouring, before/after) beats claims.",
  "Proof timing: insert proof at the exact moment the viewer would doubt.",
  "Loss aversion: “I spent money on things that didn’t do half of this” lands harder than a discount.",
  "Price framing: show the value first, then the price, so it feels like a steal.",
  "Permission: frame the purchase as permission to choose comfort or ease, and guilt disappears.",
  "Specificity sells: exact sizes, times, results you’ve seen, and named situations beat vague praise.",
  "Pacing: a visual change every 1–3 seconds holds attention, and so does a second person reacting in frame.",
];

export const PITFALLS = [
  "Starting with “Hey guys” or the product name: no reason to stay.",
  "Talking about features before the viewer feels the pain.",
  "Claims with no proof on screen.",
  "A weak or missing CTA, or three CTAs at once.",
  "Fake scarcity, fake prices, health claims or invented stories. These get videos removed and lose trust.",
];

export function playbookText() {
  return `EVEE'S CONVERSION PLAYBOOK (how a TikTok Shop video converts)
Every script follows the spine: HOOK → PAIN POINT → SOLUTION + PROOF → CTA.
${SPINE.map((p) => `- ${p.name.toUpperCase()}: ${p.goal} ${p.how.join(" ")}`).join("\n")}
Persuasion principles to use deliberately:
${PRINCIPLES.map((p) => `- ${p}`).join("\n")}
Avoid:
${PITFALLS.map((p) => `- ${p}`).join("\n")}`;
}
