// Daily affirmations for abundance, money and creator confidence. Built in, no AI cost.
export const AFFIRMATIONS: string[] = [
  "Money flows to me easily because I show up and share what I love.",
  "Every video I post is a seed. My harvest is already on its way.",
  "I am allowed to be paid well for my voice, my taste and my time.",
  "Abundance is my normal. There is more than enough for me.",
  "My best sellers are only the beginning of what I can create.",
  "I receive sales, commissions and opportunities with gratitude and ease.",
  "I am building wealth for my family one post at a time.",
  "The right buyers find my videos at the right time.",
  "I don’t chase money. I create value, and money follows.",
  "I am a creator and a CEO. I lead my business with confidence.",
  "My consistency is compounding, even on the days I can’t see it yet.",
  "I celebrate every sale, big or small, and invite more to come.",
  "I trust my instincts about what my audience needs.",
  "Today I post with purpose, not pressure.",
  "My income can grow while I rest, because my content keeps working.",
  "I release scarcity. Another creator’s win does not take away from mine.",
  "I am worthy of a business that pays me well and gives me freedom.",
  "I make smart, calm decisions with my money.",
  "My numbers are information, not judgment. I learn and I grow.",
  "Opportunities, brand deals and sales are drawn to my energy.",
  "I am proud of how far I’ve come, and excited for where I’m going.",
  "I give myself permission to want more and to have it.",
  "My business supports my life, not the other way around.",
  "Every no brings me closer to a yes. I keep going.",
  "I am a magnet for loyal buyers who love what I recommend.",
  "I spend, save and invest my money with intention.",
  "I am creating generational wealth with what I build today.",
  "Showing up imperfectly still moves me forward.",
  "I am open to receiving more than I ever imagined.",
  "My voice is valuable. The people who need it are listening.",
  "I welcome my best month yet.",
  "I am grateful for the money I have and ready for the money that’s coming.",
  "Rest is part of my strategy. I don’t have to hustle to be worthy.",
  "I am the kind of creator people trust, and trust turns into sales.",
  "Each day I get a little better, and my results reflect it.",
  "Abundance shows up for me in sales, in time and in joy.",
  "I let go of comparison and focus on my own growth.",
  "I am building something that lasts.",
  "Money is a tool, and I use it to create a beautiful life.",
  "Today, I choose to believe that big things are possible for me.",
];

// Same affirmation all day, a new one tomorrow.
export function affirmationIndex(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return ((day % AFFIRMATIONS.length) + AFFIRMATIONS.length) % AFFIRMATIONS.length;
}
