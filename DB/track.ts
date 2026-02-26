import mongoose from "mongoose";

const TrackingSchema = new mongoose.Schema({
  ticketid: { type: String, required: true, unique: true },
  name:    { type: String, required: true },
  reverse: { type: Boolean, default: true },
  OriginX: { type: Number, required: true },
  OriginY: { type: Number, required: true },
  DestinationX: { type: Number, required: true },
  DestinationY: { type: Number, required: true },
  ActualX: { type: Number, required: true },
  ActualY: { type: Number, required: true },
  speed: { type: Number, default: 0.05 },
});

export const Tracking = mongoose.model("Tracking", TrackingSchema);