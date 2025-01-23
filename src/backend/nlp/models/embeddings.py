import logging  # logging built-in (Production-grade logging for model operations, errors, and performance metrics)
from typing import Dict, List, Optional

import torch  # torch version ^2.0.0 (Deep learning framework for GPU acceleration)
import numpy as np  # numpy version ^1.24.0 (Efficient numerical operations for embeddings)
from transformers import (  # transformers version ^4.34.0 (State-of-the-art transformer models)
    AutoModel,
    AutoTokenizer,
    PreTrainedModel,
    PreTrainedTokenizer,
)

# Internal import: Text cleaning and normalization before embedding generation
from src.backend.nlp.utils.preprocessing import clean_text


class TextEmbedder:
    """
    Manages text embedding generation using transformer-based models, providing:
    - Batch processing with optional parallelism.
    - GPU acceleration with fallback device support.
    - Error recovery and production-level logging.
    - Caching for previously computed embeddings.
    - Monitoring hooks for performance metrics.

    This class directly addresses:
      - Task Extraction Accuracy (contributing to 95% accuracy through high-quality embeddings).
      - Communication Processing (handling text from emails, chats, etc., via robust preprocessing).
    """

    def __init__(
        self,
        model_name: str,
        device: str,
        config: Dict,
        enable_cache: bool,
        log_level: str
    ) -> None:
        """
        Initializes the TextEmbedder with specified model and configurations, including
        error recovery and monitoring setup.

        Steps:
        1. Configure logging with the specified level and format.
        2. Initialize embedding cache if enabled.
        3. Load transformer model and tokenizer with error handling.
        4. Validate and set device with fallback mechanism.
        5. Configure model parameters and batch settings (max_length, batch_size).
        6. Set up performance monitoring metrics (placeholders for production).
        7. Initialize memory management settings (placeholders for production).
        8. Log successful initialization with configuration details.

        :param model_name: Name/path of the transformer model to load.
        :param device: Primary device identifier (e.g., "cuda", "cpu").
        :param config: Dictionary containing model configs (batch_size, max_length, fallback_device, model_version, etc.).
        :param enable_cache: Boolean indicating whether to enable an in-memory cache of computed embeddings.
        :param log_level: String representation of the log level (e.g., "INFO", "DEBUG", "ERROR").
        """
        # 1. Configure logging
        self.logger: logging.Logger = logging.getLogger(self.__class__.__name__)
        level = getattr(logging, log_level.upper(), logging.INFO)
        self.logger.setLevel(level)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(level)
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        console_handler.setFormatter(formatter)
        if not self.logger.handlers:
            self.logger.addHandler(console_handler)

        # 2. Initialize embedding cache if enabled
        self.cache: Dict[str, np.ndarray] = {} if enable_cache else {}

        # 3. Load transformer model and tokenizer with error handling
        self.model: Optional[PreTrainedModel] = None
        self.tokenizer: Optional[PreTrainedTokenizer] = None
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModel.from_pretrained(model_name)
        except Exception as e:
            self.logger.error(
                "Failed to load model/tokenizer with name '%s': %s", model_name, str(e)
            )
            raise

        # 4. Validate and set device with fallback mechanism
        self.device: str = device
        self.fallback_device: str = config.get("fallback_device", "cpu")
        if self.device.lower() == "cuda" and not torch.cuda.is_available():
            self.logger.warning(
                "Requested CUDA device not available. Falling back to '%s'.",
                self.fallback_device,
            )
            self.device = self.fallback_device
        if self.device.lower() not in ["cpu", "cuda"]:
            self.logger.warning(
                "Unsupported device '%s'. Using fallback device '%s' instead.",
                self.device,
                self.fallback_device,
            )
            self.device = self.fallback_device

        self.model.to(self.device)

        # 5. Configure model parameters and batch settings
        self.max_length: int = config.get("max_length", 512)
        self.batch_size: int = config.get("batch_size", 8)
        self.model_version: str = config.get("model_version", "unknown")

        # 6. Set up performance monitoring metrics (placeholder for future integration)
        #    e.g., we could integrate with Prometheus or a custom metrics solution.
        self.logger.debug("Performance monitoring setup is a placeholder for now.")

        # 7. Initialize memory management settings (placeholder for production).
        #    e.g., control GPU memory growth, etc. Here we do minimal demonstration.
        torch.backends.cudnn.benchmark = True

        # 8. Log successful initialization
        self.logger.info(
            "Initialized TextEmbedder with model='%s', device='%s', max_length=%d, "
            "batch_size=%d, model_version='%s', enable_cache=%s",
            model_name,
            self.device,
            self.max_length,
            self.batch_size,
            self.model_version,
            enable_cache,
        )

    def encode_text(self, text: str, use_cache: bool = True) -> np.ndarray:
        """
        Generates embeddings for a single text input with error handling and optional caching.

        Steps:
        1. Check cache for existing embedding if caching is enabled.
        2. Clean and preprocess the input text via clean_text.
        3. Handle empty or invalid input gracefully.
        4. Tokenize text with padding and truncation.
        5. Generate embeddings using the transformer model.
        6. Implement numerical stability checks (e.g., replace NaN/inf with zero).
        7. Average token embeddings with attention weights.
        8. Update cache if enabled.
        9. Log performance metrics.
        10. Return the resulting numpy array of embeddings (shape: (embedding_dim,)).

        :param text: The raw text input to be embedded.
        :param use_cache: Whether to use the cache for existing embeddings.
        :return: A 1D numpy array representing the embedding vector of the input text.
        """
        # 1. Check cache
        if use_cache and text in self.cache:
            self.logger.debug("Found embedding in cache for text: %r", text)
            return self.cache[text]

        # 2. Clean and preprocess
        clean_options = {
            "lowercase": True,
            "unwanted_chars": [],
            "format_type": None,
        }
        processed_text = clean_text(text, clean_options)

        # 3. Handle empty or invalid input
        if not processed_text:
            self.logger.warning("Empty or invalid text after cleaning. Returning zeros.")
            if use_cache:
                zero_vector = np.zeros(self.model.config.hidden_size, dtype=np.float32)
                self.cache[text] = zero_vector
                return zero_vector
            return np.zeros(self.model.config.hidden_size, dtype=np.float32)

        # 4. Tokenize text
        inputs = self.tokenizer(
            processed_text,
            return_tensors="pt",
            truncation=True,
            padding="max_length",
            max_length=self.max_length
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # 5. Generate embeddings
        with torch.no_grad():
            outputs = self.model(**inputs)  # [batch_size=1, seq_len, hidden_dim]
        hidden_states = outputs.last_hidden_state  # shape: (1, seq_len, hidden_dim)
        attention_mask = inputs.get("attention_mask", None)  # shape: (1, seq_len)

        # 6. Numerical stability checks
        #    Replace any NaN or Inf with zero to avoid downstream errors.
        hidden_states = torch.where(
            torch.isfinite(hidden_states),
            hidden_states,
            torch.zeros_like(hidden_states)
        )

        # 7. Average token embeddings (weighted by attention_mask if available)
        #    shape: (1, hidden_dim)
        if attention_mask is not None:
            valid_tokens = attention_mask.sum(dim=1, keepdim=True)  # shape: (1, 1)
            # Avoid division by zero
            valid_tokens = torch.clamp(valid_tokens, min=1e-9)
            masked_hidden = hidden_states * attention_mask.unsqueeze(-1)
            embedding_vector = masked_hidden.sum(dim=1) / valid_tokens
        else:
            # Fallback to simple mean
            embedding_vector = hidden_states.mean(dim=1)

        # 8. Update cache if enabled
        embedding_np = embedding_vector.squeeze(0).cpu().numpy()
        if use_cache:
            self.cache[text] = embedding_np

        # 9. Log performance metrics (placeholder: we only log debug)
        self.logger.debug(
            "Generated embedding for text '%s' with shape %s.",
            processed_text[:50] + ("..." if len(processed_text) > 50 else ""),
            embedding_np.shape
        )

        # 10. Return the embedding
        return embedding_np

    def encode_batch(
        self,
        texts: List[str],
        use_cache: bool = True,
        chunk_size: int = 32
    ) -> np.ndarray:
        """
        Generates embeddings for a batch of texts with memory optimization and
        optional parallel processing.

        Steps:
        1. Validate input batch size and format.
        2. Split large batch into manageable chunks.
        3. Process chunks in sequence or parallel (placeholder) while handling memory constraints.
        4. Apply preprocessing to each text.
        5. Generate embeddings for each chunk.
        6. Monitor and log memory usage (placeholder).
        7. Concatenate results efficiently.
        8. Update cache for new embeddings if enabled.
        9. Return combined numpy array (shape: (batch_size, embedding_dim)).

        :param texts: A list of raw text strings to be embedded.
        :param use_cache: Whether to use cache for repeated inputs across the batch.
        :param chunk_size: The size of each sub-batch for sequential or parallel processing.
        :return: A 2D numpy array of shape (len(texts), embedding_dim).
        """
        # 1. Validate input
        if not isinstance(texts, list) or any(not isinstance(t, str) for t in texts):
            raise ValueError("All items in 'texts' must be strings.")
        if len(texts) == 0:
            self.logger.warning("Received an empty batch of texts. Returning empty array.")
            return np.zeros((0, self.model.config.hidden_size), dtype=np.float32)

        self.logger.debug("Starting batch encode for %d texts.", len(texts))
        embeddings_list = []

        # 2. Split into chunks
        total_texts = len(texts)
        start_idx = 0

        # We'll do simple sequential chunk processing to manage GPU memory
        while start_idx < total_texts:
            end_idx = min(start_idx + chunk_size, total_texts)
            sub_batch = texts[start_idx:end_idx]

            # 3. Process the chunk (no explicit parallel code here, but can be extended)
            chunk_embeddings = []
            for text in sub_batch:
                # 4. We'll rely on encode_text to do cleaning, tokenization, model inference
                text_embedding = self.encode_text(text, use_cache=use_cache)
                chunk_embeddings.append(text_embedding)

            # 5. chunk_embeddings contains a set of vectors from self.encode_text
            # 6. Memory usage logging is a placeholder.
            #    e.g., memory_allocated = torch.cuda.memory_allocated(self.device)
            #    self.logger.debug("Memory allocated: %d bytes", memory_allocated)

            # 7. storage as a single array
            chunk_np = np.stack(chunk_embeddings, axis=0)
            embeddings_list.append(chunk_np)

            start_idx = end_idx

        if len(embeddings_list) > 1:
            result = np.concatenate(embeddings_list, axis=0)
        else:
            result = embeddings_list[0]

        # 8. Cache updates for each text are already handled in encode_text if enabled
        # 9. Return combined 2D array
        self.logger.debug("Batch encode completed. Result shape: %s", result.shape)
        return result

    def compute_similarity(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray,
        normalize: bool = True
    ) -> float:
        """
        Computes the cosine similarity between two text embeddings with numerical stability checks.

        Steps:
        1. Validate input dimensions.
        2. Apply numerical stability checks (replace NaN/inf if found).
        3. Normalize vectors if required.
        4. Compute dot product efficiently.
        5. Handle edge cases with near-zero norms to avoid division by zero.
        6. Apply similarity bounds (ensure result is between 0 and 1).
        7. Log computation metrics.
        8. Return the bounded similarity score.

        :param embedding1: Numpy array representing the first embedding.
        :param embedding2: Numpy array representing the second embedding.
        :param normalize: Whether to L2-normalize the embedding vectors before scoring.
        :return: Cosine similarity score between 0 and 1.
        """
        # 1. Validate input
        if embedding1.shape != embedding2.shape:
            raise ValueError("Embedding dimension mismatch between embedding1 and embedding2.")

        # 2. Numerical stability checks
        embedding1 = np.where(np.isfinite(embedding1), embedding1, 0.0)
        embedding2 = np.where(np.isfinite(embedding2), embedding2, 0.0)

        # 3. Normalize if requested
        if normalize:
            norm1 = np.linalg.norm(embedding1)
            norm2 = np.linalg.norm(embedding2)
            if norm1 > 1e-9:
                embedding1 = embedding1 / norm1
            if norm2 > 1e-9:
                embedding2 = embedding2 / norm2

        # 4. Dot product
        score = float(np.dot(embedding1, embedding2))

        # 5. If the norms are extremely small, the score may be inaccurate, but we've partially handled this above.
        # 6. Apply a final bounding step from 0 to 1 for interpretability
        #    If negative, we clamp to 0. For many use cases, negative similarities may be meaningful,
        #    but here we assume a 0-1 range for "cosine similarity" usage in a typical semantic context.
        if score < 0.0:
            score = 0.0
        if score > 1.0:
            score = 1.0

        # 7. Log the similarity
        self.logger.debug("Computed cosine similarity: %.4f", score)

        # 8. Return the final score
        return score


__all__ = ["TextEmbedder"]