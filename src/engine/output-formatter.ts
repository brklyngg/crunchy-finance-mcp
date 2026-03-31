/**
 * Extract JSON from Claude responses.
 * Claude may wrap JSON in markdown code fences or include preamble text.
 * This module handles all common response formats.
 */

export function extractJson(raw: string): string {
  // Try direct parse first
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    // Not direct JSON, try extraction
  }

  // Try extracting from markdown code fence
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      JSON.parse(fenceMatch[1]);
      return fenceMatch[1];
    } catch {
      // Not valid JSON in fence
    }
  }

  // Try finding first { ... } or [ ... ] block
  const objectMatch = raw.match(/(\{[\s\S]*\})/);
  if (objectMatch) {
    try {
      JSON.parse(objectMatch[1]);
      return objectMatch[1];
    } catch {
      // Not valid JSON object
    }
  }

  const arrayMatch = raw.match(/(\[[\s\S]*\])/);
  if (arrayMatch) {
    try {
      JSON.parse(arrayMatch[1]);
      return arrayMatch[1];
    } catch {
      // Not valid JSON array
    }
  }

  // Return raw content as-is if no JSON found — let the caller handle it
  return raw;
}

export function formatToolResponse(content: string): string {
  const extracted = extractJson(content);
  try {
    // Re-serialize for consistent formatting
    const parsed = JSON.parse(extracted);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Return the raw content if JSON extraction failed
    return content;
  }
}
