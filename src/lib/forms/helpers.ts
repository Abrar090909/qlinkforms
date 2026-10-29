import type { Block, BlockOf, FormSchema } from "./schema";

// Small schema helpers with no zod import, so the public form bundle (which
// only needs types from ./schema) never pulls in the validation library.

export function findPaymentBlock(schema: Pick<FormSchema, "blocks">) {
  return schema.blocks.find(
    (b): b is BlockOf<"payment"> => b.type === "payment",
  );
}

/** Blocks that collect an answer (everything except statements). */
export function isAnswerable(block: Block) {
  return block.type !== "statement";
}
