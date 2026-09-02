import { parseRecipientsInput } from "../src/lib/recipients-parse";
import { parseSpintax } from "../src/lib/spintax";
import { renderPlaceholders, extractPlaceholders, extractUrls } from "../src/lib/placeholders";
import { verifyPlaceholdersAndLinks, mockParaphrase } from "../src/lib/ai";
import { encrypt, decrypt } from "../src/lib/crypto";
import { hashPassword, verifyPassword } from "../src/lib/auth";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("✅ " + msg);
}

async function main() {
  console.log("=== Recipients parse: comma with spaces/duplicates/invalid ===");
  {
    const raw = " a@test.com , b@test.com , a@test.com , invalid-email ,  c@test.com  ,, ";
    const res = parseRecipientsInput(raw);
    console.log(res);
    ok(res.validCount === 4, "validCount 4 (including duplicate)");
    ok(res.duplicatesInInput === 1, "duplicatesInInput 1");
    ok(res.invalidCount === 1, "invalidCount 1");
    ok(res.format === "comma", "format comma");
  }

  console.log("\n=== Recipients parse: tab table with header ===");
  {
    const raw = "email\tname\tcompany\nivan@test.com\tИван\tООО Ромашка\npetr@test.com\tПётр\tИП Петров";
    const res = parseRecipientsInput(raw);
    console.log(res);
    ok(res.headerDetected === true, "headerDetected true");
    ok(res.format === "table", "format table");
    ok(res.validCount === 2, "validCount 2");
    ok(res.recipients[0].name === "Иван", "name parsed");
  }

  console.log("\n=== Recipients parse: table without header ===");
  {
    const raw = "ivan@test.com\tИван\tООО\npetr@test.com\tПётр\tИП";
    const res = parseRecipientsInput(raw);
    console.log(res);
    ok(res.headerDetected === false, "no header");
    ok(res.recipients[0].email === "ivan@test.com", "email first col");
  }

  console.log("\n=== Recipients parse: lines ===");
  {
    const raw = "a@test.com\nb@test.com\nc@test.com";
    const res = parseRecipientsInput(raw);
    console.log(res);
    ok(res.validCount === 3, "3 lines valid");
  }

  console.log("\n=== Spintax 5 generations ===");
  {
    const tmpl = "{Привет|Здравствуйте|Добрый день}, {{name}}! {Как дела|Как настроение}?";
    const outs = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const out = parseSpintax(tmpl);
      console.log(` - ${out}`);
      outs.add(out);
    }
    ok(outs.size > 1, "spintax generates different variants");
  }

  console.log("\n=== Placeholders ===");
  {
    const tmpl = "Привет {{name}}, компания {{company}}, email {{email}}";
    const rendered = renderPlaceholders(tmpl, { name: "Иван", company: "Тест", email: "a@b.com" });
    console.log(rendered);
    ok(rendered.includes("Иван") && rendered.includes("Тест"), "placeholders rendered");
    const ph = extractPlaceholders(tmpl);
    ok(ph.length === 3, "extract 3 placeholders");
    const urls = extractUrls("Ссылка https://example.com и https://test.com/page");
    ok(urls.length === 2, "extract 2 urls");
  }

  console.log("\n=== AI verify placeholders/links ===");
  {
    const origBody = "Привет {{name}}, ссылка https://example.com и {{company}}";
    const origSubject = "Тема {{name}}";
    const genOk = { subject: "Тема {{name}}", body: "Привет {{name}}, ссылка https://example.com и {{company}}" };
    const check = verifyPlaceholdersAndLinks(origBody, origSubject, genOk);
    console.log(check);
    ok(check.ok === true, "check ok true when all preserved");
    const genBad = { subject: "Тема Иван", body: "Привет, ссылка https://example.com" };
    const checkBad = verifyPlaceholdersAndLinks(origBody, origSubject, genBad);
    console.log(checkBad);
    ok(checkBad.ok === false && checkBad.missing.length > 0, "detects missing placeholders");
    const genNoLink = { subject: "Тема {{name}}", body: "Привет {{name}} и {{company}}" };
    const checkLink = verifyPlaceholdersAndLinks(origBody, origSubject, genNoLink);
    console.log(checkLink);
    ok(checkLink.missing.includes("https://example.com"), "detects missing link");
  }

  console.log("\n=== AI mock paraphrase 3 variants ===");
  {
    const body = "Привет {{name}}, предлагаю обсудить сотрудничество. Ссылка https://example.com";
    const subject = "Предложение для {{company}}";
    const variants: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const v = mockParaphrase(body, subject, i);
      console.log(` #${i}:`, v);
      variants.push(v.body);
    }
    ok(new Set(variants).size === 3, "mock variants distinct");
  }

  console.log("\n=== Crypto encrypt/decrypt ===");
  {
    process.env.ENCRYPTION_KEY = "test-key-32-chars-long-enough-for-test";
    const enc = encrypt("my-secret-password");
    const dec = decrypt(enc);
    console.log("enc:", enc.slice(0, 20) + "...", "dec:", dec);
    ok(dec === "my-secret-password", "encrypt/decrypt roundtrip");
    const old = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    let threw = false;
    try { encrypt("x"); } catch { threw = true; }
    ok(threw, "encrypt throws without key");
    if (old) process.env.ENCRYPTION_KEY = old;
  }

  console.log("\n=== Auth bcrypt ===");
  {
    const pw = "admin123";
    const hash = await hashPassword(pw);
    const ok1 = await verifyPassword(pw, hash);
    const ok2 = await verifyPassword("wrong", hash);
    ok(ok1 === true, "correct password verifies");
    ok(ok2 === false, "wrong password fails");
  }

  console.log("\n=== Env handling check ===");
  {
    const orig = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const dbmod = await import("../src/lib/db");
    ok(dbmod.isDbConfigured() === false, "isDbConfigured false when missing");
    if (orig) process.env.DATABASE_URL = orig;
    else delete process.env.DATABASE_URL;
  }

  console.log("\n=== Delay & daily limit logic simulation ===");
  {
    function randomDelay(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    const delays = Array.from({ length: 5 }, () => randomDelay(30, 90));
    console.log("delays 30-90:", delays);
    ok(delays.every((d) => d >= 30 && d <= 90), "delays in range");
    const dailyLimit = 2;
    let sent = 0;
    const queued = [1, 2, 3, 4];
    let processed = 0;
    for (const _ of queued) {
      if (sent >= dailyLimit) break;
      sent++;
      processed++;
    }
    ok(processed === 2, "daily limit stops at 2");
    let errors = 0;
    let successes = 0;
    for (const id of [1, 2, 3]) {
      try {
        if (id === 2) throw new Error("bounce");
        successes++;
      } catch {
        errors++;
      }
    }
    ok(successes === 2 && errors === 1, "one error doesn't stop");
  }

  console.log("\n=== Unsubscribe / suppression simulation ===");
  {
    const suppression = new Set<string>();
    suppression.add("unsub@test.com");
    const list = ["a@test.com", "unsub@test.com", "b@test.com"];
    const filtered = list.filter((e) => !suppression.has(e.toLowerCase()));
    console.log("filtered:", filtered);
    ok(filtered.length === 2 && !filtered.includes("unsub@test.com"), "suppressed excluded");
  }

  console.log("\n=== All verify checks passed ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
