// ESLint rule: no hard-coded design values in components (CLAUDE.md rule 5,
// design-system §12). Tailwind's default palette, radii, shadows, type sizes
// and easings are removed in globals.css, so the remaining ways to bypass the
// tokens are caught here:
//   1. arbitrary values with literal colors, lengths or times: `w-[37px]`,
//      `bg-[#fff]`, `duration-[250ms]`, `ease-[cubic-bezier(…)]`;
//   2. numeric duration/delay utilities: `duration-200`, `delay-75`;
//   3. Tailwind default palette colors: `text-red-500`, `bg-white`;
//   4. literal colors, lengths or times in `style={{ … }}` objects.
// Token references stay allowed: `max-h-(--sheet-max-height)`, `w-[var(--x)]`.

const LITERAL_VALUE =
  /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix|cubic-bezier)\(|(?<![a-z\d.])\d*\.?\d+(?:px|rem|em|ms|s|deg|vh|vw|dvh|svh|lvh|%)(?![a-z])/i;

const PALETTE =
  /^(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|accent|caret|divide|placeholder|inset-ring)-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|white|black)(?:\/\d+)?$/;

const NUMERIC_TIMING = /^(?:duration|delay)-\d+$/;

/** Strips variants (`hover:`, `sm:`, `data-[state=open]:`) from a class. */
function utilityOf(token) {
  let depth = 0;
  let last = -1;
  for (let i = 0; i < token.length; i++) {
    const char = token[i];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;
    else if (char === ":" && depth === 0) last = i;
  }
  return token.slice(last + 1).replace(/^!/, "");
}

/** Returns a reason when a class token uses a hard-coded design value. */
export function checkClass(token) {
  const utility = utilityOf(token);
  const arbitrary = utility.match(/\[(.+)\]$/);
  if (arbitrary && !/^var\(--[\w-]+\)$/.test(arbitrary[1]) && LITERAL_VALUE.test(arbitrary[1])) {
    return `arbitrary value "${token}"`;
  }
  if (NUMERIC_TIMING.test(utility)) return `numeric timing "${token}" (use duration-(--dur-*))`;
  if (PALETTE.test(utility)) return `Tailwind palette color "${token}" (use a semantic token)`;
  return null;
}

function checkString(context, node, value) {
  if (typeof value !== "string" || !/[[\w]-/.test(value)) return;
  for (const token of value.split(/\s+/)) {
    if (!token) continue;
    const reason = checkClass(token);
    if (reason) context.report({ node, messageId: "classValue", data: { reason } });
  }
}

function isStyleObject(node) {
  const attribute = node.parent?.parent;
  return (
    node.type === "ObjectExpression" &&
    attribute?.type === "JSXAttribute" &&
    attribute.name?.name === "style"
  );
}

/** @type {import("eslint").Rule.RuleModule} */
export const noHardcodedDesign = {
  meta: {
    type: "problem",
    docs: { description: "Disallow hard-coded colors, sizes, durations and easings" },
    messages: {
      classValue: "Hard-coded design value: {{reason}}. Use a design token (design-system.md).",
      styleValue: "Hard-coded design value in style: {{value}}. Use a CSS variable token.",
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        checkString(context, node, node.value);
      },
      TemplateElement(node) {
        checkString(context, node, node.value.cooked);
      },
      ObjectExpression(node) {
        if (!isStyleObject(node)) return;
        for (const property of node.properties) {
          if (property.type !== "Property") continue;
          const value = property.value;
          if (value.type === "Literal" && typeof value.value === "string") {
            if (LITERAL_VALUE.test(value.value) && !/^var\(/.test(value.value)) {
              context.report({
                node: value,
                messageId: "styleValue",
                data: { value: value.value },
              });
            }
          }
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "sprigkit" },
  rules: { "no-hardcoded-design": noHardcodedDesign },
};

export default plugin;
