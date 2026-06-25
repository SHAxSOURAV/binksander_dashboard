import { HiArrowLongRight } from "react-icons/hi2";
import { trackingFlows } from "../../assets/mockData";

/**
 * Spaced tracking stepper — each status is its own pill in its own colour,
 * separated by a long arrow. Stays on a single line.
 * @param {"bol"|"amazon"|"rimco"} source - which pipeline to render.
 * @param {number} activeStep - index of the current (and previous) completed steps.
 */
const TrackingStepper = ({ source = "bol", activeStep = 1 }) => {
  const flow = trackingFlows[source] || trackingFlows.bol;

  return (
    <div className="flex items-center flex-nowrap w-full overflow-x-auto thin-scrollbar pb-1">
      {flow.steps.map((step, i) => {
        const active = i <= activeStep;
        const stepColor = flow.colors?.[i] || flow.color;
        return (
          <div key={i} className="flex items-center flex-shrink-0">
            <span
              className="inline-flex items-center justify-center text-[11px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors"
              style={{
                backgroundColor: active ? stepColor : "#F1F1F5",
                color: active ? "#fff" : "#9CA3AF",
              }}
            >
              {step}
            </span>

            {i < flow.steps.length - 1 && (
              <HiArrowLongRight
                size={22}
                className="mx-1.5 flex-shrink-0"
                style={{ color: i < activeStep ? "#374151" : "#CBD0DA" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TrackingStepper;
