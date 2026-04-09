import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import PwaRegister from "@/app/pwa-register";

describe("PwaRegister", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("renders nothing", () => {
    const { container } = render(<PwaRegister />);
    expect(container.firstChild).toBeNull();
  });

  it("registers /sw.js on mount", () => {
    render(<PwaRegister />);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
  });
});
