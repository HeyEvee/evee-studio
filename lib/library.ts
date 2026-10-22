// Evee Shop content library, shared by the app and the server.
// To add a framework or format, add an entry here. Nothing else needs to change.

export type Framework = { id: string; name: string; alt?: string; use: string; steps: string[]; caution?: string };

export const FORMATS = [
  "Music + on-screen text only",
  "Talking-head video",
  "Voiceover with B-roll",
  "Product demonstration",
  "Before-and-after visual comparison",
  "Split video: problem, then solution",
  "Storytime / personal experience",
  "Product review",
  "Outfit try-on or styling",
  "Unboxing / first impressions",
  "Problem-to-solution demo",
];

export const FRAMEWORKS: Framework[] = [
  { id: "A", name: "Cultural Insider", alt: "Ungate the Secret",
    use: "Identity, community or insider knowledge makes the product feel like something you’re being let in on.",
    steps: ["Identity, cultural, curiosity or insider-style hook", "A relatable situation or overlooked problem", "Hint that a better approach exists", "Reveal the product as one possible solution", "Demonstrate real features or benefits", "Confidence, convenience or lifestyle payoff", "Natural CTA"],
    caution: "Use cultural references respectfully. Never imply everyone in a group shares one experience. No invented traditions or “secret passed down” stories." },
  { id: "B", name: "Relatable Problem / Solution", use: "The product fixes a frustration people instantly recognize.",
    steps: ["Show a recognizable frustration", "Make the viewer feel understood", "Introduce the product", "Demonstrate how it handles the problem", "Show the practical benefit", "CTA"] },
  { id: "C", name: "Curiosity Gap", alt: "Unexpected Discovery", use: "There’s a surprising use, result or observation worth staying for.",
    steps: ["A surprising observation or open loop", "A reason to keep watching", "Reveal the discovery", "Show evidence or a demonstration", "Resolve the curiosity", "CTA"],
    caution: "No fake secrets or misleading clickbait." },
  { id: "D", name: "Demonstration-First", use: "The product does something visually satisfying in the first second.",
    steps: ["Open on the most visually compelling product action", "Name what the viewer is seeing", "Highlight a relevant feature", "Show the practical value", "Resolve an objection if it fits", "CTA"] },
  { id: "E", name: "Objection-to-Proof", use: "Buyers hesitate over price, fit, quality or “does it actually work”.",
    steps: ["State a genuine customer hesitation", "Show why it matters", "Demonstrate or explain a verified feature", "Address the objection honestly", "CTA"] },
  { id: "F", name: "Personal Discovery", alt: "Friend Recommendation", use: "You have a real story about finding it and an honest opinion.",
    steps: ["Start with a personal observation", "What prompted the discovery", "Introduce the product naturally", "Show how it fits into real life", "Share an honest opinion or limitation", "CTA"] },
  { id: "G", name: "Silent Visual Story", use: "You film to music without talking.",
    steps: ["Strong first-frame visual and text hook", "Show a recognizable problem or desired outcome", "Introduce the product visually", "Demonstrate its key feature", "Reveal the finished look or payoff", "Brief on-screen CTA"] },
];
export const FW: Record<string, Framework> = Object.fromEntries(FRAMEWORKS.map((f) => [f.id, f]));

export const HOOK_TYPES = ["POV / relatability", "Curiosity", "Insider knowledge", "Unexpected opinion", "Problem recognition", "Personal confession", "Demonstration-first", "Humor", "Identity and community", "Product discovery"];
export const ANGLES = ["a relatable frustration", "an unexpected use", "an overlooked styling or usage tip", "a common misconception", "a convenience benefit", "a comparison between approaches", "an honest review", "a personal discovery", "a feature that solves a specific problem", "an objection the demo can resolve"];
export const DUR: Record<string, string> = { "7-15": "about 7–15 seconds", "15-30": "about 15–30 seconds", "30-60": "about 30–60 seconds" };

export const CATS = [
  { k: "Fashion & shapewear", g: "Prioritize try-ons, styling, fit, fabric, comfort, outfit transitions and truthful visual comparisons. No body-shaming or unsupported claims." },
  { k: "Beauty & skincare", g: "Prioritize application, texture, routine integration, packaging and substantiated benefits. No treatment claims or guaranteed results." },
  { k: "Haircare", g: "Prioritize application, styling routines, texture, manageability and realistic demos. Never promise hair growth or medical outcomes without evidence." },
  { k: "Home & cleaning", g: "Prioritize visible demonstrations, ease of use, substantiated time-saving and real-world utility." },
  { k: "Parenting & family", g: "Prioritize convenience, everyday situations, ease of use and practical benefits. Never depict children exploitatively." },
  { k: "Supplements & wellness", g: "Conservative, evidence-based language only. Never invent health outcomes, diagnose, or promise weight loss, hormonal change, prevention or treatment." },
  { k: "Kitchen & food", g: "Prioritize real cooking moments, speed and mess shown honestly, and the finished result." },
  { k: "Tech & gadgets", g: "Prioritize hands-on demos, setup ease, real use cases and specs that are actually supplied." },
  { k: "Auto", g: "Prioritize real before/after in an actual car, size and storage, and ease of use." },
  { k: "Pets", g: "Prioritize real pet reactions and everyday use. Never imply health outcomes for animals without evidence." },
  { k: "Other", g: "Adapt to verified features and appropriate claims." },
];

export const PRODUCT_FIELDS: { k: string; l: string; sel?: boolean; ta?: boolean; h?: string }[] = [
  { k: "name", l: "Product name" },
  { k: "category", l: "Category", sel: true },
  { k: "description", l: "Description", ta: true },
  { k: "features", l: "Features", ta: true, h: "One per line" },
  { k: "benefits", l: "Verified benefits", ta: true, h: "Only what you know is true" },
  { k: "customer", l: "Target customer" },
  { k: "frustrations", l: "Customer frustrations or unmet needs", ta: true },
  { k: "objections", l: "Common objections", ta: true },
  { k: "different", l: "What makes it different", ta: true },
  { k: "opinion", l: "Your experience or honest opinion", ta: true, h: "Evee only uses the personal experience you write here" },
  { k: "price", l: "Price" },
  { k: "link", l: "TikTok Shop link", h: "Saved for reference. Evee doesn’t open links." },
  { k: "claims", l: "Claims or restrictions", ta: true, h: "Anything the brand says you can’t say" },
];

export const DEFAULT_VIBE = "Authentic and conversational. Relatable, like a helpful internet friend. Confident without sounding pushy. Comfortable with humor and candid reactions. Personal, warm and natural. Focused on real-life product use. Never sounds like a traditional commercial.";
export const PROFILE_FIELDS: { k: string; l: string; ta?: boolean; h?: string }[] = [
  { k: "vibe", l: "How you come across", ta: true },
  { k: "niche", l: "Your niche" },
  { k: "audience", l: "Your audience", h: "Who watches you" },
  { k: "phrases", l: "Phrases you actually say", ta: true, h: "One per line" },
  { k: "vocab", l: "Words you like to use", ta: true },
  { k: "humor", l: "Your humor style" },
  { k: "avoid", l: "Phrases to avoid", ta: true },
];

export const QC = ["Does the hook give a specific reason to stop scrolling?", "Does the visual match the hook?", "Is the intended viewer clear?", "Does the product solve a relevant problem or fulfill a real desire?", "Is the product shown early enough for the format?", "Is there visible or credible proof?", "Is the payoff meaningful?", "Does it sound like the creator?", "Is the CTA natural?", "Are all product claims supported?", "Is it meaningfully different from the other concepts?", "Can she film it with what she has?"];

export const PERF_FIELDS: { k: string; l: string; t?: string }[] = [
  { k: "date", l: "Date posted", t: "date" }, { k: "duration", l: "Video length (sec)" }, { k: "views", l: "Views" }, { k: "watch", l: "Avg watch time (sec)" },
  { k: "completion", l: "Completion rate (%)" }, { k: "likes", l: "Likes" }, { k: "comments", l: "Comments" }, { k: "shares", l: "Shares" },
  { k: "clicks", l: "Product clicks" }, { k: "orders", l: "Orders" }, { k: "revenue", l: "Sales revenue ($)" }, { k: "commission", l: "Commission ($)" },
];

export const METRICS = [
  { k: "eng", l: "Engagement rate", short: "Engage", def: "(likes + comments + shares) ÷ views", pct: true },
  { k: "ctr", l: "Click-through rate", short: "CTR", def: "product clicks ÷ views", pct: true },
  { k: "conv", l: "Click-to-order", short: "Click→order", def: "orders ÷ product clicks", pct: true },
  { k: "rpm", l: "Revenue per 1K views", short: "Rev / 1K", def: "sales revenue ÷ views × 1,000", usd: true },
  { k: "cpm", l: "Commission per 1K views", short: "Comm / 1K", def: "commission ÷ views × 1,000", usd: true },
];

// A blank or non-numeric value is "unknown", never zero.
export const num = (v: unknown): number | null => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));

export function metrics(p: Record<string, unknown> = {}) {
  const v = num(p.views);
  const g = (k: string) => num(p[k]);
  const likes = g("likes"), comments = g("comments"), shares = g("shares"), clicks = g("clicks"), orders = g("orders"), revenue = g("revenue"), commission = g("commission");
  return {
    eng: v && v > 0 && likes != null && comments != null && shares != null ? (likes + comments + shares) / v : null,
    ctr: v && v > 0 && clicks != null ? clicks / v : null,
    conv: clicks && clicks > 0 && orders != null ? orders / clicks : null,
    rpm: v && v > 0 && revenue != null ? (revenue / v) * 1000 : null,
    cpm: v && v > 0 && commission != null ? (commission / v) * 1000 : null,
  } as Record<string, number | null>;
}
