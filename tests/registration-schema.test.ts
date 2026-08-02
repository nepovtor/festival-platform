import { describe, expect, it } from "vitest";
import { registrationSchema } from "@/lib/registration-schema";

const validRegistration = {
  email: "guest@example.com",
  guestsCount: 2,
  consent: true,
  website: "",
};

describe("registrationSchema", () => {
  it("accepts a valid registration", () => {
    expect(registrationSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("normalizes the email", () => {
    const result = registrationSchema.parse({
      ...validRegistration,
      email: "  Guest@Example.COM ",
    });

    expect(result.email).toBe("guest@example.com");
  });

  it("rejects an invalid email", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      email: "wrong-address",
    });

    expect(result.success).toBe(false);
  });

  it("rejects fewer than one visitor", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      guestsCount: 0,
    });

    expect(result.success).toBe(false);
  });

  it("rejects more than ten visitors", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      guestsCount: 11,
    });

    expect(result.success).toBe(false);
  });

  it("accepts exactly ten visitors", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      guestsCount: 10,
    });

    expect(result.success).toBe(true);
  });

  it("requires consent", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      consent: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects the bot honeypot", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      website: "https://spam.example",
    });

    expect(result.success).toBe(false);
  });
});
