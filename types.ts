export type UserType = {
  userid: string;
  name: string;
  email: string;
  password: string;
  coins: string;
  intentos: number;
};

export type TicketType = {
  ticketid: string;
  origin: string;
  destination: string;
  date: string;
  price: string;
  available: number;
};

export type NewsType = {
  newid: string;
  title: string;
  image?: string;
  content: string;
  date: string;
};

export type TrackingType = {
  ticketid: string;
  name: string;
  reverse: boolean;
  OriginX: number;
  OriginY: number;
  DestinationX: number;
  DestinationY: number;
  ActualX: number;
  ActualY: number;
  speed: number;
};

export type TicketEmailData = {
  email: string;
  userid:string;
  name: string;
  ticketid: string;
  date: string;
  price: number;
  origen: string;
  destino: string;
  uniqueID: string;
};