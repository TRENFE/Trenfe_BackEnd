import express, { Request, Response } from "express";
import { Ticket } from "../DB/tickets.ts";
import { TicketType } from "../types.ts";
import { User } from "../DB/user.ts";
import { checkAuth } from "../auth.ts";
import { clearCache, getCache, setCache } from "../cache.ts";

const router = express.Router();


router.get("/", async (_req: Request, res: Response) => {
  try {
    const cached = getCache("tickets:all");
    if (cached) return res.status(200).json(cached);
    const tickets: TicketType[] = await Ticket.find().select("-__v -_id");
    setCache("tickets:all", tickets, 60);
    res.status(200).json(tickets);
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error : " + err.message });
  }
});


router.get("/:ticketid", async (req: Request, res: Response) => {
  try {
    const ticketid = req.params.ticketid;
    if (!ticketid) {
      return res.status(400).json({ error: "Missing params" });
    }
    const cached = getCache(`tickets:${ticketid}`);
    if (cached) return res.status(200).json(cached);
    const ticket: TicketType | null = await Ticket.findOne({ ticketid }).select(
      "-__v -_id",
    );
    if (!ticket) {
      return res.status(404).json({ error: "Not Found" });
    }
    setCache(`tickets:${ticketid}`, ticket, 60);
    res.status(200).json(ticket);
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error : " + err.message });
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
      req.body.ticketid == null || req.body.origin == null ||
      req.body.destination == null || req.body.date == null ||
      req.body.price == null
    ) {
      return res.status(400).json({ error: "Missing params" });
    }
    const ticket = new Ticket({
      ticketid: req.body.ticketid,
      origin: req.body.origin,
      destination: req.body.destination,
      date: req.body.date,
      price: req.body.price,
      available: req.body.available || 1,
    });
    await ticket.save();
    clearCache("tickets:all");
    setCache(`tickets:${ticket.ticketid}`, ticket, 60);
    const createTracking = await fetch("http://localhost:3000/track/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `${Deno.env.get("ADMIN_TOKEN")}`,
      },
      body: JSON.stringify({
        ticketid: req.body.ticketid,
        origin: req.body.origin,
        destination: req.body.destination,
      }),
    });
    if (!createTracking.ok) {
      return res.status(409).json({ error: "Tracking creation failed" });
    }
    res.status(200).json({ success: "OK", ticketid: ticket.ticketid });
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error : " + err.message });
  }
});


router.post("/sell", async (req: Request, res: Response) => {
  try {
    if (req.body.ticketid == null || req.body.userid == null) {
      return res.status(400).json({ error: "Missing params" });
    }
    const ticketid = req.body.ticketid;
    const userid = req.body.userid;
    const isAuth = await checkAuth(userid, req.cookies.bearer);
    if (
      !isAuth &&
      (req.headers.authorization == null ||
        req.headers.authorization !== `${Deno.env.get("ADMIN_TOKEN")}`)
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const ticket = await Ticket.findOne({ ticketid });
    const user = await User.findOne({ userid });
    const quantity = req.body.quantity || 1;
    if (!ticket || !user || ticket.available < quantity) {
      return res.status(404).json({ error: "Not found" });
    }
    if (ticket.available === quantity) {
      const deleteTracking = await fetch(
        "http://localhost:3000/track/" + ticketid,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `${Deno.env.get("ADMIN_TOKEN")}`,
          },
        },
      );
      if (!deleteTracking.ok) {
        res.status(409).json({ error: "Tracking deletion failed" });
      }
      ticket.available = ticket.available - quantity;
      const coinsGained = (parseInt(ticket.price) / 10 * quantity).toString();
      user.coins = (parseInt(user.coins) + parseInt(coinsGained)).toString();
      await ticket.save();
      await user.save();
      res.status(200).json({
        success: "OK",
        ticketid: ticket.ticketid,
        userid: user.userid,
        quantity: quantity,
        coinsGained: coinsGained,
      });
      clearCache(`tickets:${ticket.ticketid}`);
      clearCache("tickets:all");
      return;
    }
    ticket.available = ticket.available - quantity;
    const coinsGained = (parseInt(ticket.price) / 10 * quantity).toString();
    user.coins = (parseInt(user.coins) + parseInt(coinsGained)).toString();
    await ticket.save();
    await user.save();
    clearCache("tickets:all");
    setCache(`tickets:${ticketid}`, ticket, 60);
    res.status(200).json({
      success: "OK",
      ticketid: ticket.ticketid,
      userid: user.userid,
      quantity: quantity,
      coinsGained: coinsGained,
    });
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error :" + err.message });
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
    if (
      req.body.ticketid == null || req.body.origin == null ||
      req.body.destination == null || req.body.date == null ||
      req.body.price == null
    ) {
      return res.status(400).json({ error: "Missing params" });
    }
    const ticket: TicketType | null = await Ticket.findOne({
      ticketid: req.body.ticketid,
    });
    if (!ticket) {
      return res.status(404).json({ error: "Not found" });
    }
    await Ticket.updateOne({ ticketid: req.body.ticketid }, {
      $set: {
        origin: req.body.origin || ticket.origin,
        destination: req.body.destination || ticket.destination,
        date: req.body.date || ticket.date,
        price: req.body.price || ticket.price,
        available: req.body.available || ticket.available,
      },
    });
    setCache(`tickets:${req.body.ticketid}`, { ...ticket, ...req.body }, 60);
    clearCache("tickets:all");
    res.status(200).json({ success: "OK", ticketid: req.body.ticketid });
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error : " + err.message });
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
    const ticketid = req.params.ticketid;
    if (!ticketid) {
      return res.status(400).json({ error: "Missing params" });
    }
    const ticket: TicketType | null = await Ticket.findOne({ ticketid });
    if (!ticket) {
      return res.status(404).json({ error: "Not found" });
    }
    await Ticket.deleteOne({ ticketid });
    clearCache(`tickets:${ticketid}`);
    clearCache("tickets:all");
    res.status(200).json({ success: "OK", ticketid: ticketid });
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error :" + err.message });
  }
});

export default router;
