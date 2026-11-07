/**
 * Node runs our TypeScript directly, but the app writes imports without
 * extensions because the bundler normally resolves them. This hook finishes
 * the sentence, so `node scripts/something.ts` can reach src/.
 */
import * as nodeModule from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

function resolveWithoutExtension(specifier, context, next) {
  if (specifier[0] !== "." && specifier[0] !== "/")
    return next(specifier, context);
  try {
    return next(specifier, context);
  } catch (err) {
    const url = new URL(specifier, context.parentURL);
    if (url.pathname.endsWith(".ts")) throw err;
    for (const guess of [url.pathname + ".ts", url.pathname + "/index.ts"]) {
      const target = new URL(guess, url);
      if (existsSync(fileURLToPath(target))) return next(target.href, context);
    }
    throw err;
  }
}

const hooks = nodeModule.registerHooks;
if (typeof hooks === "function") {
  hooks({ resolve: resolveWithoutExtension });
} else {
  nodeModule.register(
    `data:text/javascript,${encodeURIComponent(
      `import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
export async function resolve(specifier, context, next) {
  if (specifier[0] !== "." && specifier[0] !== "/") return next(specifier, context);
  try {
    return await next(specifier, context);
  } catch (err) {
    const url = new URL(specifier, context.parentURL);
    if (url.pathname.endsWith(".ts")) throw err;
    for (const guess of [url.pathname + ".ts", url.pathname + "/index.ts"]) {
      const target = new URL(guess, url);
      if (existsSync(fileURLToPath(target))) return next(target.href, context);
    }
    throw err;
  }
}`,
    )}`,
    import.meta.url,
  );
}
