/**
 * Shared utility functions for AI prompts.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Replace template variables in a string.
 * @param template The template string with {{placeholders}}.
 * @param vars A dictionary of variables to replace.
 * @returns The filled template string.
 */
export function fillTemplate(template: string, vars: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  }
  return result;
}

/**
 * Converts a Zod schema to a JSON schema string representation.
 * This is useful for providing a schema to an AI model.
 * @param schema The Zod schema to convert.
 * @returns A string representation of the JSON schema.
 */
export function zodSchemaToPrompt(schema: z.ZodType<any, any>): string {
  const jsonSchema = zodToJsonSchema(schema, {
    // You can add options here if needed, for example:
    // name: "MySchema",
    // target: "openApi3",
  });
  return JSON.stringify(jsonSchema, null, 2);
}
