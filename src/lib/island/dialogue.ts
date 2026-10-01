import type { FishKind } from './world';

export type Mood = 'greet' | 'pat' | 'bite' | 'muse' | 'tree' | 'sign' | 'fire' | 'cast';

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Oh! Good morning! Welcome to my little island~';
  if (hour >= 11 && hour < 17) return 'Oh! A visitor! Welcome to my little island~';
  if (hour >= 17 && hour < 21) return "Good evening! The fire's nice and warm. Stay a while?";
  return "Oh! You're up late too? Come sit by the fire~";
}

export const LINES: Readonly<Record<Exclude<Mood, 'greet'>, readonly string[]>> = {
  pat: ['Hehe, that tickles!', "You're really nice, you know that?", 'Pat pat! ♥', 'I like you already.', 'Eep! Okay, one more.'],
  bite: ['Ooh! A nibble!', 'Something is tugging!', 'Fish! Fish! Fish!'],
  cast: ['Fishing time!', 'Let us see who is home today.', "Okay pond, I'm ready."],
  muse: [
    'The breeze is so nice today.',
    'I hope Vinay is baking bread again. It smells amazing.',
    'Sometimes I just like listening to the pond.',
    'Have you checked out the projects? Vinay built those!',
    'Vinay went for a run this morning. I waddled. Same thing.',
    'No rush. The island will wait for you.',
  ],
  tree: ['Just leaves this time.', 'That tree is older than me!', 'Shake shake!'],
  sign: ["~ Vinay's Island ~ Population: one penguin. Please be kind to the fish."],
  fire: ['So cozy...', 'Careful, it pops!', 'Best seat on the island is right here.'],
};

export const CATCH_LINES: Readonly<Record<FishKind, string>> = {
  minnow: 'A pond minnow! Small, but mighty.',
  goby: "A tiny goby! It's looking at me...",
  trout: 'A speckled trout! Look at those spots!',
  koi: 'A sunset koi! It is so pretty...',
  moonCarp: 'A moon carp!! I have only heard stories!',
  lilyLeaf: 'A lily leaf. ...It counts, right?',
};

export function pick(mood: Exclude<Mood, 'greet'>, roll: number, avoid?: string): string {
  const lines = LINES[mood];
  const index = Math.min(lines.length - 1, Math.floor(roll * lines.length));
  if (lines.length > 1 && lines[index] === avoid) return lines[(index + 1) % lines.length];
  return lines[index];
}
