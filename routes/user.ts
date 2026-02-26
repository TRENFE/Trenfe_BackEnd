import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../DB/user.ts";
import {  UserType } from "../types.ts";
import { checkAuth } from "../auth.ts";

const router = express.Router();


router.get("/", async (req: Request, res: Response) => {
  try {
    if (
      req.headers.authorization == null ||
      req.headers.authorization !== `${Deno.env.get("ADMIN_TOKEN")}`
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const users: UserType[] = await User.find().select("-password -__v -_id");
    res.status(200).json(users);
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/:userid", async (req: Request, res: Response) => {
  try {
    const userid = req.params.userid;
    if (!userid) {
      return res.status(400).json({ error: "Missing params" });
    }
    const isAuth = await checkAuth(userid, req.cookies.bearer);
    if (
      !isAuth &&
      (req.headers.authorization == null ||
        req.headers.authorization !== `${Deno.env.get("ADMIN_TOKEN")}`)
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user: UserType | null = await User.findOne({ userid }).select(
      "-password -__v -_id",
    );
    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }
    res.status(200).json(user);
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.delete("/:userid", async (req: Request, res: Response) => {
  try {
    const userid = req.params.userid;
    if (!userid) {
      return res.status(400).json({ error: "Missing params" });
    }
    const isAuth = await checkAuth(userid, req.cookies.bearer);
    if (
      !isAuth &&
      (req.headers.authorization == null ||
        req.headers.authorization !== `${Deno.env.get("ADMIN_TOKEN")}`)
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const deletedUser = await User.deleteOne({ userid });
    if (deletedUser) {
      return res.status(200).json({ message: "User Deleted" });
    }
    res.status(404).json({ error: "Not found" });
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.put("/", async (req: Request, res: Response) => {
  try {
    const userid = req.body.userid;
    if (!userid) {
      return res.status(400).json({ error: "Missing params" });
    }
    const isAuth = await checkAuth(userid, req.cookies.bearer);
    if (
      !isAuth &&
      (req.headers.authorization == null ||
        req.headers.authorization !== `${Deno.env.get("ADMIN_TOKEN")}`)
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (
      req.body.userid == null || req.body.name == null ||
      req.body.email == null || req.body.password == null || req.body.coins == null
    ) {
      return res.status(400).json({ error: "Missing params" });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const useractual = await User.findOne({ userid: req.body.userid });
    if (!useractual) {
      return res.status(404).json({ error: "Not Found" });
    }
    const coins = req.body.coins ;
    await User.updateOne(
      { userid: req.body.userid },
      {
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        coins: coins,
      },
    );
    res.status(200).json({ message: "User Updated Succesfully" });
  } catch (err: Error | any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
