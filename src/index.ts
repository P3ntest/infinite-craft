import { trpc } from "@elysiajs/trpc";
import { initTRPC, TRPCError } from "@trpc/server";
import { Elysia } from "elysia";
import { z } from "zod";
import "./openai";
import { AiItem, combineItems } from "./openai";
import { prisma } from "./prisma";

const t = initTRPC.create();
const p = t.procedure;

const router = t.router({
  combineItems: p
    .input(
      z.object({
        itemIds: z.array(z.string().cuid()).length(2),
      })
    )
    .mutation(async (opts) => {
      const items = await prisma.craftItem.findMany({
        where: {
          id: {
            in: opts.input.itemIds,
          },
        },
      });

      if (items.length !== 2) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "items_not_found",
        });
      }
      if (items[0].id === items[1].id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "same_item",
        });
      }

      console.log("Combining items", items.map((i) => i.name).join(" + "));

      const existingResult = await prisma.recipe.findFirst({
        where: {
          ingredients: {
            every: {
              id: {
                in: opts.input.itemIds,
              },
            },
          },
        },
        include: {
          result: true,
        },
      });

      if (existingResult) {
        console.log("Found existing result", existingResult.resultId);
        return AiItem.parse(existingResult.result);
      }

      const result = await combineItems(items);
      const craftItem =
        (await prisma.craftItem.findFirst({
          where: {
            name: result.name,
          },
        })) ?? (await prisma.craftItem.create({ data: result }));

      await prisma.recipe.create({
        data: {
          ingredients: {
            connect: items.map((i) => ({ id: i.id })),
          },
          result: {
            connect: { id: craftItem.id },
          },
        },
      });

      return result;
    }),
});

export type Router = typeof router;

const app = new Elysia().use(trpc(router)).listen(3000);
