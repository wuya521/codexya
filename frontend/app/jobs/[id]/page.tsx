import { AnalysisJobProgress } from "@/components/analysis-job-progress";

export const dynamic = "force-dynamic";

type AnalysisJobPageProps = {
  params: {
    id: string;
  };
};

export default function AnalysisJobPage({ params }: AnalysisJobPageProps) {
  return <AnalysisJobProgress jobId={params.id} />;
}
