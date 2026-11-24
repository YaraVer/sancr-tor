import { describe, expect, it } from "vitest";
import {
  clearParticipantCode,
  getParticipantCode,
  isValidParticipantCode,
  normalizeParticipantCode,
  setParticipantCode,
} from "../src/systems/participant";

describe("participant code", () => {
  it("нормализует кириллицу и приводит к формату A017", () => {
    expect(normalizeParticipantCode("а017")).toBe("A017");
    expect(normalizeParticipantCode("А 0-1 7")).toBe("A017");
    expect(normalizeParticipantCode("Yara123")).toBe("YARA");
    expect(normalizeParticipantCode("я-123")).toBe("YA12");
  });

  it("проверяет формат [A-Z][0-9]{3}", () => {
    expect(isValidParticipantCode("A017")).toBe(true);
    expect(isValidParticipantCode("Z999")).toBe(true);
    expect(isValidParticipantCode("a017")).toBe(false);
    expect(isValidParticipantCode("AA17")).toBe(false);
    expect(isValidParticipantCode("A01")).toBe(false);
    expect(isValidParticipantCode("A0178")).toBe(false);
  });

  it("хранит код в рамках вкладки", () => {
    clearParticipantCode();
    expect(getParticipantCode()).toBe("");
    setParticipantCode("A017");
    expect(getParticipantCode()).toBe("A017");
    clearParticipantCode();
  });
});
