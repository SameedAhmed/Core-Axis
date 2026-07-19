import { SquareClient, SquareEnvironment } from "square";

const isProduction = process.env.NODE_ENV === "production";

export const square = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || "",
  environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});
