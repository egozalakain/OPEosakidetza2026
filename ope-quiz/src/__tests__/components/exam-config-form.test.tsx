import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExamConfigForm } from "@/components/exam/exam-config-form";

// next/navigation router is mocked so handleSubmit's router.push is a no-op.
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function lastPostBody(fetchMock: ReturnType<typeof vi.fn>) {
  const call = fetchMock.mock.calls.at(-1);
  return JSON.parse((call?.[1] as RequestInit).body as string);
}

describe("ExamConfigForm — shuffle options default per mode", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    push.mockReset();
    fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ examId: 1 }) });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("exposes the option-order toggle in Study mode, defaulting to 'Orden original'", () => {
    render(<ExamConfigForm />);
    fireEvent.click(screen.getByRole("button", { name: "Estudio" }));

    // The toggle is visible in study mode...
    expect(screen.getByText("Opciones de respuesta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Orden original" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mezclar opciones" })).toBeInTheDocument();
    // ...and the explanatory hint reflects the default (keep order).
    expect(
      screen.getByText(/se mantienen en el orden original de la bateria/i)
    ).toBeInTheDocument();
  });

  it("Study mode submits shuffleOptions=false by default (keeps battery order)", async () => {
    render(<ExamConfigForm />);
    fireEvent.click(screen.getByRole("button", { name: "Estudio" }));
    fireEvent.click(screen.getByRole("button", { name: "Comenzar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = lastPostBody(fetchMock);
    expect(body.mode).toBe("study");
    expect(body.shuffleOptions).toBe(false);
  });

  it("Study mode submits shuffleOptions=true only when 'Mezclar opciones' is chosen", async () => {
    render(<ExamConfigForm />);
    fireEvent.click(screen.getByRole("button", { name: "Estudio" }));
    fireEvent.click(screen.getByRole("button", { name: "Mezclar opciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Comenzar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = lastPostBody(fetchMock);
    expect(body.mode).toBe("study");
    expect(body.shuffleOptions).toBe(true);
  });

  it("Exam mode also defaults to shuffleOptions=false (battery order)", async () => {
    render(<ExamConfigForm />);
    // default mode is "exam"
    fireEvent.click(screen.getByRole("button", { name: "Comenzar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = lastPostBody(fetchMock);
    expect(body.mode).toBe("exam");
    expect(body.shuffleOptions).toBe(false);
  });
});
