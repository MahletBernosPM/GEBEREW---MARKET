import PriceBoard from "./priceBoard";
import SubmissionForm from "./SubmissionForm";
import OperatorQueue from "./OperatorQueue";

export default function App() {
  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <h1 className="text-2xl font-bold mb-6 text-stone-900">
        Geberew Market — Dev Preview
      </h1>

      <div className="flex gap-6 flex-wrap items-start">
        <SubmissionForm />
        <OperatorQueue />
      </div>

      <div className="mt-8 max-w-2xl [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-amber-700 [&_th]:pb-2 [&_td]:py-2 [&_td]:border-b [&_td]:border-stone-200 [&_th]:border-b [&_th]:border-stone-200 [&_td]:text-sm">
        <PriceBoard />
      </div>
    </div>
  );
}
