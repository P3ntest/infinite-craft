import OpenAI from "openai";
import { z } from "zod";

const model = process.env.AI_MODEL;

export const openAi = new OpenAI({
  baseURL: process.env.AI_BASE_URL,
  apiKey: process.env.AI_API_KEY,
});

export const AiItem = z.object({
  name: z.string().transform((v) =>
    v
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  ),
  emoji: z.string().transform((v) => v.trim()),
});
export type AiItem = z.infer<typeof AiItem>;

export async function combineItems(items: AiItem[]): Promise<AiItem> {
  const response = await openAi.chat.completions.create({
    model: model as string,
    response_format: {
      type: "json_object",
    },
    temperature: 1,
    messages: [
      {
        role: "system",
        content:
          "You are a senior creativity engineer. You always ONLY answer in valid JSON.",
      },
      {
        role: "user",
        content: `<task>
Your job is to come up with a new item which results from combining two other items. The combination should be creative and logical AND MAKE SENSE. Examples:
- 🚘 Air + 🌊 Water = ☁️ Cloud
- 🚘 Car + 🏃 Speed = 🏎️ Racecar
- 🌱 Grass + 🌊 Water = 🐊 Swamp
- 🚀 Elon Musk + 🚘 Car = ⚡ Tesla
- 🍎 Apple + 💻 Laptop = 📱 MacBook

Feel free to use brands or people as items. The items also always includes ONE emoji.

Answer in the following JSON ONLY format:
{
    "name": "<string>", // The name of the new item
    "emoji": "<single emoji>" // The emoji of the new item. ONLY ONE emoji
}
</task>
<input>
Input 1: "${items[0].emoji} ${items[0].name}"
Input 2: "${items[1].emoji} ${items[1].name}"
</input>`,
      },
    ],
  });

  const outputRaw = response.choices[0].message.content!;
  return AiItem.parse(JSON.parse(outputRaw));
}

console.log(
  await combineItems([
    { name: "Apple", emoji: "🍎" },
    { name: "Laptop", emoji: "💻" },
  ])
);
