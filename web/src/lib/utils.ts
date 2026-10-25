import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const MEMBERSHIP_URL = "/membership";

export const images = {
  logo: "/disha-logo.png",
  about: "/gallery/mass-yoga.jpg",
};