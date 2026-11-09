import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const oldGuidance = "This is the only time you will see this key. Store it securely.";
const guidance = "The full value is only shown once. You can still copy it later from";
const guidanceKey = "Store this key securely. You can view or copy it later from the API Keys list.";
const source = readFileSync(
  new URL("../../src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js", import.meta.url),
  "utf-8"
);
const keyRowSource = readFileSync(
  new URL("../../src/app/(dashboard)/dashboard/endpoint/components/KeyRow.js", import.meta.url),
  "utf-8"
);

describe("API key visibility guidance source verification", () => {
  it("explains that created keys remain available in the API Keys list", () => {
    const modal = source.match(/title="Key created"[\s\S]*?<\/Modal>/)?.[0];
    expect(modal).toBeDefined();
    expect(modal).toContain(guidance);
    expect(modal).not.toContain(oldGuidance);
  });

  it("retains the list's reveal and copy controls", () => {
    // The reveal/copy controls moved into the shared KeyRow component.
    expect(keyRowSource).toContain("visible ? key.key : maskKey(key.key)");
    expect(source).toContain('onToggleVisibility={() => toggleKeyVisibility(key.id)}');
    expect(source).toContain('onCopy={() => copy(key.key, key.id)}');
  });

  it.each(["fa", "id", "km", "pt-BR", "th", "zh-CN"])(
    "updates the existing %s translation without retaining the one-time claim",
    (locale) => {
      const translations = JSON.parse(readFileSync(
        new URL(`../../public/i18n/literals/${locale}.json`, import.meta.url),
        "utf-8"
      ));
      expect(translations).not.toHaveProperty(oldGuidance);
      expect(translations[guidanceKey]).toEqual(expect.any(String));
      expect(translations[guidanceKey].trim()).not.toBe("");
      expect(translations[guidanceKey]).not.toBe(guidanceKey);
    }
  );
});
