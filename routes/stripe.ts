import Stripe from "stripe";
import express, { Request, Response } from "express";
import { User } from "../DB/user.ts";
import {verifyJWT} from "../auth.ts"

const router = express.Router();

const stripe = new Stripe(Deno.env.get("STRIPE_PRIVATE_KEY")!);

router.post("/create", async (req: Request, res: Response) => {
  try {
    const isUser = await verifyJWT(req.cookies.bearer);
    if(isUser==null){return res.status(404).json({ error: "User Token Not Valid" })};
    const userID = isUser.userid;
    const userExists = await User.findOne({userid : userID})
    if(!userExists){return res.status(404).json({ error: "User Token Not Valid" })}
    const { amount, name, quantity, id } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: name,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: `https://renfe-frontend.sergioom9.deno.net/tickets/success/${btoa(id)}`,
      cancel_url: `https://renfe-frontend.sergioom9.deno.net/tickets/fail/${btoa(id)}`,
    });
    return res.status(200).json({Payment_url:session.url})
  } catch (err: Error | unknown) {
    console.log(err)
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router