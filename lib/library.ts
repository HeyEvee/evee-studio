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
  why?: string[];     // why it works: the psychology behind each beat
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
  { id: "two-person-ambush", name: "Sister Ambush Social Proof Reveal", oneLiner: "A sister or friend pops into frame and calls you out, then you deliver the proof.",
    bestFor: "Products that need explaining (supplements, skincare, anything technical), made casual by a second person", steps: ["Sister pops in: “This is my sister and she has something to say, so listen”", "You: “Don’t you scroll.” Hold a beat", "The problem, with your sister miming it in the background", "Proof inserts (before photo, ingredient or feature graphic) right when doubt peaks", "Product to camera, label forward, and the one detail that makes it different", "Both point at the cart for the CTA"],
    coach: "The comedic second person makes it impossible to scroll past. Keep her reactions small and quick in the background so it holds attention without cuts.",
    caution: "Scripted, but every claim still has to be true. Urgency only if it’s real (“if the orange cart is still there”).",
    why: ["A third person introducing you makes viewers pause before they can justify scrolling.", "“Don’t you scroll” calls out the exit behavior directly, creating a commitment loop in the first 3 seconds.", "The sister miming the problem adds a second layer of visual story that holds attention without cuts.", "Proof inserts land at the exact moment skepticism peaks.", "A playful warning and price framing at the close turn hesitation into action."] },
  { id: "budget-luxury", name: "Aspirational Budget Luxury", oneLiner: "Open with an aspirational identity, show it looks high-end, then reveal the real price.",
    bestFor: "Fashion, outerwear, accessories and home pieces that look more expensive than they are", steps: ["Aspirational identity hook (“If you want to look like ___ this season…”)", "Show the full look on you", "Quality proof up close: lining, stitching, pockets, back detail", "A real moment you’d wear or use it ([your real occasion])", "The price reveal, framed against how expensive it looks", "Close with your size and height so viewers know what to order"],
    coach: "Let the viewer imagine themselves in it before any price shows. The close-up quality details are what make the price feel like a steal.",
    caution: "Compare to how it looks (“looks designer”), never claim a fake original price or that it’s a specific designer item.",
    why: ["An aspirational identity makes viewers picture themselves in it before they see a price.", "Framing it against how expensive it looks makes the real price feel like a steal.", "Close-ups of lining and details let viewers inspect it like they’re in the store.", "A real occasion makes it feel like lifestyle, not a sales pitch.", "Your size and height remove the last “will it fit me?” hesitation."] },
  { id: "comfort-confession", name: "Unapologetic Comfort Confession", oneLiner: "Say the “embarrassing” want out loud, then demo it on your body, live.",
    bestFor: "Shapewear, underwear, loungewear, comfort products, anything people feel a little shy wanting", steps: ["Confession hook: name the desire people don’t say out loud (“If you want ___ and don’t care if it looks like ___, I got you”)", "Give permission: function over looks", "Live demo on your body, no outfit change", "A spend comparison from your own experience ([what you spent on things that didn’t work])", "Close with your size and how it fits"],
    coach: "Say the “shameful” part with a straight face and zero apology. That honesty is what builds trust in the first 3 seconds.",
    caution: "Your own size, fit and experience only. No body-shaming of anyone, including yourself.",
    why: ["Naming the “embarrassing” desire out loud releases viewer judgment and builds instant trust.", "Framing it as permission to choose comfort disarms comparison-shopping.", "A live demo on the body closes the gap between seeing and believing.", "A spend comparison triggers loss aversion without leading with price.", "Your exact size turns sizing into a clear signal for viewers built like you."] },
  { id: "problem-solved-reveal", name: "Problem-Solved Feature Reveal", oneLiner: "Name the flaw everyone hates in this kind of product, then show how this one fixes it.",
    bestFor: "Upgraded versions of everyday products: tights, leggings, bras, tools, kitchen gear", steps: ["Hook naming the common flaw (“___ got an upgrade: instead of ___, you get ___”)", "Lead with a product-first shot (e.g. back view) so viewers lean in", "Old problem → the new solution", "Personal proof while you physically demo: pull, point, trace", "Lifestyle: how it fits into a normal day", "Close with a “you’d never know” line that answers the main objection"],
    coach: "Point at and physically show the fix while you talk about it. Showing and telling at the same time is what keeps people watching.",
    why: ["Naming a flaw everyone has felt makes viewers feel understood before the pitch starts.", "A product-first shot makes viewers lean in to figure out what they’re looking at.", "Old problem → new solution → personal proof → lifestyle feels like advice, not advertising.", "Physical demonstration (pulling, pointing, tracing) shows and tells at once.", "A “you’d never know” close answers the #1 objection without calling it one."] },
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
