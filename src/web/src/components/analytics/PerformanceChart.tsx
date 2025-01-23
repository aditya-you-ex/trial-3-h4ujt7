import React, {
  useEffect,          // react@^18.0.0
  useMemo,
  useCallback,
  useState,
  useRef
} from 'react';
import { Chart, registerables } from 'chart.js'; // chart.js@^4.4.0
import { useTheme, CircularProgress, Box } from '@mui/material'; // @mui/material@^5.14.0
import debounce from 'lodash/debounce'; // lodash@^4.17.21

// -----------------------------------------------------------------------------
// Internal Imports (with usage per IE1)
// -----------------------------------------------------------------------------
import { PerformanceMetric, MetricType } from '../../types/analytics.types';
import {
  CHART_TYPES,
  CHART_COLORS,
  CHART_SIZES,
  CHART_ANIMATIONS,
  TOOLTIP_CONFIG,
  LEGEND_CONFIG
} from '../../constants/chart.constants';
import { analyticsService } from '../../services/analytics.service';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

// -----------------------------------------------------------------------------
// Interface: PerformanceChartProps
// -----------------------------------------------------------------------------
// Defines the prop types for the PerformanceChart component, including chart
// dimensions, the array of metrics, chart type, real-time toggle, and error
// handling callback.
export interface PerformanceChartProps {
  /**
   * An array of performance metrics to be displayed in the chart.
   * Each metric includes type, value, threshold, trend, and label.
   */
  metrics: PerformanceMetric[];

  /**
   * The Chart.js visualization type (e.g., 'line', 'bar', 'pie', etc.).
   * Must correspond to supported chart types in chart.js or CHART_TYPES.
   */
  chartType: string;

  /**
   * Optional numeric height for the chart container (in pixels).
   * If not provided, a default size from CHART_SIZES may be used.
   */
  height?: number;

  /**
   * Optional numeric width for the chart container (in pixels).
   * If not provided, a default size from CHART_SIZES may be used.
   */
  width?: number;

  /**
   * Optional CSS class name for custom styling of the chart container.
   */
  className?: string;

  /**
   * Enables real-time updates if true; the component will subscribe to
   * data updates via analyticsService.subscribeToUpdates.
   */
  enableRealTime?: boolean;

  /**
   * Interval in milliseconds for refreshing or polling the chart data.
   * Useful if real-time push-based subscriptions are not available
   * or to force updates at a fixed frequency.
   */
  updateInterval?: number;

  /**
   * Optional callback invoked when an error occurs during data processing
   * or chart rendering. Receives the error object as a parameter.
   */
  onError?: (error: Error) => void;
}

// -----------------------------------------------------------------------------
// Chart Registration
// -----------------------------------------------------------------------------
// Chart.js requires registering its components (scales, controllers, etc.)
// to enable the charts. This should be done once in the application scope.
Chart.register(...registerables);

// -----------------------------------------------------------------------------
// Function: formatChartData
// -----------------------------------------------------------------------------
// Formats performance metrics into a Chart.js-compatible data object. It
// applies theming, metric thresholds, and trend-based styling if desired.
function formatChartData(
  metrics: PerformanceMetric[],
  theme: any
): {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill?: boolean;
    tension?: number;
  }>;
} {
  /*
   1) Validate the input metrics. If empty or invalid, fall back to a blank array.
   2) Extract labels from the 'label' property of each metric.
   3) Extract numeric values from the 'value' property for the dataset.
   4) Apply theme-based colors or chart constants for styling.
   5) Optionally incorporate threshold and trend info into styling or separate datasets.
   6) Return an object with 'labels' and 'datasets' for consumption by Chart.js.
  */
  if (!Array.isArray(metrics)) {
    return { labels: [], datasets: [] };
  }

  // Collect metric labels and values, ensuring graceful fallback.
  const labels = metrics.map((m) => m.label || '');
  const values = metrics.map((m) => (typeof m.value === 'number' ? m.value : 0));

  // Determine primary color from theme as a fallback if CHART_COLORS not used.
  const primaryColor =
    theme?.palette?.primary?.main || CHART_COLORS.PRIMARY || '#2563EB';

  // Build a single dataset representing all metric values.
  // You could add multiple datasets if needed for thresholds or trends.
  const dataset = {
    label: 'Performance Metrics',
    data: values,
    borderColor: primaryColor,
    backgroundColor: primaryColor,
    // Optionally enable area fill or tension for line charts:
    fill: false,
    tension: 0.1
  };

  return {
    labels,
    datasets: [dataset]
  };
}

// -----------------------------------------------------------------------------
// Function: getChartOptions
// -----------------------------------------------------------------------------
// Generates chart configuration options, merging default settings with
// theme-based styles, accessibility settings, and plugin configurations.
function getChartOptions(
  chartType: string,
  theme: any,
  customOptions: Record<string, unknown> = {}
): any {
  /*
   1) Merge any custom options with base defaults (responsive, maintain aspect ratio).
   2) Configure plugins like tooltip, legend, and possibly title or annotation.
   3) Incorporate theme direction for RTL if needed (theme.direction === 'rtl').
   4) Apply animation settings from CHART_ANIMATIONS.
   5) Return the final options object for Chart.js.
  */
  const direction = theme?.direction === 'rtl' ? 'rtl' : 'ltr';

  // Basic responsive, styling, and plugin defaults
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: CHART_ANIMATIONS,
    plugins: {
      tooltip: { ...TOOLTIP_CONFIG },
      legend: { ...LEGEND_CONFIG }
    },
    // Example scales config for line/bar. Could be extended for category or radial.
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Metrics'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Values'
        }
      }
    },
    // Interaction settings for accessibility or user experience
    interaction: {
      mode: 'index',
      intersect: false
    },
    // If using RTL languages, ensure chart is mirrored
    layout: {
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
      }
    },
    // Use direction for text alignment in potential RTL scenarios
    locale: theme?.palette?.mode || 'en-US',
    // Example direction usage
    indexAxis: chartType === CHART_TYPES.BAR ? 'x' : 'x',
    // Additional options or merges
    ...customOptions
  };

  // If theme direction is rtl, you may also modify options for mirrored scales
  if (direction === 'rtl') {
    defaultOptions.scales.x.reverse = true;
  }

  return defaultOptions;
}

// -----------------------------------------------------------------------------
// Function: handleResize
// -----------------------------------------------------------------------------
// Debounced resize handler for chart dimensions. This updates the chart
// width/height to maintain responsiveness in a controlled manner.
const handleResize = debounce(
  (chartInstance: Chart | null, width: number, height: number) => {
    /*
     1) Debounce calls to prevent continuous heavy computations on every resize.
     2) If chartInstance is available, update the chart's size directly.
     3) Force chart update to redraw with new dimensions.
    */
    if (chartInstance) {
      chartInstance.width = width;
      chartInstance.height = height;
      chartInstance.resize();
    }
  },
  200 // 200ms debounce delay; can be tuned as needed.
);

// -----------------------------------------------------------------------------
// Component: PerformanceChart
// -----------------------------------------------------------------------------
// A reusable React component for displaying performance metrics using Chart.js.
// It supports real-time data updates, error handling, and theme-based styling.
export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  metrics,
  chartType,
  height,
  width,
  className,
  enableRealTime = false,
  updateInterval,
  onError
}) => {
  /**
   * Reference to the canvas element where the chart is rendered.
   * Also store a Chart.js instance reference so we can update or destroy it.
   */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  // If we plan to adapt the metrics or do real-time updates, track them in state.
  // This allows us to re-render when new data arrives.
  const [localMetrics, setLocalMetrics] = useState<PerformanceMetric[]>(metrics);

  // For potential loading or error states
  const [loading, setLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<Error | null>(null);

  // Access the MUI theme for color and direction usage.
  const theme = useTheme();

  // Memoize the chart data based on localMetrics and theme, to avoid unnecessary recalculations.
  const chartData = useMemo(() => {
    /*
      This calls formatChartData to convert the metrics array into a
      structure that Chart.js can interpret. If an error occurs, we can
      gracefully catch it here and propagate via onError or fallback. 
    */
    try {
      return formatChartData(localMetrics, theme);
    } catch (error) {
      if (onError) onError(error as Error);
      setDataError(error as Error);
      return { labels: [], datasets: [] };
    }
  }, [localMetrics, theme, onError]);

  // Build chart options. If needed, pass custom logic or extra flags.
  const chartOptions = useMemo(() => {
    try {
      return getChartOptions(chartType, theme, {});
    } catch (error) {
      if (onError) onError(error as Error);
      setDataError(error as Error);
      return {};
    }
  }, [chartType, theme, onError]);

  // Initialize or update the Chart.js instance whenever chartData or chartOptions change.
  useEffect(() => {
    if (!canvasRef.current) return;
    let currentChart = chartRef.current;

    // Destroy any existing chart instance before creating a new one.
    if (currentChart) {
      currentChart.destroy();
      chartRef.current = null;
    }

    try {
      // Create a new Chart instance with the prepared data and options.
      currentChart = new Chart(canvasRef.current, {
        type: (chartType as any) || CHART_TYPES.LINE,
        data: chartData,
        options: chartOptions
      });
      chartRef.current = currentChart;
      setDataError(null);
    } catch (error) {
      setDataError(error as Error);
      if (onError) onError(error as Error);
    }

    // Cleanup the chart instance on unmount or re-render.
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartType, chartData, chartOptions, onError]);

  // Handle window resizing by calling handleResize on the chart instance.
  useEffect(() => {
    // If no manual width/height are provided, allow dynamic resizing via debounce.
    if (!width || !height) {
      const onWindowResize = () => {
        if (!canvasRef.current || !chartRef.current) return;
        const parentRect = canvasRef.current.parentElement?.getBoundingClientRect();
        if (parentRect) {
          handleResize(chartRef.current, parentRect.width, parentRect.height);
        }
      };
      window.addEventListener('resize', onWindowResize);
      return () => {
        window.removeEventListener('resize', onWindowResize);
      };
    }
  }, [width, height]);

  // Optionally handle real-time updates by subscribing to or retrieving new data.
  useEffect(() => {
    if (!enableRealTime) return;

    // Indicate that we might be loading updates
    setLoading(true);

    // Attempt to subscribe for updates from analyticsService if available.
    // This is a hypothetical method matching the JSON specification.
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = analyticsService.subscribeToUpdates((updatedMetrics: PerformanceMetric[]) => {
        setLocalMetrics(updatedMetrics);
      });
    } catch (subError) {
      if (onError) onError(subError as Error);
      setDataError(subError as Error);
    } finally {
      setLoading(false);
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [enableRealTime, onError]);

  // If updateInterval is provided (poll-based approach)
  useEffect(() => {
    if (!updateInterval || enableRealTime) return undefined;

    const intervalId = window.setInterval(async () => {
      try {
        setLoading(true);
        const updatedData = await analyticsService.getDashboardData({
          startDate: new Date(Date.now() - 3600 * 1000), // example 1 hour range
          endDate: new Date(),
          duration: 3600000
        });
        // Suppose updatedData.metrics is the relevant array
        setLocalMetrics(updatedData.metrics || []);
      } catch (fetchError) {
        setDataError(fetchError as Error);
        if (onError) onError(fetchError as Error);
      } finally {
        setLoading(false);
      }
    }, updateInterval);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [updateInterval, enableRealTime, onError]);

  // Determine the container width/height. If none provided, default to CHART_SIZES.MEDIUM.
  const computedWidth = width || CHART_SIZES.MEDIUM.width;
  const computedHeight = height || CHART_SIZES.MEDIUM.height;

  // Render loading or error states as needed, complemented by the ErrorBoundary fallback.
  if (dataError) {
    return (
      <Box
        className={className}
        width={computedWidth}
        height={computedHeight}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {/* Optionally render an error message or rely on ErrorBoundary */}
        <span style={{ color: 'red' }}>Chart Error: {dataError.message}</span>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        className={className}
        width={computedWidth}
        height={computedHeight}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Main chart container
  return (
    <ErrorBoundary fallback={<div style={{ color: 'red' }}>Chart failed to render.</div>}>
      <Box
        className={className}
        width={computedWidth}
        height={computedHeight}
        position="relative"
        overflow="hidden"
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </Box>
    </ErrorBoundary>
  );
};