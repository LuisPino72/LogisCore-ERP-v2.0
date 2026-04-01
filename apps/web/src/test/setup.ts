import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => null)
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: null
}));