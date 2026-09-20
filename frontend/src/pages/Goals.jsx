import React from "react";
import { Target } from "lucide-react";
import { PageHeader } from "../components/ui";
import CrudManager from "../components/CrudManager";
import { inr } from "../lib/format";

export default function Goals() {
  const fields = [{ key:"name", label:"Goal", required:true, placeholder:"Emergency fund / family holiday" }, { key:"target_amount", label:"Target amount", type:"money", required:true }, { key:"current_amount", label:"Already saved", type:"money", default:0 }, { key:"target_date", label:"Target date", type:"date" }, { key:"priority", label:"Priority", type:"select", options:["Essential","Important","Wish"], default:"Important" }, { key:"notes", label:"Why this matters", type:"textarea", full:true }];
  const columns = [{ key:"name", label:"Goal", render:r=><div><div className="font-semibold text-ink">{r.name}</div><div className="text-xs text-faint">{r.target_date || "No target date"}</div></div> }, { key:"target_amount", label:"Progress", render:r=>{ const pct=Math.min(100, Math.round((Number(r.current_amount||0)/Number(r.target_amount||1))*100)); return <div className="min-w-[150px]"><div className="flex justify-between text-xs mb-1"><span>{inr(r.current_amount,{compact:true})}</span><span>{pct}%</span></div><div className="h-2 rounded-full bg-teal-100 overflow-hidden"><div className="h-full bg-brand rounded-full" style={{width:`${pct}%`}}/></div></div> } }, {key:"target_amount",label:"Target",type:"money"}, {key:"priority",label:"Priority"}];
  return <><PageHeader title="Goals" subtitle="Give every important plan a target, a date and a clear next step." icon={Target}/><CrudManager title="Your goals" endpoint="/goals" addLabel="Create goal" fields={fields} columns={columns}/></>;
}
