import React from "react";
import { FileText } from "lucide-react";
import { PageHeader } from "../components/ui";
import DocumentsPanel from "../components/DocumentsPanel";

export default function Documents() {
  return (
    <>
      <PageHeader title="Documents" subtitle="Secure vault for contracts, invoices, receipts and drawings." icon={FileText} />
      <DocumentsPanel title="All Documents" />
    </>
  );
}
