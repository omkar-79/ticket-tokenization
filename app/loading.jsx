import { CardSkeleton } from "./components/ui/Skeleton.jsx";
import PageTransition from "./components/layout/PageTransition.jsx";

export default function Loading() {
  return (
    <PageTransition>
      <CardSkeleton />
    </PageTransition>
  );
}
