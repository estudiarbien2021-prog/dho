import React from "react";
import ReactCountryFlag from "react-country-flag";
import { Globe } from "lucide-react";

export function FlagMini({ code, confed }:{code?:string; confed?:"UEFA"|"CONMEBOL"}) {
  if (confed){
    return (
      <Globe size={16} className="text-primary" />
    );
  }
  
  // Check if country is international
  if (code?.toLowerCase() === 'international') {
    return (
      <Globe size={16} className="text-primary" />
    );
  }
  
  if (!code) return null;
  return (
    <ReactCountryFlag
      svg
      countryCode={code}
      style={{ width: "16px", height: "12px", borderRadius: "2px" }}
      aria-label={code}
    />
  );
}