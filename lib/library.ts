// Evee Studio's built-in viral framework library, shared by the app and the server.
// To add a framework, add an entry here. Nothing else needs to change.

export type Framework = {
  id: string;
  name: string;
  oneLiner: string;   // what it is, in one line
  bestFor: string;    // which products/audiences it suits
  steps: string[];    // the beats, in order
  coach: string;      // Evee's tip for pulling it off
  caution?: string;   // honesty guardrail
};

export const FRAMEWORKS: Framework[] = [
  { id: "problem-solution", name: "Relatable Problem → Fix", oneLiner: "Show a frustration everyone knows, then fix it on camera.",
    bestFor: "Products that solve an everyday annoyance", steps: ["Hook: the frustration, shown not told", "“Same?” moment that makes them feel seen", "Product enters as the fix", "Fix it on camera", "Show the payoff", "CTA"],
    coach: "Make the problem specific and visual in the first second. “Crumbs in the car seat” beats “messy car.”" },
  { id: "nobody-told-me", name: "Cultural Insider: Ungate the Secret", oneLiner: "Share insider wisdom from your own community like a secret being passed down.",
    bestFor: "Personal care, fashion, shapewear and hair, especially awkward or personal topics", steps: ["Identity or insider hook (“In case nobody told you…”)", "The relatable struggle, shown on camera", "“This has been passed down…” as you reveal the product", "Demonstrate what it actually does", "Confidence payoff (“That’s the secret.”)", "CTA"],
    coach: "It turns an awkward topic into wisdom being handed down, so the reveal feels like a gift, not a pitch. Speak from your own community and experience only.",
    caution: "Only use a cultural or identity angle that’s genuinely yours. Never imply everyone in a group shares one experience." },
  { id: "authority-transformation", name: "Before/After with Authority", oneLiner: "Dramatic visual transformation, credible because you explain why it works.",
    bestFor: "Beauty tools, hair tools and anything where expertise builds trust", steps: ["Problem visual + a 2-second flash of the finished result", "Your credibility (job, years of experience, or real use) in one line", "Show the product working, explaining the why", "Second angle of the result", "Final reveal", "CTA"],
    coach: "Flash the finished result in the first 2 seconds, then cut back to the “before.” Viewers stay to see how you got there.",
    caution: "Only claim expertise you actually have. Show the result, don’t promise one." },
  { id: "result-first", name: "Result First, Product Hidden", oneLiner: "Lead with the before/after result and keep the product name back until it’s earned.",
    bestFor: "Products people don’t understand yet: wellness, gadgets, anything new", steps: ["Split-screen before/after, no product visible", "Name the problem the viewer feels", "Reveal the product (label turned away at first)", "Show how you use it, in seconds", "What changed for you", "CTA"],
    coach: "Curiosity does the work. Don’t say the product name until the viewer is already asking “what is that?”",
    caution: "No medical or health claims. Describe your own experience in your own words, and only if it’s real." },
  { id: "two-person-ambush", name: "Friend Ambush", oneLiner: "A friend or sister pops into frame and calls you out, then you deliver the proof.",
    bestFor: "Products that need explaining, made casual and fun by a second person", steps: ["Friend pops in: “She has something to tell you, so listen”", "You: “Don’t scroll.” Hold a beat", "The problem, with the friend reacting in the background", "Product to camera, label forward", "The one detail that makes it different", "Both point at the cart for the CTA"],
    coach: "The comedic second person makes it impossible to scroll past. Keep the friend’s reactions small and quick in the background.",
    caution: "Scripted, but every claim still has to be true." },
  { id: "demo-first", name: "Demo First", oneLiner: "Open on the most satisfying moment of the product working.",
    bestFor: "Gadgets, cleaning, kitchen and anything visually satisfying", steps: ["Open mid-action on the best visual", "Say what they’re looking at", "One key feature", "Show it again from a new angle", "CTA"],
    coach: "Your first frame should be the best frame. Cut everything before the product is doing its thing." },
  { id: "price-shock", name: "Price Shock", oneLiner: "Show what it does, then reveal the price as the punchline.",
    bestFor: "Products that look more expensive than they are", steps: ["Hook: show the result or quality", "Build value: 2–3 things it does", "“Guess how much”", "Price reveal", "CTA with urgency only if it’s real"],
    coach: "Let the price land. Pause a beat before you say it and put it big on screen." },
  { id: "three-reasons", name: "3 Reasons Why", oneLiner: "A quick numbered list of reasons to buy.",
    bestFor: "Products with several real benefits", steps: ["Hook: “3 reasons this lives in my cart”", "Reason 1 with a visual", "Reason 2 with a visual", "Reason 3, the strongest", "CTA"],
    coach: "Save your strongest reason for #3 so people stay to the end." },
  { id: "objection-proof", name: "“Does It Actually Work?”", oneLiner: "Say the doubt out loud, then prove it.",
    bestFor: "Products people are skeptical of", steps: ["Hook: the doubt everyone has", "Why it matters", "Test it on camera", "Honest verdict", "CTA"],
    coach: "Make the test real and show the result clearly. A skeptical tone at the start makes the payoff hit harder." },
  { id: "before-after", name: "Before & After", oneLiner: "The transformation is the whole story.",
    bestFor: "Cleaning, organizing, beauty, fashion and home", steps: ["Hook: the “before” up close", "Product in hand", "The process, sped up", "The “after” reveal", "CTA"],
    coach: "Shoot before and after from the exact same angle and light so the change is obvious.", caution: "Only real, unedited results." },
  { id: "storytime", name: "Storytime", oneLiner: "A short personal story where the product is the turning point.",
    bestFor: "Products tied to a real moment in your life", steps: ["Hook: the most dramatic line of the story", "Quick setup", "The moment it went wrong", "How the product saved it", "CTA"],
    coach: "Start with the most dramatic line, not the beginning. Use your real story, never a made-up one." },
  { id: "dupe", name: "Dupe / Comparison", oneLiner: "Put it next to a pricier or more famous option.",
    bestFor: "Affordable alternatives to popular products", steps: ["Hook: “$X vs $Y. Can you tell?”", "Side by side", "Where it matches", "Honest difference", "Price reveal and CTA"],
    coach: "Be honest about the one way it’s different. It makes everything else you say more believable.", caution: "Don’t use brand names in a misleading way or claim it’s identical if it isn’t." },
  { id: "routine", name: "In My Routine", oneLiner: "Show it naturally inside a real day or routine.",
    bestFor: "Daily-use products: beauty, kitchen, mom life and wellness", steps: ["Hook: a POV or time stamp (“7:02am”)", "Routine moments", "Product used naturally", "Why it stays in the routine", "CTA"],
    coach: "Keep it moving with quick cuts. The product should feel like it belongs, not like an ad break." },
  { id: "haul-reveal", name: "Haul Reveal", oneLiner: "Unbox with genuine first reactions.",
    bestFor: "New arrivals, gifts and anything with good packaging", steps: ["Hook: “I finally got the one everyone’s talking about”", "Unbox", "First touch and reaction", "First use", "Verdict and CTA"],
    coach: "Film your real first reaction. You only get one, so keep the camera rolling." },
  { id: "pov", name: "POV", oneLiner: "Put the viewer inside a moment they recognize.",
    bestFor: "Products tied to a relatable situation", steps: ["On-screen “POV: …” hook", "Act out the moment", "Product enters", "The relief or payoff", "Text CTA"],
    coach: "The POV line does the work. Make it painfully specific to your audience." },
  { id: "silent-story", name: "Silent Visual Story", oneLiner: "No talking. Visuals, text and a trending sound carry it.",
    bestFor: "Creators who don’t want to talk on camera", steps: ["Strong first frame + text hook", "Problem or desired result", "Product appears", "It works", "Payoff + text CTA"],
    coach: "Keep text to 6 words or fewer per screen and change shots every 1–2 seconds." },
  { id: "mistake", name: "Stop Doing This", oneLiner: "Call out a common mistake, then show the better way.",
    bestFor: "Products that replace a worse habit or tool", steps: ["Hook: “Stop doing this”", "Show the mistake", "Why it’s a problem", "The better way, with the product", "CTA"],
    coach: "Point at the camera on the hook. Confidence is what stops the scroll here." },
  { id: "gift", name: "Gift Idea", oneLiner: "Frame it as the perfect gift for a specific person.",
    bestFor: "Seasonal pushes and giftable products", steps: ["Hook: “If you need a gift for [person]…”", "Why they’d love it", "Show it", "Price", "CTA with the deadline if it’s real"],
    coach: "Name a specific person (“your mother-in-law”), not just “someone.” Specific gets shared." },
];
export const FW: Record<string, Framework> = Object.fromEntries(FRAMEWORKS.map((f) => [f.id, f]));

export const STYLES: Record<string, string> = {
  any: "Evee picks",
  talking: "Talking to camera",
  voiceover: "Voiceover + clips",
  silent: "No talking (music + text)",
};
export const LENGTHS: Record<string, string> = { short: "7–15 sec", medium: "15–30 sec", long: "30–60 sec" };

export const TWO_PERSON = new Set(["two-person-ambush"]);

export const DEFAULT_VOICE = "Authentic and conversational, like a helpful friend. Confident but never pushy. Comfortable with humor and real reactions. Never sounds like a commercial.";
