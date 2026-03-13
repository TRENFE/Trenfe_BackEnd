/*
----------------------------------------------------------
Auxiliary functions for backend operations
----------------------------------------------------------
*/

import { Tracking } from "./DB/track.ts";
import { clearCache } from "./cache.ts";
import { TrackingType } from "./types.ts";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import { User } from "./DB/user.ts";
import { Ticket } from "./DB/tickets.ts";
import { TicketType, UserType,TicketEmailData } from "./types.ts";

//Check if train is near Destination
function nearDestination(train: TrackingType): boolean {
  return (
    Math.abs(train.ActualX - train.DestinationX) < train.speed &&
    Math.abs(train.ActualY - train.DestinationY) < train.speed
  );
}

// Update train positions
export const updateTrainPositions = async () => {
  try {
    const trains = await Tracking.find();

    for (const train of trains) {
      if (nearDestination(train)) {
        if (train.reverse) {
          const tmpX = train.DestinationX;
          const tmpY = train.DestinationY;
          train.DestinationX = train.OriginX;
          train.DestinationY = train.OriginY;
          train.OriginX = tmpX;
          train.OriginY = tmpY;
        } else {
          train.ActualX = train.OriginX;
          train.ActualY = train.OriginY;
        }
      } else {
        train.ActualX += train.speed * (train.DestinationX - train.OriginX);
        train.ActualY += train.speed * (train.DestinationY - train.OriginY);
      }
      await train.save();
      clearCache(`track:${train.ticketid}`);
    }

    clearCache("track:all");
    console.log(`Posiciones actualizadas: ${trains.length} trenes procesados.`);
  } catch (_err: Error | unknown) {
    console.error("Error updating train positions:");
  }
};

//AI API for Chatbot
export const sendAIPrompt = async (prompt: string): Promise<string> => {
  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_API_KEY no encontrada.");
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  const headers = {
    "Content-Type": "application/json",
    "X-goog-api-key": apiKey,
  };

  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{
          text:
            `Generate a query intention for: ${prompt}, need to follow this format `,
        }],
      },
    ],
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error en API Gemini: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
};



const generateQRBase64 = async (data: string): Promise<string | null> => {
  try {
    const qr = await QRCode.toBuffer(data, {
      width: 300,          
      margin: 3,
      errorCorrectionLevel: "H",
      color: {
        dark: "#1f0197",
        light: "#FFFFFF",
      },
    });
    return qr;
  } catch (err: Error | unknown) {
    console.log(err);
    return null;
  }
};

const buildTicketEmailHTML = (data: TicketEmailData): string | null => {
  const fechaFormateada = new Date(data.date).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Tu billete TRENFE</title>
</head>
<body style="margin:0;padding:0;background-color:#1a2a5e;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2a5e;padding:32px 16px;">
  <tr><td align="center">
  <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">

    <!-- HEADER -->
    <tr>
      <td style="background:#0d1f4f;padding:28px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <div style="color:#fff;font-size:30px;font-weight:900;letter-spacing:6px;">TRENFE</div>
              <div style="color:#a0b4e8;font-size:11px;letter-spacing:3px;margin-top:2px;">SISTEMA FERROVIARIO NACIONAL</div>
              <div style="margin-top:14px;">
                <span style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);color:#c8d8ff;font-size:11px;padding:4px 12px;border-radius:20px;letter-spacing:1px;">
                  BILLETE ELECTRÓNICO
                </span>
              </div>
            </td>
          </tr>
        </table>
        <!-- franja dorada -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
          <tr>
            <td style="height:4px;background:repeating-linear-gradient(90deg,#FFD700 0,#FFD700 20px,#1a3a8f 20px,#1a3a8f 28px);"></td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- RUTA HERO -->
    <tr>
      <td style="background:#1a3a8f;padding:20px 32px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#fff;font-size:22px;font-weight:700;">${
    data.origen ?? "Origen"
  }</td>
            <td align="center" style="color:#FFD700;font-size:18px;">&#8212;&#9658;&#8212;</td>
            <td style="color:#fff;font-size:22px;font-weight:700;text-align:right;">${
    data.destino ?? "Destino"
  }</td>
          </tr>
          <tr>
            <td colspan="3" style="color:#a0c4ff;font-size:12px;letter-spacing:1px;padding-top:6px;">AVE · Alta Velocidad Española · Clase Turista</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td style="padding:24px 32px;">
        <p style="font-size:15px;color:#333;margin:0 0 16px;">
          ¡Hola, <strong style="color:#0d1f4f;">${data.name}</strong>!
          Tu compra se ha procesado correctamente. Adjuntamos tu billete electrónico.
        </p>

        <hr style="border:none;border-top:2px dashed #c5d0e8;margin:0 0 20px;">

        <!-- DETALLES + QR -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <!-- Columna izquierda -->
            <td valign="top" style="width:60%;padding-right:20px;">
              <div style="font-size:10px;color:#7a8ab0;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;">Descripción</div>
              <div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:14px;">AVE directo sin paradas. Acceso a WiFi y servicio de cafetería incluido en el trayecto.</div>

              <div style="font-size:10px;color:#7a8ab0;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;">Fecha y hora</div>
              <div style="font-size:14px;color:#1a2a5e;font-weight:700;margin-bottom:14px;">${fechaFormateada} · 10:30h </div>

              <div style="font-size:10px;color:#7a8ab0;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;">Importe pagado</div>
              <div style="font-size:20px;color:#1a6e2e;font-weight:700;margin-bottom:14px;">${data.price} euros</div>

              <div style="font-size:10px;color:#7a8ab0;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;">Nº de reserva</div>
              <span style="font-family:monospace;background:#eef1f9;padding:5px 10px;border-radius:6px;font-size:12px;color:#1a2a5e;">${data.uniqueID}</span>
            </td>

            <!-- Columna QR -->
            <td valign="top" align="center" style="width:40%;">
              <div style="font-size:10px;color:#7a8ab0;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;text-align:center;">Código QR</div>
              <div style="border:3px solid #1a3a8f;border-radius:8px;padding:8px;display:inline-block;">
                <img src="cid:qrcode" alt="QR" width="200" height="200" style="display:block;">
              </div>
              <p style="font-size:10px;color:#7a8ab0;margin-top:8px;text-align:center;line-height:1.4;">
                Muestra al revisor<br>en el tren
              </p>
            </td>
          </tr>
        </table>

        <!-- AVISO -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
          <tr>
            <td style="background:#eef2ff;border-left:4px solid #1a3a8f;border-radius:0 8px 8px 0;padding:12px 16px;">
              <p style="font-size:12px;color:#3a4a7e;line-height:1.6;margin:0;">
                Este billete es personal e intransferible. Preséntalo junto con un documento de identidad válido.
                TRENFE no se responsabiliza del uso fraudulento de este billete.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FOOTER franja -->
    <tr>
      <td style="height:4px;background:repeating-linear-gradient(90deg,#FFD700 0,#FFD700 20px,#1a3a8f 20px,#1a3a8f 28px);"></td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background:#0d1f4f;padding:20px 32px;text-align:center;">
        <p style="color:#a0b4e8;font-size:11px;line-height:1.8;margin:0;">
          © 2026 TRENFE · Sistema Ferroviario Nacional<br>
          Este es un mensaje automático, por favor no respondas a este email.
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>

</body>
</html>`;
}

const generateEmailData = (
  user: UserType,
  ticket: TicketType,
  quantity: number,
  uniqueId : string,
  qr:any
): string | null => {
  try {
    const price = parseFloat(ticket.price);
    const moneyPaid = price * quantity;
    const uniqueTicketData: TicketEmailData = {
      email: user.email,
      name: user.name || "",
      userid:user.userid,
      ticketid: ticket.ticketid,
      date: ticket.date,
      price: moneyPaid,
      origen: ticket.origin,
      destino: ticket.destination,
      uniqueID: uniqueId,
    };
    const email_html = buildTicketEmailHTML(uniqueTicketData);
    return email_html
  } catch (err: Error | unknown) {
    console.log(err)
    return null;
  }
};

export const sendEmail = async (userid:string,ticketid:string,quantity:number) : Promise<boolean> => {
  try{
  const uniqueId = `${ticketid}-${Date.now()}`;
  const userInfo = await User.findOne({userid:userid})
  const tickeInfo = await Ticket.findOne({ticketid:ticketid})
  if(!userInfo || !tickeInfo ){return false}
  const qrCode = await generateQRBase64(uniqueId);
    if(!qrCode) return false
  const html =  generateEmailData(userInfo,tickeInfo,quantity,uniqueId,qrCode)
  if (!html) { return false; }
  const nodemailerBuilder = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: Deno.env.get("SMTP_EMAIL"),
      pass: Deno.env.get("SMTP_PASSWORD"),
    },
  });
  await nodemailerBuilder.sendMail({
    from: `"TRENFE 🚂" <${Deno.env.get("SMTP_EMAIL")}>`,
    to: userInfo.email,
    subject: `🎫 Tu billete TRENFE — ${uniqueId}`,
    html,
    attachments: [
        {
          filename: "qr.png",
          content: qrCode,
          cid: "qrcode",
        },
      ],
  });
  return true
}catch(err:Error | unknown){
  console.log(err)
  return false
}
}