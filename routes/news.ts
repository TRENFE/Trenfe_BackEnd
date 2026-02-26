import express, { Request, Response } from "express";
import { News } from "../DB/news.ts";
import { NewsType } from "../types.ts";
import { clearCache, getCache, setCache } from "../cache.ts";

const router = express.Router();


router.get("/", async (_req: Request, res: Response) => {
  try {
    const cached = getCache("news:all");
    if (cached) return res.status(200).json(cached);
    const news: NewsType[] = await News.find().select("-__v -_id");
    setCache("news:all", news, 60);
    res.status(200).json(news);
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/:newid", async (req: Request, res: Response) => {
  try {
    const newid = req.params.newid;
    if (!newid) {
      return res.status(400).json({ error: "Missing params" });
    }
    const cached = getCache(`news:${newid}`);
    if (cached) return res.status(200).json(cached);
    const uniquenew: NewsType | null = await News.findOne({ newid }).select(
      "-__v -_id",
    );
    if (!uniquenew) {
      return res.status(404).json({ error: "Not found" });
    }
    setCache(`news:${newid}`, uniquenew, 60);
    res.status(200).json(uniquenew);
  } catch (err: Error | any) {
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
    if (
      req.body.newid == null || req.body.title == null ||
      req.body.content == null || req.body.date == null
    ) {
      return res.status(400).json({ error: "Missing params" });
    }
    const news = new News({
      newid: req.body.newid,
      image: req.body.image || "",
      title: req.body.title,
      content: req.body.content,
      date: req.body.date,
    });
    await news.save();
    clearCache("news:all");
    setCache(`news:${news.newid}`, news, 60);
    res.status(200).json({ success: "OK", newid: news.newid });
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.put("/", async (req: Request, res: Response) => {
  try {
    if (
      req.headers.authorization == null ||
      req.headers.authorization !== `${Deno.env.get("ADMIN_TOKEN")}`
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.body.newid == null) {
      return res.status(400).json({ error: "Missing params" });
    }
    const newid = req.body.newid;
    const updatedNew = await News.updateOne({ newid }, {
      $set: {
        image: req.body.image,
        content: req.body.content,
        title: req.body.title,
        date: req.body.date,
      },
    });
    if (updatedNew) {
      const uniquenew: NewsType | null = await News.findOne({ newid });
      setCache(`news:${newid}`, uniquenew, 60);
      clearCache("news:all");
      return res.status(200).json({ success: "OK", newid: newid });
    }
    res.status(404).json({ error: "Not found" });
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.delete("/:newid", async (req: Request, res: Response) => {
  try {
    if (
      req.headers.authorization == null ||
      req.headers.authorization !== `${Deno.env.get("ADMIN_TOKEN")}`
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const newid = req.params.newid;
    if (newid == null) {
      return res.status(400).json({ error: "Missing params" });
    }
    const deletedNew = await News.deleteOne({ newid });
    if (deletedNew) {
      clearCache(`news:${newid}`);
      return res.status(200).json({ success: "OK", newid: newid });
    }
    res.status(404).json({ error: "Not Found" });
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
