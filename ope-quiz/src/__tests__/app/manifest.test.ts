import { describe, it, expect } from "vitest";
import manifest from "@/app/manifest";

describe("manifest", () => {
  it("returns required PWA fields", () => {
    const m = manifest();
    expect(m.name).toBe("OPE Osakidetza Quiz");
    expect(m.short_name).toBe("OPE Quiz");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#2563eb");
    expect(m.background_color).toBe("#f9fafb");
  });

  it("includes 192x192 and 512x512 PNG icons", () => {
    const m = manifest();
    const sizes = m.icons!.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    m.icons!.forEach((icon) => {
      expect(icon.type).toBe("image/png");
    });
  });
});
