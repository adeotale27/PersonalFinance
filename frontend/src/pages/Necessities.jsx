import React from "react";
import { CarFront } from "lucide-react";
import { PageHeader } from "../components/ui";
import CrudManager from "../components/CrudManager";

export default function Necessities() {
  const fields = [
    { key: "name", label: "Item", placeholder: "Family car / daily bike", required: true },
    { key: "type", label: "Type", type: "select", options: ["Car", "Bike", "Home-use item", "Other necessity"], default: "Car" },
    { key: "owner", label: "Owner" }, { key: "registration", label: "Registration / identifier" },
    { key: "purchase_date", label: "Purchase date", type: "date" }, { key: "notes", label: "Notes", type: "textarea", full: true },
  ];
  return <><PageHeader title="Personal necessities" subtitle="Cars, bikes and essential possessions — kept separate from assets and liabilities." icon={CarFront}/><CrudManager title="Essential items" endpoint="/necessities" addLabel="Add necessity" fields={fields} columns={[{key:"name",label:"Item"},{key:"type",label:"Type"},{key:"owner",label:"Owner"},{key:"registration",label:"Identifier"}]} /></>;
}
