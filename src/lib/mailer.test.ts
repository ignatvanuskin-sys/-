import { describe, it, expect, beforeEach } from "vitest";
import { isEtherealHost, createTransporter } from "./mailer";
import { encrypt } from "./crypto";

describe("isEtherealHost", () => {
  it("detects ethereal", () => {
    expect(isEtherealHost("smtp.ethereal.email")).toBe(true);
    expect(isEtherealHost("smtp.gmail.com")).toBe(false);
    expect(isEtherealHost("smtp.mail.ru")).toBe(false);
  });
});

describe("createTransporter", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-key-32-chars-long-for-mailer!";
  });

  it("creates transporter with decrypted password", () => {
    const enc = encrypt("secret123");
    const cfg: any = {
      smtpHost: "smtp.test.com",
      smtpPort: 587,
      secure: false,
      login: "user@test.com",
      passwordEncrypted: enc,
      fromName: "Test",
      fromEmail: "user@test.com",
    };
    const transporter = createTransporter(cfg);
    expect(transporter).toBeDefined();
    // nodemailer transporter has sendMail
    expect(typeof transporter.sendMail).toBe("function");
    expect(typeof transporter.verify).toBe("function");
  });
});
