const SYSTEM_RULES = `You generate a single, complete, self-contained HTML document for a printable primary-school lesson plan.

HARD RULES:
- Output ONLY the HTML document. No explanation, no markdown fences.
- The document MUST be fully self-contained: NO external resources, NO http/https URLs, NO <link> to web fonts, NO remote images.
- Use inline SVG for all illustrations and icons. Never use <img> with a URL.
- Page format is A4 (210mm wide). Content MUST fit within 210mm width; it may span multiple A4 pages vertically.
- For fonts, use these font-family names only (they are provided by the host, do not @import them):
  - 'Noto Nastaliq Urdu' for Urdu text
  - 'Noto Naskh Arabic' for Sindhi/Arabic text
  - 'Noto Sans' for Latin text
- For Urdu and Sindhi, set direction:rtl and text-align:right on the relevant blocks.
- Make it colorful, clear, and age-appropriate, matching the quality of the reference example below.

REFERENCE EXAMPLE (match this quality and structure; do not copy its content):
`;

function buildMessages(input, fewShotHtml) {
  const { subject, grade, language, topic } = input;
  const system = SYSTEM_RULES + '\n' + fewShotHtml + '\n';
  const user =
    `Create a lesson plan.\n` +
    `Subject: ${subject}\n` +
    `Grade: grade ${grade}\n` +
    `Language of the lesson content: ${language}\n` +
    `Topic: ${topic}\n` +
    `Return the complete self-contained HTML document only.`;
  return { system, user };
}

module.exports = { buildMessages };
