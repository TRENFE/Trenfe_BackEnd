/*
----------------------------------------------------------
Auxiliary functions for backend operations
----------------------------------------------------------
*/

import { Tracking } from "./DB/track.ts";
import { TrackingType } from "./types.ts";

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
    }

    console.log(`Posiciones actualizadas: ${trains.length} trenes procesados.`);
  } catch (err: Error | any) {
    console.error("Error updating train positions:", err);
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
