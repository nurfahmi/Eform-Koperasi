/**
 * AI Service — vision-based field mapping via APIMart (Gemini Native Format)
 */

const AI_BASE_URL = 'https://api.apimart.ai/v1';

const AiService = {
  /**
   * Analyze a PDF page image to suggest field mappings.
   * Uses Gemini Native API format with vision.
   */
  async suggestPageMappings(imageBase64, fieldsOnPage, standardFields) {
    const apiKey = process.env.APIMART_API_KEY;
    if (!apiKey) throw new Error('APIMART_API_KEY not set in .env');

    const standardList = Object.entries(standardFields)
      .map(([key, val]) => `  ${key} — ${val.label}`)
      .join('\n');

    const fieldList = fieldsOnPage
      .map(f => `  "${f.name}" at position (x:${Math.round(f.x)}, y:${Math.round(f.y)}, w:${Math.round(f.width)}, h:${Math.round(f.height)})`)
      .join('\n');

    const prompt = `You are an expert at reading Malaysian loan/financial PDF forms. You must identify what data each form field collects.

IMAGE: The form page image is attached.

FORM FIELDS on this page (with pixel positions from top-left):
${fieldList}

STANDARD FIELD NAMES (use ONLY these):
${standardList}

HOW TO READ THE FORM:
1. LABELS are printed TEXT on the LEFT. FILLABLE FIELDS (boxes) are on the RIGHT of the label.
   Example: "Jawatan : [____]" → the field on the right is for Jawatan (job title)
2. Match each fillable field to the LABEL on its LEFT or directly ABOVE it
3. "Nama" label = Name field → pemohon_nama (NOT alamat!)
4. "Alamat" label = Address field → pemohon_alamat
5. When multiple rows of boxes appear under ONE label (e.g. "Nama" followed by 3 rows of boxes), ALL those rows belong to that same label
6. Fields in the "Nama" section are ALWAYS before "Alamat" on the form (top = nama, below = alamat)

SECTION RULES — determine which section each field is in:
- "Pemohon" / "Applicant" / "Keterangan Peribadi" section → pemohon_ prefix
- "Pasangan" / "Suami/Isteri" section → pasangan_ prefix
- "Saudara" / "Waris" section → saudara_ prefix
- "Pekerjaan" / "Majikan" / "Employer" section → pekerjaan_ prefix

SPECIFIC MAPPINGS:
- "Nama" / "Nama Pemohon" → pemohon_nama
- "Alamat" / "Alamat Kediaman" → pemohon_alamat
- "No KP Baru" / "No K/P Baru" (applicant) → pemohon_ic
- "No KP Baru" (spouse section) → pasangan_ic
- SKIP "No KP Lama" / "No K/P Lama" (not used)
- "Tel Pejabat" → pekerjaan_tel or pasangan_tel_pejabat
- "Tel Bimbit" / "Tel Rumah" → pemohon_tel or pasangan_tel
- "Nama dan Alamat Majikan" / "Nama Majikan" → pekerjaan_majikan (name rows), pekerjaan_alamat (address rows)

IMPORTANT:
- Multiple fields CAN map to the same key (e.g. 3 address rows → all pemohon_alamat)
- Only map fields you are CONFIDENT about
- Skip fields not in the standard list

Return ONLY valid JSON (no markdown, no code fences):
{ "fieldMapping": { "FieldName": "standard_key" } }`;

    // Use Gemini Native Format API
    const model = 'gemini-2.5-pro';
    const url = `${AI_BASE_URL}/models/${model}:generateContent`;

    const requestBody = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
        ]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 16384
      }
    });

    // Fetch with timeout and 1 retry
    const doFetch = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout
      try {
        return await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: requestBody,
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    let response;
    try {
      response = await doFetch();
    } catch (err) {
      console.log('[AI] First attempt failed, retrying...', err.message);
      response = await doFetch();
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error: ${response.status} — ${err.substring(0, 300)}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const finishReason = data.candidates?.[0]?.finishReason || 'unknown';
    console.log(`[AI] Response length: ${text.length} chars, finishReason: ${finishReason}`);
    console.log('[AI] Raw response:', text.substring(0, 500));

    // Strip markdown code fences if present
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON. Raw: ' + text.substring(0, 200));

    return JSON.parse(jsonMatch[0]);
  }
};

module.exports = AiService;
