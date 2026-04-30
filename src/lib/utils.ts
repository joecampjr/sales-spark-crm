import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskPhone(value: string) {
  if (!value) return "";
  let v = value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  
  if (v.length > 10) {
    // (11) 99999-9999
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  } else if (v.length > 6) {
    // (11) 9999-9999
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  } else if (v.length > 2) {
    // (11) 9999
    v = v.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
  } else if (v.length > 0) {
    // (11
    v = v.replace(/^(\d{0,2}).*/, "($1");
  }
  return v;
}
