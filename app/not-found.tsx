import { Compass } from "lucide-react";
import { PageState, PageStateLink } from "@/components/page-state";

export default function NotFound() {
  return (
    <PageState
      icon={<Compass className="h-5 w-5" />}
      title="This page isn't here"
      copy="The link may be mistyped, or the page was deleted by its creator. QR codes stop working the moment a page is removed."
    >
      <PageStateLink href="/create" label="Create your own page" />
    </PageState>
  );
}
