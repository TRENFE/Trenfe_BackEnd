import mongoose from "mongoose";

export const userSchema = new mongoose.Schema({
  userid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  coins: { type: String, required: true, default: "0"},
  intentos: { type: Number, required: true, default: 3 },
});

export const User = mongoose.model("User", userSchema);
