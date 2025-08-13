import React from "react";
import ReactCountryFlag from "react-country-flag";

export function FlagMini({ code, confed }:{code?:string; confed?:"UEFA"|"CONMEBOL"}) {
  if (confed){
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20">
        {confed}
      </span>
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