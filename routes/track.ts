import express, { Request, Response } from "express";
import { Tracking } from "../DB/track.ts";
import { TrackingType } from "../types.ts";
import { clearCache, getCache, setCache } from "../cache.ts";
import { safeCityName, safeId } from "../security.ts";

const router = express.Router();

router.get("/:ticketid", async (req: Request, res: Response) => {
  try {
    const ticketid = safeId(req.params.ticketid);
    if (!ticketid) {
      return res.status(400).json({ error: "Invalid ticketid" });
    }
    const cached = getCache(`track:${ticketid}`);
    if (cached) return res.status(200).json(cached);

    const train: TrackingType | null = await Tracking.findOne({ ticketid })
      .select("-__v -_id");
    if (!train) {
      return res.status(404).json({ error: "Train not found" });
    }
    setCache(`track:${ticketid}`, train, 60);
    res.status(200).json(train);
  } catch (_err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:ticketid", async (req: Request, res: Response) => {
  try {
    if (
      req.headers.authorization == null ||
      req.headers.authorization !== `${Deno.env.get("ADMIN_TOKEN")}`
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ticketid = safeId(req.params.ticketid);
    if (!ticketid) {
      return res.status(400).json({ error: "Invalid ticketid" });
    }

    const train = await Tracking.deleteOne({ ticketid });
    if (!train.deletedCount) {
      return res.status(404).json({ error: "Train not deleted" });
    }
    clearCache(`track:${ticketid}`);
    res.status(200).json(train);
  } catch (_err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/create", async (req: Request, res: Response) => {
  try {
    if (
      req.headers.authorization == null ||
      req.headers.authorization !== `${Deno.env.get("ADMIN_TOKEN")}`
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ticketid = safeId(req.body.ticketid);
    const origin = safeCityName(req.body.origin);
    const destination = safeCityName(req.body.destination);

    if (!ticketid || !origin || !destination) {
      return res.status(400).json({ error: "Invalid params" });
    }

    const auxOrigin = encodeURIComponent(origin);
    const auxDestination = encodeURIComponent(destination);

    const OriginData = await fetch(
      `https://api.api-ninjas.com/v1/city?name=${auxOrigin}`,
      {
        headers: {
          "X-Api-Key": Deno.env.get("API_NINJAS_API_KEY") || "",
        },
      },
    );
    if (!OriginData.ok) {
      return res.status(502).json({ error: "Upstream origin lookup failed" });
    }
    const OriginJson = await OriginData.json();

    const DestinationData = await fetch(
      `https://api.api-ninjas.com/v1/city?name=${auxDestination}`,
      {
        headers: {
          "X-Api-Key": Deno.env.get("API_NINJAS_API_KEY") || "",
        },
      },
    );
    if (!DestinationData.ok) {
      return res
        .status(502)
        .json({ error: "Upstream destination lookup failed" });
    }
    const DestinationJson = await DestinationData.json();

    if (!OriginJson.length || !DestinationJson.length) {
      return res.status(400).json({ error: "Invalid origin or destination" });
    }

    const newTrain = new Tracking({
      ticketid,
      name: `${origin} - ${destination}`,
      OriginX: OriginJson[0].longitude,
      OriginY: OriginJson[0].latitude,
      DestinationX: DestinationJson[0].longitude,
      DestinationY: DestinationJson[0].latitude,
      ActualX: OriginJson[0].longitude,
      ActualY: OriginJson[0].latitude,
    });
    await newTrain.save();
    setCache(`track:${ticketid}`, newTrain, 60);
    res.status(201).json(newTrain);
  } catch (_err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
