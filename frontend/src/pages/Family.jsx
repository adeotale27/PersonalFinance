import React from "react";
import { Users } from "lucide-react";
import { PageHeader, Badge } from "../components/ui";
import CrudManager from "../components/CrudManager";

export default function Family() {
  const fields = [
    { key: "name", label: "Name", required: true, full: true },
    { key: "relation", label: "Relation", type: "select", options: ["Self", "Spouse", "Parent", "Child", "Sibling", "Other"], default: "Spouse", required: true },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "notes", label: "Notes", type: "textarea", full: true },
  ];
  const columns = [
    { key: "name", label: "Name", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: "relation", label: "Relation", render: (r) => <Badge tone="brand">{r.relation}</Badge> },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
  ];
  return (
    <>
      <PageHeader title="Family Members" subtitle="People whose finances you track. Grant them access in Access Control." icon={Users} />
      <CrudManager title="Family Members" endpoint="/family" addLabel="Add member" fields={fields} columns={columns} />
    </>
  );
}
