import asyncio  # version built-in (Asynchronous I/O for concurrent processing)
import logging  # version built-in (Production-grade logging)
import numpy as np  # version ^1.24.0 (Numerical operations for processing)
from prometheus_client import Counter, Histogram  # version ^0.17.0 (Performance and accuracy metrics collection)
from typing import Dict, Any, List, Optional

# Internal imports based on the JSON specification and content of imported files
from src.backend.nlp.core.text_processing import TextProcessor
from src.backend.nlp.core.entity_extraction import EntityExtractor
from src.backend.nlp.core.task_extraction import TaskExtractor


__all__ = ["CommunicationProcessor"]


class CommunicationProcessor:
    """
    Main service class for processing various types of team communications (email, chat, meeting transcripts)
    to extract structured task information with enhanced error handling, metrics collection, concurrency,
    and performance optimization.

    This class addresses:
        - Communication Processing (Processes email, chat, and meeting transcripts for task extraction).
        - Task Extraction Accuracy (Aims for 95% accuracy in task identification).
        - Administrative Overhead (Reduces overhead by 60% through automated extraction).

    Properties:
        text_processor (TextProcessor): Core text processing pipeline for NLP tasks.
        entity_extractor (EntityExtractor): Entity extraction pipeline for identifying task-related entities.
        task_extractor (TaskExtractor): Task extraction pipeline producing final structured tasks.
        logger (logging.Logger): Logger instance for debug and error messages.
        config (dict): Global configuration dictionary for the processor.
        processing_thresholds (dict): Threshold settings (e.g., confidence levels) for extracted data validation.
        retry_config (dict): Settings for retry logic (e.g., max attempts, backoff strategies).

    Prometheus Metrics:
        process_communication_counter (Counter): Counts the number of calls to process_communication.
        process_communication_histogram (Histogram): Records the execution time of process_communication.
        batch_process_counter (Counter): Counts the number of calls to batch_process.
        batch_process_histogram (Histogram): Records the execution time of batch_process.
    """

    # Prometheus counters and histograms for performance monitoring.
    process_communication_counter = Counter(
        "communication_processor_process_communication_total",
        "Total number of process_communication calls",
    )
    process_communication_histogram = Histogram(
        "communication_processor_process_communication_duration_seconds",
        "Histogram for process_communication execution times",
    )
    batch_process_counter = Counter(
        "communication_processor_batch_process_total",
        "Total number of batch_process calls",
    )
    batch_process_histogram = Histogram(
        "communication_processor_batch_process_duration_seconds",
        "Histogram for batch_process execution times",
    )

    def __init__(
        self,
        config: Dict[str, Any],
        processing_thresholds: Dict[str, float],
        retry_config: Dict[str, Any],
    ) -> None:
        """
        Initializes the communication processor with required processing pipelines, configurations,
        and enhanced monitoring capabilities.

        Steps:
            1. Initialize logging configuration with detailed formatting.
            2. Validate configuration parameters and thresholds.
            3. Set up text processor with validated config.
            4. Initialize entity extractor with models and confidence thresholds.
            5. Set up task extractor pipeline with accuracy settings.
            6. Initialize prometheus metrics for performance monitoring.
            7. Configure processing parameters and validation thresholds.
            8. Initialize health check mechanisms.
            9. Set up resource monitoring.

        :param config:              A dictionary with various processor settings and external references.
        :param processing_thresholds: A dictionary containing threshold settings (e.g., min confidence).
        :param retry_config:        A dictionary specifying retry logic (e.g., max_attempts, backoff strategies).
        """
        # (1) Initialize logging configuration with detailed formatting
        self.logger: logging.Logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        if not self.logger.handlers:
            self.logger.addHandler(console_handler)

        # (2) Validate configuration parameters and thresholds
        if not isinstance(config, dict):
            raise ValueError("Parameter 'config' must be a dictionary.")
        if not isinstance(processing_thresholds, dict):
            raise ValueError(
                "Parameter 'processing_thresholds' must be a dictionary."
            )
        if not isinstance(retry_config, dict):
            raise ValueError("Parameter 'retry_config' must be a dictionary.")
        self.logger.debug("Configuration, thresholds, and retry settings validated.")

        # (3) Set up text processor with validated config
        self.logger.debug("Initializing TextProcessor with provided config.")
        self.text_processor = TextProcessor(
            config=config.get("text_processor", {}),
            metrics_collector=None,  # placeholder for a real metrics collector if needed
            error_handler=None,       # placeholder for an error handler if needed
        )

        # (4) Initialize entity extractor with models and confidence thresholds
        entity_confidence = processing_thresholds.get("entity_confidence", 0.5)
        self.logger.debug(
            "Initializing EntityExtractor with confidence threshold: %.2f",
            entity_confidence,
        )
        self.entity_extractor = EntityExtractor(
            model_path=config.get("entity_model_path", "default-ner-model"),
            confidence_threshold=entity_confidence,
            device=config.get("entity_extractor_device", "cpu"),
            cache_ttl=config.get("entity_extractor_cache_ttl", 300),
            performance_config=config.get("entity_extractor_performance_config", {}),
        )

        # (5) Set up task extractor pipeline with accuracy settings
        self.logger.debug("Initializing TaskExtractor.")
        task_confidence = processing_thresholds.get("task_confidence", 0.6)
        self.task_extractor = TaskExtractor(
            model_path=config.get("task_model_path", "default-task-model"),
            config=config.get("task_extractor_config", {}),
            confidence_threshold=task_confidence,
            cache_size=config.get("task_extractor_cache_size", 100),
            batch_size=config.get("task_extractor_batch_size", 10),
        )

        # (6) Initialize prometheus metrics for performance monitoring
        # (Already declared at class level) - Here we could also do dynamic metric registration if needed.

        # (7) Configure processing parameters and validation thresholds
        self.config: Dict[str, Any] = config
        self.processing_thresholds: Dict[str, float] = processing_thresholds
        self.retry_config: Dict[str, Any] = retry_config

        # (8) Initialize health check mechanisms
        self.health_status: str = "OK"

        # (9) Set up resource monitoring (placeholder, could use psutil or similar in production)
        self.logger.debug("Resource monitoring is set as a placeholder.")

        self.logger.info(
            "CommunicationProcessor initialization complete.",
            extra={
                "entity_conf_threshold": entity_confidence,
                "task_conf_threshold": task_confidence,
                "retry_config": retry_config,
            },
        )

    @process_communication_histogram.time()
    def process_communication(
        self,
        text: str,
        channel_type: str,
        processing_options: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Processes a single communication input with enhanced validation, error handling,
        retry logic, and metrics collection.

        Steps:
            1. Validate input text and channel type with detailed error messages.
            2. Start performance monitoring.
            3. Preprocess text based on channel type with sanitization.
            4. Process text through NLP pipeline with error handling.
            5. Extract task-related entities with confidence scoring.
            6. Generate structured task information with metadata via TaskExtractor.
            7. Validate extracted task data against thresholds.
            8. Record processing metrics and accuracy.
            9. Handle any processing errors with retry mechanism.
            10. Return processed results with confidence scores.

        :param text: The raw communication text to be processed.
        :param channel_type: A string indicating the source channel (e.g., 'email', 'chat', 'transcript').
        :param processing_options: A dictionary of options controlling the text processing pipeline.
        :return: A dictionary containing extracted task information and associated metadata.
        """
        self.process_communication_counter.inc()

        # (1) Validate input text and channel type
        if not isinstance(text, str) or not text.strip():
            raise ValueError("process_communication requires a non-empty text string.")
        if not isinstance(channel_type, str) or not channel_type.strip():
            raise ValueError("process_communication requires a valid channel_type string.")
        if not isinstance(processing_options, dict):
            raise ValueError("processing_options must be a dictionary.")

        self.logger.debug(
            "Starting process_communication for channel_type=%s, text_length=%d",
            channel_type,
            len(text),
        )

        # (2) Start performance monitoring (Prometheus histogram decorator already applied)

        # (3) Preprocess text based on channel type
        # We rely on text_processor's internal cleaning logic, providing channel-specific options
        text_proc_options = processing_options.get("text_processor_options", {})
        if channel_type:
            text_proc_options["channel_type"] = channel_type

        # For optional retry logic
        max_attempts = self.retry_config.get("max_attempts", 1)
        backoff_factor = self.retry_config.get("backoff_factor", 0.0)

        attempt = 0
        last_error: Optional[Exception] = None

        while attempt < max_attempts:
            attempt += 1
            try:
                # (4) Process text through NLP pipeline
                processed_text_output = self.text_processor.process_text(
                    text,
                    text_proc_options,
                )

                # (5) Extract entities with confidence scoring
                entity_conf_threshold = self.processing_thresholds.get("entity_confidence", 0.5)
                extraction_config = {
                    "confidence_threshold": entity_conf_threshold,
                    "lowercase": False,
                }
                channel_type_for_entities = channel_type if channel_type else "default"
                entity_result = self.entity_extractor.extract_task_entities(
                    text,
                    channel_type_for_entities,
                    extraction_config,
                )

                # (6) Generate structured task information (TaskExtractor)
                task_conf_threshold = self.processing_thresholds.get("task_confidence", 0.6)
                extract_result = self.task_extractor.extract_task(
                    text,
                    format_type=channel_type_for_entities,
                    use_cache=processing_options.get("use_task_cache", True),
                )

                # (7) Validate extracted task data - this is handled internally in the TaskExtractor,
                # but we can do an additional check if needed.
                processed_conf = extract_result.get("final_confidence", 0.0)
                threshold = max(entity_conf_threshold, task_conf_threshold)
                if processed_conf < threshold:
                    self.logger.warning(
                        "Extracted task confidence (%.2f) fell below threshold (%.2f).",
                        processed_conf,
                        threshold,
                    )

                # (8) Record processing metrics - we can increment counters or record hist metrics here
                # For demonstration, we do a debug log.
                self.logger.debug(
                    "Processed communication with final confidence=%.2f, attempt=%d/%d",
                    processed_conf,
                    attempt,
                    max_attempts,
                )

                # (9) If we reach this point, we succeeded, so no more retries needed
                return {
                    "processed_text_output": processed_text_output,
                    "entity_result": entity_result,
                    "task_extraction": extract_result,
                }

            except Exception as e:
                last_error = e
                self.logger.error(
                    "Error in process_communication attempt %d/%d: %s",
                    attempt,
                    max_attempts,
                    str(e),
                )
                if attempt < max_attempts and backoff_factor > 0.0:
                    asyncio.run(asyncio.sleep(backoff_factor * attempt))

        # If we exhausted all attempts, raise the last seen error
        error_msg = "Failed to process communication after {} attempts: {}".format(
            max_attempts, str(last_error) if last_error else "Unknown error"
        )
        self.logger.error(error_msg)
        raise RuntimeError(error_msg)

    @batch_process_histogram.time()
    def batch_process(
        self,
        texts: List[str],
        channel_type: str,
        batch_size: int,
        processing_options: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Processes multiple communications in batch with optimized resource utilization,
        concurrency, and parallel extraction.

        Steps:
            1. Validate batch inputs and parameters.
            2. Calculate optimal batch size based on resource availability.
            3. Initialize batch processing metrics.
            4. Group texts into processing batches.
            5. Process batches concurrently with resource constraints.
            6. Monitor processing progress and resource usage.
            7. Extract entities and tasks in parallel.
            8. Implement error handling per batch.
            9. Aggregate results and validate batch output.
            10. Generate batch processing report.
            11. Return batch results with processing metadata.

        :param texts: A list of raw communication strings.
        :param channel_type: The channel type for all items in this batch (e.g., 'email', 'chat').
        :param batch_size: The desired batch size for parallel processing.
        :param processing_options: Additional pipeline configurations or overrides.
        :return: A list of dictionaries, each containing extracted task info.
        """
        self.batch_process_counter.inc()

        # (1) Validate batch inputs and parameters
        if not isinstance(texts, list) or any(not isinstance(t, str) for t in texts):
            raise ValueError("batch_process requires a list of non-empty strings.")
        if not isinstance(channel_type, str) or not channel_type.strip():
            raise ValueError("Invalid channel_type for batch processing.")
        if not isinstance(batch_size, int) or batch_size <= 0:
            raise ValueError("batch_size must be a positive integer.")
        if not isinstance(processing_options, dict):
            raise ValueError("processing_options must be a dictionary.")

        self.logger.debug(
            "Starting batch_process for channel_type=%s with %d texts, batch_size=%d",
            channel_type,
            len(texts),
            batch_size,
        )

        # (2) Calculate optimal batch size based on resource availability
        # For demonstration, we simply use the provided batch_size. We could refine with concurrency logic.
        effective_batch_size = min(batch_size, max(len(texts), 1))

        # (3) Initialize batch processing metrics
        total_texts = len(texts)
        results: List[Dict[str, Any]] = [None] * total_texts
        self.logger.debug("Batch processing initialized with effective batch_size=%d.", effective_batch_size)

        # (4) Group texts into processing batches
        def chunker(seq: List[str], size: int):
            for pos in range(0, len(seq), size):
                yield pos, seq[pos : pos + size]

        async def process_one_item(
            idx: int,
            text: str,
            channel: str,
            options: Dict[str, Any],
        ) -> Dict[str, Any]:
            """
            Asynchronously processes a single item to allow concurrency in the batch.
            """
            try:
                ret = self.process_communication(text, channel, options)
                return {"index": idx, "result": ret}
            except Exception as e:
                self.logger.error("Error in async process for text index %d: %s", idx, str(e))
                return {"index": idx, "result": {"error": str(e)}}

        # (5) Process batches concurrently with resource constraints
        async def process_chunk_maps(
            start_idx: int,
            chunk_texts: List[str],
            channel: str,
            options: Dict[str, Any]
        ) -> List[Dict[str, Any]]:
            """
            Manages concurrent processing of a chunk of texts.
            """
            tasks = []
            for i, txt in enumerate(chunk_texts):
                global_idx = start_idx + i
                tasks.append(process_one_item(global_idx, txt, channel, options))
            return await asyncio.gather(*tasks)

        # (6) Monitor progress & (7) Extract entities/tasks in parallel
        # We'll do it chunk by chunk
        for start_idx, chunk_texts in chunker(texts, effective_batch_size):
            # (8) Implement error handling per batch - done inside process_communication
            chunk_results = asyncio.run(
                process_chunk_maps(start_idx, chunk_texts, channel_type, processing_options)
            )
            for item in chunk_results:
                results[item["index"]] = item["result"]

        # (9) Aggregate results. (already in results array)

        # (10) Generate batch processing report - placeholder logging
        valid_count = sum(1 for r in results if r and "error" not in r)
        self.logger.debug(
            "Batch processing complete: %d valid results, %d total, channel_type=%s",
            valid_count,
            len(results),
            channel_type,
        )

        # (11) Return the list of processed data with optional metadata
        return results