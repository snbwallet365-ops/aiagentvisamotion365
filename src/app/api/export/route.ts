import { db } from "@/db";
import { applications, clients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";
import { getCountry, visaTypeBn } from "@/lib/visa-data";

export const dynamic = "force-dynamic";

const HEADERS = [
  "পূর্ণ নাম", "ইমেইল", "ফোন", "পাসপোর্ট", "জাতীয়তা", "বয়স",
  "দেশ", "ভিসার ধরন", "অবস্থা", "ট্র্যাকিং আইডি",
  "যোগ্যতা স্কোর", "ঝুঁকি", "সফলতার সম্ভাবনা",
  "ফি", "মুদ্রা", "প্রসেসিং সময়", "পদবি", "নিয়োগকর্তা",
  "মাসিক বেতন", "ব্যাংক ব্যালেন্স", "তৈরির তারিখ",
];

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** ক্লায়েন্ট ও আবেদনের সম্পূর্ণ তালিকা CSV (Excel-সামঞ্জস্যপূর্ণ, বাংলা ইউনিকোডসহ)। */
export async function GET() {
  await ensureSeed();
  const rows = await db
    .select({ app: applications, client: clients })
    .from(applications)
    .leftJoin(clients, eq(applications.clientId, clients.id))
    .orderBy(desc(applications.createdAt));

  const lines = [HEADERS.join(",")];
  for (const { app, client } of rows) {
    const rule = getCountry(app.country);
    lines.push([
      client?.fullName, client?.email, client?.phone, client?.passportNo, client?.nationality, client?.age,
      rule?.countryBn ?? app.country, visaTypeBn(app.country, app.visaType), app.status, app.trackingId,
      app.eligibilityScore, app.riskScore, app.successProbability,
      Math.round(app.feeAmount), app.feeCurrency, app.processingEstimate,
      client?.jobTitle, client?.employerName, client?.salary, client?.bankBalance,
      new Date(app.createdAt).toISOString().slice(0, 10),
    ].map(csvCell).join(","));
  }

  // Excel-এ বাংলা সঠিকভাবে দেখাতে UTF-8 BOM যুক্ত করা হয়
  const csv = "\uFEFF" + lines.join("\n");
  const file = `visamotion-clients-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
    },
  });
}
