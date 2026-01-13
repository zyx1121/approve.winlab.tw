import { DocumentNotificationEmail } from "@/components/emails/document-notification";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { to, signerName, documentTitle, documentUrl, creatorName } =
      await request.json();

    if (!to || !documentTitle || !documentUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user name from database
    const supabase = await createClient();
    let actualSignerName = to.split("@")[0]; // Fallback to email prefix

    try {
      const { data: userData, error: userError } = await supabase
        .from("user_profiles")
        .select("name, email")
        .eq("email", to)
        .single();

      if (!userError && userData?.name) {
        actualSignerName = userData.name;
        console.log(`Found user name for ${to}: ${userData.name}`);
      } else {
        console.log(`User name not found for ${to}, using email prefix`);
      }
    } catch (error) {
      console.warn(`Could not fetch user name for ${to}:`, error);
    }

    const { data, error } = await resend.emails.send({
      from: "Winlab 簽核系統 <noreply@notifications.winlab.tw>",
      to: [to],
      subject: `您有一份文件待簽核 - ${documentTitle}`,
      react: DocumentNotificationEmail({
        signerName: actualSignerName,
        documentTitle,
        documentUrl,
        creatorName,
      }),
    });

    if (error) {
      console.error("Failed to send email:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error("Error sending email:", error);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}
