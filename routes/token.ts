import express, { Request, Response } from "express";
import { User } from "../DB/user.ts";
import { UserType } from "../types.ts";
import { checkAuth,getuserJWT } from "../auth.ts";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
    try {
        if(req.body.bearer==null || req.body.email==null){
            return res.status(400).json({ error: "Missing params" });
        }
        const tkn=req.body.bearer;
        const email=req.body.email;
        const user : UserType | null = await User.findOne({ email });
        if(!user){return res.status(404).json({ error: "KO" });}
        const isAuth = await checkAuth(user.userid, tkn);
        if(!isAuth){return res.status(401).json({ error: "Bearer corrupted" });}
        res.set({
         "Set-Cookie": `bearer=${tkn}; Secure; Path=/; SameSite=Strict`,
         "Content-Type": "application/json",
          }).status(200).json({success:"OK",bearer:tkn});
        } catch (err: Error | any) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/user", async (req: Request, res: Response) => {
    try {
        if(req.body.bearer==null){
            return res.status(400).json({ error: "Missing params" });
        }
        const tkn=req.body.bearer;
        const userid = await getuserJWT(tkn);
        const user : UserType | null = await User.findOne({ userid });
        if(!user){return res.status(404).json({ error: "Not Found" });}
        res.set({
         "Set-Cookie": `bearer=${tkn}; Secure; Path=/; SameSite=Strict`,
         "Content-Type": "application/json",
          }).status(200).json({userid:user.userid,email:user.email,coins:user.coins,name:user.name});
        } catch (err: Error | any) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;