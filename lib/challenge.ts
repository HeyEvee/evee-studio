// The 30-Day First Sale Challenge: one focus, one lesson and one framework a day. Built in, no AI cost.
export type ChallengeDay = { week: string; title: string; tip: string; fw: string };

const W1 = "Week 1 · Show up";
const W2 = "Week 2 · Stop the scroll";
const W3 = "Week 3 · Turn views into sales";
const W4 = "Week 4 · Double down";

export const CHALLENGE_DAYS: ChallengeDay[] = [
  { week: W1, title: "Just start", tip: "Today is about reps, not perfection. Film each product in good light, show it in your hand in the first 2 seconds, and post. Your first videos teach you what your next ones need.", fw: "demo-first" },
  { week: W1, title: "Show it working", tip: "People buy what they see working. Every video today shows the product doing its job on camera, not just sitting there.", fw: "demo-first" },
  { week: W1, title: "Name the problem", tip: "Open with the frustration your buyer already has. When they recognize their own problem, they stay to see the fix.", fw: "problem-solution" },
  { week: W1, title: "Lead with the result", tip: "Show the end result first, then how you got there. The payoff up front is what stops the scroll.", fw: "result-first" },
  { week: W1, title: "Talk like a friend", tip: "Film like you’re telling one friend about it. Short sentences, your normal voice. Viewers can tell when someone is reading an ad.", fw: "pov" },
  { week: W1, title: "Point to the cart", tip: "Every video ends with a clear next step: point to the orange cart and tell them where to find it. A clear call to action turns interest into a tap.", fw: "three-reasons" },
  { week: W1, title: "Check your numbers", tip: "Open Creator Center → Analytics. Which product got the most views this week? Give that one more of today’s videos.", fw: "problem-solution" },

  { week: W2, title: "The 2-second rule", tip: "Most people decide in the first 2 seconds. Make your first frame move: hands, the product, a before shot. Never start with a blank intro.", fw: "result-first" },
  { week: W2, title: "Text on screen", tip: "Many people watch with the sound off. Put your hook as big text on screen in the first second, short enough to read at a glance.", fw: "silent-story" },
  { week: W2, title: "Make them curious", tip: "A question they want answered keeps them watching: “Guess how much this was” or “I didn’t expect this.” Answer it later in the video.", fw: "price-shock" },
  { week: W2, title: "Before and after", tip: "Side by side is the fastest proof there is. Same angle, same light, then let the difference speak.", fw: "split-compare" },
  { week: W2, title: "Hot take", tip: "Try a confident opinion people will want to argue with, about a habit or product, never about people. Comments push your video further.", fw: "rage-bait" },
  { week: W2, title: "Three hooks, one product", tip: "Film the same product with 3 different hooks today. Same video, different first line. Tomorrow, check which one held viewers longest.", fw: "demo-first" },
  { week: W2, title: "Read your retention", tip: "Open a video’s analytics and look at where people swiped away. If they left in the first 3 seconds, the hook is the problem. If they left later, tighten the middle.", fw: "pov" },

  { week: W3, title: "Answer the doubt", tip: "Think of the one reason someone wouldn’t buy (price, size, does it really work?) and answer it on camera.", fw: "objection-proof" },
  { week: W3, title: "Proof at the right moment", tip: "Show proof exactly when a viewer would doubt you: the close-up, the test, the result. Proof beats promises.", fw: "before-after" },
  { week: W3, title: "Make the price feel right", tip: "Compare the price to something they already spend on, or show what it replaces. Value is about context, not the number.", fw: "budget-luxury" },
  { week: W3, title: "Your real reaction", tip: "Your honest first reaction is the most convincing thing you have. Film yourself actually trying it, not a rehearsed line.", fw: "comfort-confession" },
  { week: W3, title: "Reply to comments with videos", tip: "Turn a real question from your comments into a video reply. You already know someone wants that answer.", fw: "split-react" },
  { week: W3, title: "Fit it into a day", tip: "Show where the product fits in your real routine. People buy what they can picture in their own life.", fw: "routine" },
  { week: W3, title: "Stronger calls to action", tip: "Try different endings: “Grab it before it sells out” only if it’s true. Otherwise “It’s in the orange cart” or “Tap the cart to see the colors.” Test which gets clicks.", fw: "three-reasons" },

  { week: W4, title: "Find your winner", tip: "Look back at your views. Which product and which hook style did best? Today, make more videos in that exact style.", fw: "result-first" },
  { week: W4, title: "Remix what worked", tip: "Take your best video and refilm it: same structure, new hook, new angle. Winners usually have a second life.", fw: "pov" },
  { week: W4, title: "Tell a story", tip: "A short story with a twist keeps people to the end: what happened, what went wrong, how this product fixed it.", fw: "storytime" },
  { week: W4, title: "Wrong on purpose", tip: "Try a harmless “mistake” that people love correcting, like a funny order or a nickname. Every correction is a comment.", fw: "wrong-on-purpose" },
  { week: W4, title: "Bundle it", tip: "Show your products together: a mini haul or “everything I used today.” More products, more chances for a sale.", fw: "haul-reveal" },
  { week: W4, title: "Stop doing this", tip: "Point out a common mistake your viewer makes and show the better way with your product. Helpful videos get saved and shared.", fw: "mistake" },
  { week: W4, title: "Gift angle", tip: "Who would love this as a gift? Make a video for the person buying it for someone else.", fw: "gift" },
  { week: W4, title: "Plan your next 30", tip: "Look at your whole month: your best product, your best hook style, the days you posted most. Write down what you’ll keep doing.", fw: "problem-solution" },
  { week: W4, title: "Finish strong", tip: "Last day. Post your goal, then look at how far you’ve come. Whatever your numbers say, you now know what your audience responds to.", fw: "demo-first" },
];

// TikTok Shop's pilot limits how many shoppable videos a creator can post, so goals stay at 3–5 a day.
export const CHALLENGE_GOALS = [3, 4, 5];
