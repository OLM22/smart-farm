import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

export interface DataItem {
  id: string;
  label: string;
  value: number;
  color: string;
  avg_cell_size?: number; // Average cell size in μm
  density_estimate?: number; // Cell density in cells/mL or cells/image
  dominant_color?: string; // Dominant color in the image
}

export interface DonutChartProps {
  title?: string;
  data: DataItem[];
  centerText?: string;
  centerSubText?: string;
  height?: string | number;
  onToggleItem?: (id: string, newState: boolean) => void;
  visibleItems?: string[];
  avgCellSize?: number;
  densityEstimate?: number;
  dominantColor?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({
  title = "Chart",
  data,
  centerText,
  centerSubText = "Total Cells",
  height = "18rem",
  onToggleItem,
  visibleItems,
  avgCellSize,
  densityEstimate,
  dominantColor,
}) => {
  // Filter data based on visible items
  const filteredData = React.useMemo(() => {
    return visibleItems
      ? data.filter((item) => visibleItems.includes(item.id))
      : data;
  }, [data, visibleItems]);

  // Calculate the total value from the filtered data
  const totalValue = React.useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.value, 0);
  }, [filteredData]);

  // The centerText should always show the total value unless overridden
  const displayCenterText = centerText || totalValue.toLocaleString();

  // Prepare chart data
  const chartData = React.useMemo(
    () => ({
      labels: filteredData.map((item) => item.label),
      datasets: [
        {
          data: filteredData.map((item) => item.value),
          backgroundColor: filteredData.map((item) => item.color),
          borderWidth: 0,
          cutout: "75%",
        },
      ],
    }),
    [filteredData]
  );

  // Add a unique key based on visible items to force chart to redraw
  const chartKey = React.useMemo(
    () => JSON.stringify(visibleItems),
    [visibleItems]
  );

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "white",
        titleColor: "#111827", // gray-900
        bodyColor: "#374151", // gray-700
        borderColor: "#E5E7EB", // gray-200
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context: any) {
            const value = context.raw;
            const percentage = Math.round((value / (totalValue || 1)) * 100);
            return `${
              context.label
            }: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Custom center text plugin
  const textCenter = {
    id: "textCenter",
    beforeDraw: function (chart: any) {
      if (displayCenterText === undefined) return;

      const ctx = chart.ctx;
      const width = chart.width;
      const height = chart.height;

      const fontSize = parseFloat((height / 200).toFixed(2));
      ctx.font = `bold ${fontSize}em sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      // If no items are selected, display 0
      const text = filteredData.length > 0 ? displayCenterText : "0";
      const textX = width / 2;
      const textY = height / 2 - 10;

      ctx.fillStyle = "#1e293b"; // slate-800
      ctx.fillText(text, textX, textY);

      // Add sub text
      if (centerSubText) {
        ctx.font = `${fontSize * 0.5}em sans-serif`;
        ctx.fillStyle = "#94a3b8"; // slate-400
        const subText = centerSubText;
        const subTextX = width / 2;
        const subTextY = height / 2 + 20;
        ctx.fillText(subText, subTextX, subTextY);
      }
    },
  };

  // Calculate percentages
  const getPercentage = (value: number) => {
    return `${Math.round((value / (totalValue || 1)) * 100)}%`;
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100 p-4 md:p-6">
      {/* Header */}
      {title && (
        <div className="flex justify-between mb-3">
          <div className="flex items-center">
            <h5 className="text-xl font-bold leading-none text-gray-900 pe-1">
              {title}
            </h5>
          </div>
        </div>
      )}

      {/* Filters */}
      {onToggleItem && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-4">
            {data.map((item) => (
              <div className="flex items-center" key={item.id}>
                <input
                  id={item.id}
                  type="checkbox"
                  checked={visibleItems ? visibleItems.includes(item.id) : true}
                  onChange={(e) => onToggleItem(item.id, e.target.checked)}
                  className="w-4 h-4 border-gray-300 rounded"
                  style={{ color: item.color }}
                />
                <label
                  htmlFor={item.id}
                  className="ms-2 text-sm font-medium text-gray-700"
                >
                  {item.label} ({item.value})
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ height }} className="w-full">
        <Doughnut
          key={chartKey}
          data={chartData}
          options={options}
          plugins={[textCenter]}
        />
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-6">
        {filteredData.map((item) => (
          <div className="flex items-center" key={item.id}>
            <span
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: item.color }}
            ></span>
            <span className="text-sm text-gray-600">
              {item.label} ({getPercentage(item.value)})
            </span>
          </div>
        ))}
      </div>

      {/* Overall Statistics */}
      {(avgCellSize || densityEstimate || dominantColor) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h6 className="text-sm font-semibold text-gray-700 mb-3">
            Overall Cell Statistics
          </h6>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {avgCellSize && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {avgCellSize.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Average Size (μm)</div>
              </div>
            )}
            {densityEstimate && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {densityEstimate.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Density (cells/mL)</div>
              </div>
            )}
            {dominantColor && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {dominantColor}
                </div>
                <div className="text-sm text-gray-500">Dominant Color</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DonutChart;
