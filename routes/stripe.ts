import Stripe from "stripe";
import express, { Request, Response } from "express";
import { User } from "../DB/user.ts";
import { verifyJWT } from "../auth.ts";
import { Ticket } from "../DB/tickets.ts";

const router = express.Router();

const stripe = new Stripe(Deno.env.get("STRIPE_PRIVATE_KEY")!);

router.post("/create", async (req: Request, res: Response) => {
  try {
    const isUser = await verifyJWT(req.cookies.bearer);
    if (isUser == null) {
      return res.status(404).json({ error: "User Token Not Valid" });
    }
    const userID = isUser.userid;
    const userExists = await User.findOne({ userid: userID });
    if (!userExists) {
      return res.status(404).json({ error: "User Token Not Valid" });
    }
    const { amount, quantity, id } = req.body;
    const ticketID = atob(id)
    const ticketInfo = await Ticket.findOne({ticketid:ticketID})
    const finalPrice = ticketInfo?.price || amount
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `BILLETE ${ticketInfo?.origin} -> ${ticketInfo?.destination}`,
            },
            unit_amount: Math.round(finalPrice * 100),
          },
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: `https://renfe-frontend.sergioom9.deno.net/tickets/success/${
        btoa(ticketID)
      }`,
      cancel_url: `https://renfe-frontend.sergioom9.deno.net/tickets/fail/${
        btoa(ticketID)
      }`,
      metadata: {
      ticketid: ticketID,
      userid: userExists.userid,
      quantity: String(quantity),
    },
    });
    return res.status(200).json({ Payment_url: session.url });
  } catch (_err: Error | unknown) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/update", async (req: Request, res: Response) => {
  try {
    //const sig = req.headers["stripe-signature"] as string;
    //const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
      const data= await req.json();
      console.log(data)
      const PORT = Deno.env.get("PORT") ?? "3000";
      /*const internalRes = await fetch(`http://127.0.0.1:${PORT}/ticket/sell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": Deno.env.get("ADMIN_TOKEN")!,
        },
        body: JSON.stringify({
          userid,
          ticketid,
          quantity,
        }),
      });
      if (!internalRes.ok) {
        console.log("Failed updating DB");
        return res.status(400).json({ "error": "Webhook Error" });
      }
      return res.status(200).json({ success: "OK" });}*/
    return res.status(200).json({ success: "OK" });
  } catch (_err: Error | unknown) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
