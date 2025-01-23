"""
Enhanced core engine for performing various types of data aggregations and statistical
calculations with support for caching, parallel processing, and memory optimization.
"""

# -----------------------------------------------------------------------------------
# External Imports (with library versions as comments)
# -----------------------------------------------------------------------------------
from typing import Any, Dict, List, Optional  # version 3.11.0
import numpy as np  # version 1.24.0
import pandas as pd  # version 2.0.0
from sklearn.metrics import mean_absolute_error, mean_squared_error  # version 1.3.0
from joblib import Parallel, delayed  # version 1.3.0
from cachetools import LRUCache  # version 5.3.0

# -----------------------------------------------------------------------------------
# Internal Imports (with library versions as comments)
# -----------------------------------------------------------------------------------
from .metrics import MetricsEngine  # version internal
from ..models.performance import PerformanceMetrics  # version internal
from ..models.resource import ResourceMetrics  # version internal

# -----------------------------------------------------------------------------------
# Standard Library Imports
# -----------------------------------------------------------------------------------
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import partial

# -----------------------------------------------------------------------------------
# Global Constants from JSON Specification
# -----------------------------------------------------------------------------------
AGGREGATION_FUNCTIONS = {
    "sum": "np.sum",
    "mean": "np.mean",
    "median": "np.median",
    "min": "np.min",
    "max": "np.max",
    "std": "np.std",
    "var": "np.var",
    "count": "np.count_nonzero",
}

TIME_WINDOWS = {
    "hourly": "1H",
    "daily": "1D",
    "weekly": "1W",
    "monthly": "1M",
    "quarterly": "3M",
}

GROUPING_DIMENSIONS = ["team", "project", "resource", "task_type", "priority"]

CACHE_CONFIG = {
    "max_size": 1000,
    "ttl": 3600,
    "strategy": "LRU",
}

PARALLEL_PROCESSING_CONFIG = {
    "min_chunk_size": 10000,
    "max_workers": 4,
    "memory_limit": "2GB",
}

# -----------------------------------------------------------------------------------
# Logger Configuration
# -----------------------------------------------------------------------------------
LOGGER = logging.getLogger(__name__)
LOGGER.setLevel(logging.INFO)


class AggregationEngine:
    """
    Enhanced core engine for performing various types of data aggregations
    and statistical calculations with support for caching, parallel processing,
    and memory optimization.

    This engine handles:
      - Dimension-based aggregations (e.g., team, project).
      - Time-based windowing aggregations (e.g., daily, weekly).
      - Caching of results to improve performance of repeated queries.
      - Parallel or chunk-based execution for large datasets.
      - Optional synergy with MetricsEngine for advanced analytics.
    """

    _data: pd.DataFrame
    _config: Dict[str, Any]
    _metrics_engine: MetricsEngine
    _agg_functions: Dict[str, callable]
    _cache: LRUCache
    _executor: ThreadPoolExecutor

    def __init__(
        self,
        config: Dict[str, Any],
        cache_config: Optional[Dict[str, Any]] = None,
        parallel_config: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Initializes the aggregation engine with enhanced configuration.

        Steps:
          1. Initialize configuration settings.
          2. Set up aggregation functions dictionary from global constants.
          3. Create a MetricsEngine instance for optional advanced metric calculations.
          4. Initialize data structures for aggregations.
          5. Set up caching with provided or default configuration.
          6. Initialize parallel processing executor.
          7. Set up telemetry or monitoring placeholders for enterprise environments.

        :param config: Dictionary of engine configuration settings.
        :param cache_config: Optional dictionary for caching strategy; defaults to CACHE_CONFIG.
        :param parallel_config: Optional dictionary for parallel processing settings;
                               defaults to PARALLEL_PROCESSING_CONFIG.
        """
        # 1. Initialize configuration settings
        if not isinstance(config, dict):
            raise ValueError("config must be a dictionary containing configuration settings.")
        self._config = config

        LOGGER.info("Initializing AggregationEngine with provided configuration.")

        # 2. Set up aggregation functions dictionary from AGGREGATION_FUNCTIONS
        self._agg_functions = {}
        for agg_name, agg_ref in AGGREGATION_FUNCTIONS.items():
            # Convert string references like 'np.sum' to actual callable references
            if agg_ref.startswith("np."):
                func_part = agg_ref.split(".")[1]
                if hasattr(np, func_part):
                    self._agg_functions[agg_name] = getattr(np, func_part)
                else:
                    raise ValueError(f"Invalid numpy reference '{agg_ref}' for aggregation function.")
            else:
                raise ValueError(f"Unsupported aggregation function reference: {agg_ref}")

        # 3. Create a MetricsEngine instance (can leverage config if needed)
        self._metrics_engine = MetricsEngine(config={})
        LOGGER.debug("MetricsEngine instance created inside AggregationEngine.")

        # 4. Initialize data structures for aggregations (default empty DataFrame)
        self._data = pd.DataFrame()
        LOGGER.debug("Data structure for aggregations initialized as an empty DataFrame.")

        # 5. Set up caching
        if cache_config is None:
            cache_config = CACHE_CONFIG
        if cache_config.get("strategy", "").upper() == "LRU":
            self._cache = LRUCache(maxsize=cache_config.get("max_size", 1000))
        else:
            raise ValueError("Only 'LRU' cache strategy is currently supported.")
        LOGGER.debug("Caching strategy LRUCache initialized with max_size=%d", cache_config["max_size"])

        # 6. Initialize parallel processing executor
        if parallel_config is None:
            parallel_config = PARALLEL_PROCESSING_CONFIG
        max_workers = parallel_config.get("max_workers", 4)
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        LOGGER.debug("ThreadPoolExecutor initialized with max_workers=%d", max_workers)

        # 7. Set up telemetry or advanced monitoring placeholders (enterprise environment)
        LOGGER.debug("Telemetry/monitoring hooks for AggregationEngine can be initialized here.")

        LOGGER.info("AggregationEngine initialized successfully.")

    def aggregate_by_dimension(
        self,
        data: pd.DataFrame,
        dimension: str,
        agg_functions: List[str],
        use_cache: Optional[bool] = True,
        parallel_process: Optional[bool] = False
    ) -> pd.DataFrame:
        """
        Aggregates data by a specified dimension using chosen aggregation functions,
        with optional parallel processing for large datasets and caching.

        Steps:
          1. Validate input parameters and data types.
          2. Check cache for existing results if caching is enabled.
          3. Validate dimension against GROUPING_DIMENSIONS.
          4. Validate each aggregation function against available _agg_functions.
          5. If parallel_process is True and data is large, split data into chunks.
          6. Process chunks in parallel and combine partial results.
          7. Cache results if caching is enabled.
          8. Return the aggregated pd.DataFrame.

        :param data: The DataFrame containing raw data to be aggregated. Must have
                     at least one column to group by numeric columns for calculations.
        :param dimension: The dimension (column name) to use for grouping.
        :param agg_functions: A list of aggregator function names (e.g., ['sum', 'mean']).
        :param use_cache: Whether to attempt caching for the aggregated result.
        :param parallel_process: Whether to split data into chunks and process in parallel.
        :return: A pd.DataFrame of aggregated metrics, indexed by the chosen dimension.
        """
        # 1. Validate input parameters and data
        if not isinstance(data, pd.DataFrame) or data.empty:
            raise ValueError("The 'data' parameter must be a non-empty pandas DataFrame.")
        if not isinstance(dimension, str) or not dimension:
            raise ValueError("Dimension must be a non-empty string representing a column name.")
        if not isinstance(agg_functions, list) or not agg_functions:
            raise ValueError("agg_functions must be a non-empty list of aggregator function names.")

        # 2. Check cache if use_cache is True
        cache_key = None
        if use_cache:
            cache_key = f"aggregate_by_dim_{dimension}_{hash(data.to_csv())}_{'_'.join(agg_functions)}"
            if cache_key in self._cache:
                LOGGER.info("Returning cached result for dimension '%s' with agg_functions=%s", dimension, agg_functions)
                return self._cache[cache_key]

        # 3. Validate dimension
        if dimension not in GROUPING_DIMENSIONS and dimension not in data.columns:
            # We first check if it's in known global grouping dims or if it actually exists in the DataFrame
            raise ValueError(f"Dimension '{dimension}' is not recognized or not present in the data columns.")

        # 4. Validate aggregator function names
        invalid_funcs = [f for f in agg_functions if f not in self._agg_functions]
        if invalid_funcs:
            raise ValueError(f"Invalid aggregation functions: {invalid_funcs}")

        # 5 & 6. Parallel Processing (if requested and dataset is large)
        min_chunk_size = self._config.get("parallel_min_chunk_size", PARALLEL_PROCESSING_CONFIG["min_chunk_size"])
        num_rows = len(data)

        def _aggregate_chunk(df_chunk: pd.DataFrame) -> pd.DataFrame:
            """
            Internal helper function to group a data chunk and apply
            the requested aggregator functions.
            """
            if dimension not in df_chunk.columns:
                return pd.DataFrame()  # If chunk is missing dimension, return empty
            numeric_cols = df_chunk.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) == 0:
                return pd.DataFrame()

            # Construct an aggregation dictionary: {col: [agg_funcs]}
            agg_dict = {}
            for col in numeric_cols:
                agg_dict[col] = [self._agg_functions[func] for func in agg_functions]

            grouped = df_chunk.groupby(dimension).agg(agg_dict)
            # Flatten MultiIndex columns like (col, "sum") -> col_sum
            grouped.columns = [
                f"{col[0]}_{func.__name__}" for col in grouped.columns.to_flat_index()
            ]
            return grouped

        if parallel_process and num_rows >= min_chunk_size:
            # Split into chunks
            recommended_chunks = self._config.get("parallel_chunks", 4)
            chunk_size = max(num_rows // recommended_chunks, 1)
            futures = []
            partial_results = []

            start_idx = 0
            while start_idx < num_rows:
                end_idx = min(start_idx + chunk_size, num_rows)
                df_slice = data.iloc[start_idx:end_idx]
                future = self._executor.submit(_aggregate_chunk, df_slice)
                futures.append(future)
                start_idx = end_idx

            for fut in futures:
                partial_results.append(fut.result())

            # Combine partial results
            if partial_results:
                combined = pd.concat(partial_results)
                # Group again to merge partial results
                combined = combined.groupby(level=0).agg({col: "mean" if "_mean" in col else "sum"
                                                          for col in combined.columns})
            else:
                combined = pd.DataFrame()
        else:
            # Single-threaded or small data path
            combined = _aggregate_chunk(data)

        # 7. Cache results if requested
        if use_cache and cache_key:
            self._cache[cache_key] = combined
            LOGGER.info("Cached aggregated result for dimension '%s' with key='%s'", dimension, cache_key)

        # 8. Return aggregated DataFrame
        LOGGER.info("aggregate_by_dimension completed for dimension='%s' with functions=%s", dimension, agg_functions)
        return combined

    def time_window_aggregation(
        self,
        data: pd.DataFrame,
        window_size: str,
        metrics: List[str],
        use_cache: Optional[bool] = True,
        chunk_size: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Performs optimized time-based window aggregations on data with memory management
        and optional chunk processing.

        Steps:
          1. Validate window size and metrics.
          2. Check cache for existing results.
          3. Implement progressive loading if data size exceeds threshold (chunk-based).
          4. Process data slices to optimize memory usage.
          5. Apply window calculations with memory optimization.
          6. Cache results if enabled.
          7. Return the aggregated DataFrame.

        :param data: The DataFrame containing at least a 'timestamp' column for time-based aggregation.
        :param window_size: One of TIME_WINDOWS keys (e.g., 'daily', 'weekly') to resample data.
        :param metrics: List of metric names to calculate or columns used in time-based aggregation logic.
        :param use_cache: Whether to attempt caching the result of the windowed aggregation.
        :param chunk_size: The maximum number of rows per chunk for memory-optimized processing.
        :return: A DataFrame containing the time-windowed aggregation results.
        """
        # 1. Validate window size and metrics
        if window_size not in TIME_WINDOWS:
            raise ValueError(f"Invalid window_size '{window_size}'. Must be one of {list(TIME_WINDOWS.keys())}.")
        if not isinstance(metrics, list) or not metrics:
            raise ValueError("metrics must be a non-empty list of column names or metric indicators.")
        if "timestamp" not in data.columns:
            raise ValueError("DataFrame must include a 'timestamp' column for time-window aggregation.")

        # 2. Check cache
        cache_key = None
        if use_cache:
            unique_mets = "_".join(metrics)
            cache_key = f"time_window_{window_size}_{hash(data.to_csv())}_{unique_mets}"
            if cache_key in self._cache:
                LOGGER.info("Returning cached time-windowed result for window_size='%s', metrics=%s", window_size, metrics)
                return self._cache[cache_key]

        # Convert time index
        df_copy = data.copy(deep=True)
        df_copy["timestamp"] = pd.to_datetime(df_copy["timestamp"])
        df_copy.set_index("timestamp", inplace=True)
        freq_str = TIME_WINDOWS[window_size]

        # 3. Implement progressive loading if chunk_size provided
        num_rows = len(df_copy)
        if chunk_size is None or chunk_size <= 0:
            chunk_size = num_rows  # process in one shot if chunk_size not specified

        partial_results = []

        def _resample_chunk(sub_df: pd.DataFrame) -> pd.DataFrame:
            """
            Internal helper to resample a DataFrame chunk and calculate the requested metrics.
            For demonstration, we sum columns that match the 'metrics' list if they are numeric.
            """
            if sub_df.empty:
                return pd.DataFrame()
            numeric_cols = [col for col in sub_df.columns if col in metrics and pd.api.types.is_numeric_dtype(sub_df[col])]
            if not numeric_cols:
                return pd.DataFrame()

            # Resample and sum by freq_str
            grouped = sub_df[numeric_cols].resample(freq_str).sum()
            return grouped

        start_idx = 0
        # 4 & 5. Process data in slices (chunks) to optimize memory usage
        while start_idx < num_rows:
            end_idx = min(start_idx + chunk_size, num_rows)
            slice_df = df_copy.iloc[start_idx:end_idx].copy(deep=True)
            res_part = _resample_chunk(slice_df)
            partial_results.append(res_part)
            start_idx = end_idx

        if partial_results:
            combined = pd.concat(partial_results)
            # Aggregate again to merge intervals
            combined = combined.groupby(level=0).sum()
        else:
            combined = pd.DataFrame()

        # 6. Cache results if enabled
        if use_cache and cache_key:
            self._cache[cache_key] = combined
            LOGGER.info("time_window_aggregation: results cached with key='%s'", cache_key)

        # 7. Return result
        LOGGER.info("time_window_aggregation completed with window_size='%s' and metrics=%s", window_size, metrics)
        return combined